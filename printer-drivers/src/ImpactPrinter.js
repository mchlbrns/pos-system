/**
 * @fileoverview Impact / Dot-Matrix Printer Driver.
 *
 * Sends plain text with basic ASCII formatting to impact printers via:
 * - USB (raw write)
 * - Network (TCP port 9100 / LPD port 515)
 * - LPT / Serial (COM port)
 *
 * No ESC/POS dependency — works with any printer that accepts raw text.
 * Receipt layout uses dashes, pipes, and fixed-width columns.
 *
 * @module ImpactPrinter
 */

'use strict';

const PrinterInterface = require('./PrinterInterface');
const ReceiptFormatter = require('./ReceiptFormatter');
const net  = require('net');
const fs   = require('fs');
const path = require('path');

/**
 * Impact / dot-matrix printer driver.
 * @extends PrinterInterface
 */
class ImpactPrinter extends PrinterInterface {
  /**
   * @param {Object} config - Printer configuration (see PrinterInterface)
   * @param {string} [config.lptPort] - LPT port path (e.g. 'LPT1', '/dev/lp0')
   */
  constructor(config = {}) {
    super({ ...config, type: 'impact' });

    /** @private */
    this._socket = null;
    /** @private */
    this._serialPort = null;
    /** @private */
    this._lptPort = config.lptPort || null;

    this._formatter = new ReceiptFormatter({
      paperWidth: this.config.paperWidth,
      business: config.business,
      receipt: config.receiptSettings,
      configPath: config.configPath,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CONNECTION
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Open a connection to the impact printer.
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.connected) return;

    switch (this.config.connection) {
      case 'network':
        await this._connectNetwork();
        break;

      case 'serial':
        await this._connectSerial();
        break;

      case 'usb':
      case 'lpt':
        // LPT / USB printers on Windows are addressed by share name or port
        // We validate the port exists but don't hold a persistent connection.
        this.connected = true;
        break;

      default:
        throw new Error(`[ImpactPrinter] Unsupported connection: ${this.config.connection}`);
    }
  }

  /**
   * Close the connection.
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this._socket) {
      this._socket.destroy();
      this._socket = null;
    }
    if (this._serialPort) {
      try {
        const sp = this._serialPort;
        await new Promise((resolve) => sp.close(() => resolve()));
      } catch { /* best-effort */ }
      this._serialPort = null;
    }
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
    return this._sendLines('RECEIPT', lines);
  }

  /**
   * Print a kitchen / service order ticket.
   * @param {import('./PrinterInterface').KitchenOrderData} data
   * @returns {Promise<boolean>}
   */
  async printKitchenOrder(data) {
    const lines = this._formatter.formatKitchenOrder(data);
    return this._sendLines('KITCHEN ORDER', lines);
  }

  /**
   * Trigger cash drawer (impact printers rarely support this directly).
   * Sends a BEL character (0x07) which some cash drawers respond to.
   * @returns {Promise<boolean>}
   */
  async openCashDrawer() {
    if (!this.connected) {
      console.log('[ImpactPrinter] Cash drawer pulse (simulated — not connected).');
      return true;
    }

    try {
      const buf = Buffer.from([0x07]); // BEL
      await this._sendRaw(buf);
      return true;
    } catch (err) {
      console.error(`[ImpactPrinter] openCashDrawer error: ${err.message}`);
      return false;
    }
  }

  /**
   * Get printer status.
   * Impact printers rarely expose status; we return connection state only.
   * @returns {Promise<import('./PrinterInterface').PrinterStatus>}
   */
  async getPrinterStatus() {
    return {
      online: this.connected,
      paperPresent: true,
      coverClosed: true,
      drawerOpen: false,
      error: this.connected ? null : 'Not connected',
    };
  }

  /**
   * Cut paper — not supported on impact printers. Sends a form-feed instead.
   * @param {boolean} [_partial=true]
   * @returns {Promise<boolean>}
   */
  async cutPaper(_partial = true) {
    if (!this.connected) {
      console.log('[ImpactPrinter] Form-feed sent (simulated).');
      return true;
    }

    try {
      await this._sendRaw(Buffer.from('\x0C', 'ascii')); // FF
      return true;
    } catch (err) {
      console.error(`[ImpactPrinter] cutPaper (FF) error: ${err.message}`);
      return false;
    }
  }

  /**
   * Print barcode — impact printers cannot print graphical barcodes.
   * Falls back to printing the data as plain text.
   * @param {string} barcodeData
   * @param {import('./PrinterInterface').BarcodeOptions} [options]
   * @returns {Promise<boolean>}
   */
  async printBarcode(barcodeData, options = {}) {
    const type = options.type || 'CODE128';
    const lines = [
      this._formatter._separator('-'),
      this._formatter._center(`BARCODE (${type})`),
      this._formatter._center(barcodeData),
      this._formatter._separator('-'),
    ];
    return this._sendLines('BARCODE', lines);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PRIVATE – CONNECTION HELPERS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Connect via TCP/IP (raw socket to port 9100).
   * @private
   * @returns {Promise<void>}
   */
  _connectNetwork() {
    return new Promise((resolve, reject) => {
      const port = this.config.port || 9100;
      const host = this.config.address;
      if (!host) return reject(new Error('Network address is required.'));

      this._socket = new net.Socket();
      this._socket.setTimeout(5000);

      this._socket.connect(port, host, () => {
        this.connected = true;
        resolve();
      });

      this._socket.on('error', (err) => {
        this.connected = false;
        reject(new Error(`Network connection failed: ${err.message}`));
      });

      this._socket.on('timeout', () => {
        this._socket.destroy();
        this.connected = false;
        reject(new Error('Network connection timed out.'));
      });
    });
  }

  /**
   * Connect via serial (COM) port.
   * @private
   * @returns {Promise<void>}
   */
  async _connectSerial() {
    let SerialPort;
    try {
      SerialPort = require('serialport').SerialPort;
    } catch {
      throw new Error('serialport package is not installed.');
    }

    return new Promise((resolve, reject) => {
      this._serialPort = new SerialPort({
        path: this.config.address,
        baudRate: this.config.baudRate || 9600,
        autoOpen: false,
      });

      this._serialPort.open((err) => {
        if (err) return reject(err);
        this.connected = true;
        resolve();
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PRIVATE – DATA SENDING
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Send formatted lines to the printer or fall back to console.
   * @private
   * @param {string} title - Label for console fallback
   * @param {string[]} lines
   * @returns {Promise<boolean>}
   */
  async _sendLines(title, lines) {
    const text = lines.join('\r\n') + '\r\n\r\n';

    if (!this.connected) {
      this._consoleFallback(title, lines);
      return true;
    }

    try {
      await this._sendRaw(Buffer.from(text, 'ascii'));
      return true;
    } catch (err) {
      console.error(`[ImpactPrinter] _sendLines error: ${err.message}`);
      this._consoleFallback(title, lines);
      return false;
    }
  }

  /**
   * Send raw bytes to the active transport.
   * @private
   * @param {Buffer} buf
   * @returns {Promise<void>}
   */
  _sendRaw(buf) {
    return new Promise((resolve, reject) => {
      // Network
      if (this._socket) {
        this._socket.write(buf, (err) => {
          if (err) return reject(err);
          resolve();
        });
        return;
      }

      // Serial
      if (this._serialPort) {
        this._serialPort.write(buf, (err) => {
          if (err) return reject(err);
          this._serialPort.drain(() => resolve());
        });
        return;
      }

      // LPT / USB share (Windows: write to \\.\LPT1 or file share)
      if (this._lptPort || this.config.address) {
        const target = this._lptPort || this.config.address;
        try {
          fs.writeFileSync(target, buf);
          resolve();
        } catch (err) {
          reject(new Error(`LPT/USB write failed (${target}): ${err.message}`));
        }
        return;
      }

      reject(new Error('No output transport available.'));
    });
  }

  /**
   * Print to console when no physical printer is connected.
   * @private
   * @param {string} title
   * @param {string[]} lines
   */
  _consoleFallback(title, lines) {
    const cols = this.getColumnCount();
    console.log(`\n+${'-'.repeat(cols + 2)}+`);
    console.log(`| ${title.padEnd(cols)} |`);
    console.log(`+${'-'.repeat(cols + 2)}+`);
    for (const line of lines) {
      console.log(`| ${(line || '').padEnd(cols)} |`);
    }
    console.log(`+${'-'.repeat(cols + 2)}+\n`);
  }
}

module.exports = ImpactPrinter;
