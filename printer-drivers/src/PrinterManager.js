/**
 * @fileoverview Printer Manager — orchestrates multiple printers.
 *
 * Responsibilities:
 * - Load printer configuration
 * - Instantiate ThermalPrinter / ImpactPrinter drivers
 * - Route print jobs to the correct printer by role (receipt, kitchen, report)
 * - Handle failover (retry → fallback printer → console/file)
 * - Provide a unified API surface for the rest of the POS system
 *
 * @module PrinterManager
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ThermalPrinter  = require('./ThermalPrinter');
const ImpactPrinter   = require('./ImpactPrinter');
const PrinterDetector = require('./PrinterDetector');
const ReceiptFormatter = require('./ReceiptFormatter');

const DEFAULT_CONFIG = path.resolve(__dirname, '..', 'config', 'printer.config.json');

/**
 * Manages multiple printers and routes print jobs.
 */
class PrinterManager {
  /**
   * @param {Object}  [options]
   * @param {string}  [options.configPath] - Path to printer.config.json
   * @param {boolean} [options.autoConnect=false] - Connect to all enabled printers on init
   */
  constructor(options = {}) {
    /** @private */
    this._configPath = options.configPath || DEFAULT_CONFIG;

    /** @private @type {Object} */
    this._config = this._loadConfig();

    /** @private @type {Map<string, import('./PrinterInterface')>} */
    this._printers = new Map();

    /** @private */
    this._detector = new PrinterDetector();

    /** @private */
    this._failover = this._config.failover || {
      enabled: true,
      maxRetries: 3,
      retryDelayMs: 1000,
      fallbackToConsole: true,
      fallbackToFile: true,
      fallbackDirectory: './print-fallback',
    };

    // Instantiate printers from config
    this._initPrinters();

    // Auto-connect if requested
    if (options.autoConnect) {
      this.connectAll().catch(err => {
        console.warn(`[PrinterManager] Auto-connect failed: ${err.message}`);
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Print a sales receipt on the receipt-role printer.
   * @param {import('./PrinterInterface').ReceiptData} data
   * @returns {Promise<boolean>}
   */
  async printReceipt(data) {
    return this._executeWithFailover('receipt', 'printReceipt', data);
  }

  /**
   * Print a kitchen order on the kitchen-role printer.
   * @param {import('./PrinterInterface').KitchenOrderData} data
   * @returns {Promise<boolean>}
   */
  async printKitchenOrder(data) {
    return this._executeWithFailover('kitchen', 'printKitchenOrder', data);
  }

  /**
   * Open the cash drawer via the receipt printer.
   * @returns {Promise<boolean>}
   */
  async openCashDrawer() {
    return this._executeWithFailover('receipt', 'openCashDrawer');
  }

  /**
   * Get the status of a specific printer or all printers.
   * @param {string} [printerId] - If omitted, returns status for all printers
   * @returns {Promise<Object>}
   */
  async getPrinterStatus(printerId) {
    if (printerId) {
      const printer = this._printers.get(printerId);
      if (!printer) return { error: `Printer '${printerId}' not found.` };
      const status = await printer.getPrinterStatus();
      return { id: printerId, ...status };
    }

    // All printers
    const statuses = {};
    for (const [id, printer] of this._printers) {
      try {
        statuses[id] = await printer.getPrinterStatus();
      } catch (err) {
        statuses[id] = { online: false, error: err.message };
      }
    }
    return statuses;
  }

  /**
   * Cut paper on a specific printer (defaults to receipt printer).
   * @param {boolean} [partial=true]
   * @param {string}  [printerId]
   * @returns {Promise<boolean>}
   */
  async cutPaper(partial = true, printerId) {
    const printer = printerId
      ? this._printers.get(printerId)
      : this._getPrinterByRole('receipt');
    if (!printer) return false;
    return printer.cutPaper(partial);
  }

  /**
   * Print a barcode on a specific printer (defaults to receipt printer).
   * @param {string} barcodeData
   * @param {import('./PrinterInterface').BarcodeOptions} [options]
   * @param {string} [printerId]
   * @returns {Promise<boolean>}
   */
  async printBarcode(barcodeData, options, printerId) {
    const printer = printerId
      ? this._printers.get(printerId)
      : this._getPrinterByRole('receipt');
    if (!printer) {
      console.log(`[PrinterManager] Barcode: ${barcodeData} — no printer available.`);
      return false;
    }
    return printer.printBarcode(barcodeData, options);
  }

  /**
   * Detect printers on all transports.
   * @returns {Promise<import('./PrinterDetector').DetectedPrinter[]>}
   */
  async detectPrinters() {
    return this._detector.detectPrinters();
  }

  /**
   * Connect all enabled printers.
   * @returns {Promise<void>}
   */
  async connectAll() {
    const promises = [];
    for (const [id, printer] of this._printers) {
      if (printer.config.enabled) {
        promises.push(
          printer.connect().catch(err => {
            console.warn(`[PrinterManager] Could not connect '${id}': ${err.message}`);
          })
        );
      }
    }
    await Promise.allSettled(promises);
  }

  /**
   * Disconnect all printers.
   * @returns {Promise<void>}
   */
  async disconnectAll() {
    for (const [, printer] of this._printers) {
      try { await printer.disconnect(); } catch { /* best-effort */ }
    }
  }

  /**
   * Add a printer dynamically (e.g. from detection results).
   * @param {Object} config
   * @returns {import('./PrinterInterface')}
   */
  addPrinter(config) {
    const driver = this._createDriver(config);
    this._printers.set(config.id, driver);
    return driver;
  }

  /**
   * Remove a printer by ID.
   * @param {string} printerId
   * @returns {boolean}
   */
  removePrinter(printerId) {
    const printer = this._printers.get(printerId);
    if (!printer) return false;
    printer.disconnect().catch(() => {});
    this._printers.delete(printerId);
    return true;
  }

  /**
   * Get a printer driver by ID.
   * @param {string} printerId
   * @returns {import('./PrinterInterface')|undefined}
   */
  getPrinter(printerId) {
    return this._printers.get(printerId);
  }

  /**
   * List all registered printers with their connection state.
   * @returns {{ id: string, name: string, type: string, connected: boolean, role: string }[]}
   */
  listPrinters() {
    const list = [];
    for (const [id, printer] of this._printers) {
      list.push({
        id,
        name: printer.config.name,
        type: printer.config.type || (printer instanceof ThermalPrinter ? 'thermal' : 'impact'),
        connected: printer.isConnected(),
        role: printer.config.role,
      });
    }
    return list;
  }

  /**
   * Reload configuration from disk and re-initialise printers.
   */
  async reload() {
    await this.disconnectAll();
    this._config = this._loadConfig();
    this._printers.clear();
    this._initPrinters();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PRIVATE
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Load config from JSON.
   * @private
   * @returns {Object}
   */
  _loadConfig() {
    try {
      const raw = fs.readFileSync(this._configPath, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`[PrinterManager] Could not load config (${this._configPath}): ${err.message}. Using defaults.`);
      return { printers: [], business: {}, receipt: {}, failover: {} };
    }
  }

  /**
   * Instantiate printer drivers from configuration.
   * @private
   */
  _initPrinters() {
    const printerConfigs = this._config.printers || [];
    for (const cfg of printerConfigs) {
      try {
        const driver = this._createDriver({
          ...cfg,
          business: this._config.business,
          receiptSettings: this._config.receipt,
          configPath: this._configPath,
        });
        this._printers.set(cfg.id, driver);
      } catch (err) {
        console.warn(`[PrinterManager] Skipping printer '${cfg.id}': ${err.message}`);
      }
    }
  }

  /**
   * Create the correct driver class based on printer type.
   * @private
   * @param {Object} config
   * @returns {import('./PrinterInterface')}
   */
  _createDriver(config) {
    const type = (config.type || 'thermal').toLowerCase();
    switch (type) {
      case 'thermal':
        return new ThermalPrinter(config);
      case 'impact':
      case 'dot-matrix':
      case 'dotmatrix':
        return new ImpactPrinter(config);
      default:
        // Default to thermal
        return new ThermalPrinter(config);
    }
  }

  /**
   * Get a printer by its assigned role.
   * @private
   * @param {string} role
   * @returns {import('./PrinterInterface')|null}
   */
  _getPrinterByRole(role) {
    for (const [, printer] of this._printers) {
      if (printer.config.role === role && printer.config.enabled) {
        return printer;
      }
    }
    // Fallback: return any enabled printer
    for (const [, printer] of this._printers) {
      if (printer.config.enabled) return printer;
    }
    return null;
  }

  /**
   * Execute a print method with retry and failover logic.
   * @private
   * @param {string} role    - Printer role (receipt, kitchen, report)
   * @param {string} method  - Method name (printReceipt, printKitchenOrder, etc.)
   * @param {*}      [data]  - Data argument to pass
   * @returns {Promise<boolean>}
   */
  async _executeWithFailover(role, method, data) {
    const primary = this._getPrinterByRole(role);

    if (primary) {
      // Retry loop on primary printer
      for (let attempt = 1; attempt <= (this._failover.maxRetries || 1); attempt++) {
        try {
          const result = data !== undefined
            ? await primary[method](data)
            : await primary[method]();
          if (result) return true;
        } catch (err) {
          console.warn(`[PrinterManager] ${method} attempt ${attempt} failed on '${primary.config.id}': ${err.message}`);
          if (attempt < (this._failover.maxRetries || 1)) {
            await this._delay(this._failover.retryDelayMs || 1000);
          }
        }
      }

      // Try other printers as fallback
      for (const [id, printer] of this._printers) {
        if (printer === primary || !printer.config.enabled) continue;
        try {
          console.log(`[PrinterManager] Failing over ${method} to '${id}'.`);
          const result = data !== undefined
            ? await printer[method](data)
            : await printer[method]();
          if (result) return true;
        } catch {
          continue;
        }
      }
    }

    // All printers failed — fall back to console/file
    if (this._failover.fallbackToFile && data) {
      this._saveToFile(method, data);
    }

    if (this._failover.fallbackToConsole && data) {
      console.log(`[PrinterManager] All printers failed. Console fallback for ${method}:`);
      // Create a temporary printer for console output
      const temp = new ThermalPrinter({ paperWidth: 80, business: this._config.business, receiptSettings: this._config.receipt });
      try {
        data !== undefined ? await temp[method](data) : await temp[method]();
      } catch { /* already logged */ }
      return true;
    }

    return false;
  }

  /**
   * Save print data to a file for later reprinting.
   * @private
   * @param {string} method
   * @param {*} data
   */
  _saveToFile(method, data) {
    try {
      const dir = path.resolve(this._failover.fallbackDirectory || './print-fallback');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename  = `${method}_${timestamp}.json`;
      const filePath  = path.join(dir, filename);

      fs.writeFileSync(filePath, JSON.stringify({
        method,
        timestamp: new Date().toISOString(),
        data,
      }, null, 2), 'utf8');

      console.log(`[PrinterManager] Print job saved to ${filePath}`);
    } catch (err) {
      console.error(`[PrinterManager] Could not save fallback file: ${err.message}`);
    }
  }

  /**
   * Delay helper.
   * @private
   * @param {number} ms
   * @returns {Promise<void>}
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = PrinterManager;
