/**
 * @fileoverview ESC/POS Thermal Printer Driver.
 *
 * Full-featured driver for ESC/POS compatible thermal receipt printers.
 * Supports USB, Network (TCP/IP), and Serial (COM port) connections via the
 * `escpos` family of packages.
 *
 * Features:
 * - Sales receipt printing with BIR-required fields
 * - Kitchen / service order tickets
 * - Cash drawer kick-out
 * - Barcode printing (Code128, EAN13, etc.)
 * - Paper cutting (full / partial)
 * - Printer status polling
 * - QR code for digital receipt verification (optional)
 *
 * @module ThermalPrinter
 */

'use strict';

const PrinterInterface = require('./PrinterInterface');
const ReceiptFormatter = require('./ReceiptFormatter');

// ── Optional dependency loading ─────────────────────────────────────
// These packages may not be installed; we load them lazily and fall back
// to console output when they are not available.

let escpos, USB, Network, Serial;

/**
 * Attempt to require a module, returning null on failure.
 * @param {string} mod
 * @returns {*|null}
 */
function tryRequire(mod) {
  try { return require(mod); } catch { return null; }
}

/**
 * ESC/POS thermal printer driver.
 * @extends PrinterInterface
 */
class ThermalPrinter extends PrinterInterface {
  /**
   * @param {Object} config - Printer configuration (see PrinterInterface)
   */
  constructor(config = {}) {
    super({ ...config, type: 'thermal' });

    /** @private */ this._device  = null;
    /** @private */ this._printer = null;

    this._formatter = new ReceiptFormatter({
      paperWidth: this.config.paperWidth,
      business: config.business,
      receipt: config.receiptSettings,
      configPath: config.configPath,
    });

    // Lazy-load escpos modules
    if (!escpos) {
      escpos  = tryRequire('escpos');
      USB     = tryRequire('escpos-usb');
      Network = tryRequire('escpos-network');
      Serial  = tryRequire('escpos-serialport');
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CONNECTION
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Open a connection to the thermal printer.
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.connected) return;

    if (!escpos) {
      console.warn('[ThermalPrinter] escpos library not installed — running in console-only mode.');
      return;
    }

    try {
      this._device = this._createDevice();
      await new Promise((resolve, reject) => {
        this._device.open((err) => {
          if (err) return reject(err);
          this._printer = new escpos.Printer(this._device, {
            encoding: this.config.encoding,
            width: this.getColumnCount(),
          });
          this.connected = true;
          resolve();
        });
      });
    } catch (err) {
      this.connected = false;
      throw new Error(`[ThermalPrinter] Failed to connect: ${err.message}`);
    }
  }

  /**
   * Close the connection.
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (!this.connected || !this._device) return;
    try {
      await new Promise((resolve, reject) => {
        this._device.close((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    } catch { /* best-effort close */ }
    this._printer  = null;
    this._device   = null;
    this.connected = false;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PRINTING
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Print a full sales receipt.
   * @param {import('./PrinterInterface').ReceiptData} data
   * @returns {Promise<boolean>}
   */
  async printReceipt(data) {
    const lines = this._formatter.formatReceipt(data);

    if (!this.connected || !this._printer) {
      this._consoleFallback('RECEIPT', lines);
      return true;
    }

    try {
      await this._printFormatted(data, lines);
      return true;
    } catch (err) {
      console.error(`[ThermalPrinter] printReceipt error: ${err.message}`);
      this._consoleFallback('RECEIPT', lines);
      return false;
    }
  }

  /**
   * Print a kitchen / service order ticket.
   * @param {import('./PrinterInterface').KitchenOrderData} data
   * @returns {Promise<boolean>}
   */
  async printKitchenOrder(data) {
    const lines = this._formatter.formatKitchenOrder(data);

    if (!this.connected || !this._printer) {
      this._consoleFallback('KITCHEN ORDER', lines);
      return true;
    }

    try {
      const p = this._printer;
      p.font('a').align('lt').style('normal');

      for (const line of lines) {
        p.text(line);
      }

      // partial cut after kitchen order
      p.cut(true);
      await this._flush();
      return true;
    } catch (err) {
      console.error(`[ThermalPrinter] printKitchenOrder error: ${err.message}`);
      this._consoleFallback('KITCHEN ORDER', lines);
      return false;
    }
  }

  /**
   * Trigger cash drawer kick-out.
   * @returns {Promise<boolean>}
   */
  async openCashDrawer() {
    if (!this.connected || !this._printer) {
      console.log('[ThermalPrinter] Cash drawer pulse sent (simulated — no printer connected).');
      return true;
    }

    try {
      const p = this._printer;
      // ESC p m t1 t2  — standard drawer kick command
      p.cashdraw(2);
      await this._flush();
      return true;
    } catch (err) {
      console.error(`[ThermalPrinter] openCashDrawer error: ${err.message}`);
      return false;
    }
  }

  /**
   * Get printer status.
   * @returns {Promise<import('./PrinterInterface').PrinterStatus>}
   */
  async getPrinterStatus() {
    if (!this.connected) {
      return {
        online: false,
        paperPresent: false,
        coverClosed: false,
        drawerOpen: false,
        error: 'Not connected',
      };
    }

    // Most consumer ESC/POS printers do not support real-time status queries
    // over all transports.  We return a basic status based on connection state.
    return {
      online: this.connected,
      paperPresent: true,   // assume OK — real implementation would send DLE EOT
      coverClosed: true,
      drawerOpen: false,
      error: null,
    };
  }

  /**
   * Cut paper.
   * @param {boolean} [partial=true]
   * @returns {Promise<boolean>}
   */
  async cutPaper(partial = true) {
    if (!this.connected || !this._printer) {
      console.log(`[ThermalPrinter] Paper cut (${partial ? 'partial' : 'full'}) — simulated.`);
      return true;
    }

    try {
      this._printer.cut(partial);
      await this._flush();
      return true;
    } catch (err) {
      console.error(`[ThermalPrinter] cutPaper error: ${err.message}`);
      return false;
    }
  }

  /**
   * Print a barcode.
   * @param {string} barcodeData
   * @param {import('./PrinterInterface').BarcodeOptions} [options]
   * @returns {Promise<boolean>}
   */
  async printBarcode(barcodeData, options = {}) {
    const type     = options.type || 'CODE128';
    const width    = options.width || 2;
    const height   = options.height || 80;
    const position = options.position || 'below';

    if (!this.connected || !this._printer) {
      console.log(`[ThermalPrinter] Barcode (${type}): ${barcodeData} — simulated.`);
      return true;
    }

    try {
      const p = this._printer;
      // Map our type names to escpos barcode type constants
      const typeMap = {
        CODE128: 'CODE128',
        EAN13:   'EAN13',
        EAN8:    'EAN8',
        UPC_A:   'UPC_A',
        CODE39:  'CODE39',
      };

      p.align('ct');
      p.barcode(barcodeData, typeMap[type] || 'CODE128', {
        width,
        height,
        position: position.toUpperCase(),
      });
      p.align('lt');
      await this._flush();
      return true;
    } catch (err) {
      console.error(`[ThermalPrinter] printBarcode error: ${err.message}`);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Create the appropriate escpos device based on connection type.
   * @private
   * @returns {Object} escpos device
   */
  _createDevice() {
    switch (this.config.connection) {
      case 'usb':
        if (!USB) throw new Error('escpos-usb package is not installed.');
        if (this.config.vendorId && this.config.productId) {
          return new USB(this.config.vendorId, this.config.productId);
        }
        return new USB();

      case 'network':
        if (!Network) throw new Error('escpos-network package is not installed.');
        return new Network(this.config.address, this.config.port || 9100);

      case 'serial':
        if (!Serial) throw new Error('escpos-serialport package is not installed.');
        return new Serial(this.config.address, {
          baudRate: this.config.baudRate || 9600,
          autoOpen: false,
        });

      default:
        throw new Error(`Unsupported connection type: ${this.config.connection}`);
    }
  }

  /**
   * Print a receipt with ESC/POS formatting.
   * Uses styled commands for headers, totals, etc.
   * @private
   * @param {import('./PrinterInterface').ReceiptData} data
   * @param {string[]} lines - Pre-formatted text lines
   * @returns {Promise<void>}
   */
  async _printFormatted(data, lines) {
    const p = this._printer;
    const biz = { ...this._formatter.business, ...(data.business || {}) };
    const dt = data.date ? new Date(data.date) : new Date();

    // ── Styled header ───────────────────────────────────────────────
    p.font('a').align('ct').style('b');
    if (biz.name) p.size(1, 1).text(biz.name.toUpperCase()).size(0, 0);
    p.style('normal');

    if (biz.address) {
      const addr = [biz.address, biz.city, biz.province, biz.zip].filter(Boolean).join(', ');
      p.text(addr);
    }
    if (biz.phone) p.text(biz.phone);
    if (biz.tin) p.text(`TIN: ${biz.tin}`);
    if (biz.vatRegistered !== undefined) {
      p.text(biz.vatRegistered ? 'VAT Registered' : 'Non-VAT');
    }

    p.drawLine();

    // ── Transaction info ────────────────────────────────────────────
    p.align('lt').style('normal');
    // We print the rest as pre-formatted text lines (from _formatter) for
    // consistent column alignment across both thermal & console output.
    // Skip the header lines (already printed above with styles).
    let inBody = false;
    for (const line of lines) {
      // Skip until the first separator
      if (!inBody) {
        if (line.startsWith('=') || line.startsWith('-')) {
          inBody = true;
        }
        continue;
      }
      p.text(line);
    }

    // ── QR code (optional) ──────────────────────────────────────────
    if (this._formatter.receipt.showQRCode && data.transactionId) {
      const qrUrl = (this._formatter.receipt.qrCodeBaseUrl || '') + data.transactionId;
      p.align('ct');
      try {
        p.qrimage(qrUrl, { type: 'png', mode: 'dhdw', size: 4 });
      } catch { /* QR printing not supported on all models */ }
      p.align('lt');
    }

    // ── Cut ─────────────────────────────────────────────────────────
    p.cut(true);
    await this._flush();
  }

  /**
   * Flush the printer buffer (close the print job).
   * @private
   * @returns {Promise<void>}
   */
  _flush() {
    return new Promise((resolve, reject) => {
      if (!this._printer) return resolve();
      try {
        this._printer.close(() => resolve());
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Print to console when no physical printer is connected.
   * @private
   * @param {string} title
   * @param {string[]} lines
   */
  _consoleFallback(title, lines) {
    console.log(`\n╔${'═'.repeat(this.getColumnCount() + 2)}╗`);
    console.log(`║ ${title.padEnd(this.getColumnCount())} ║`);
    console.log(`╠${'═'.repeat(this.getColumnCount() + 2)}╣`);
    for (const line of lines) {
      const padded = (line || '').padEnd(this.getColumnCount());
      console.log(`║ ${padded} ║`);
    }
    console.log(`╚${'═'.repeat(this.getColumnCount() + 2)}╝\n`);
  }
}

module.exports = ThermalPrinter;
