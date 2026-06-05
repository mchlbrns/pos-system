/**
 * @fileoverview Abstract base class for all POS printer drivers.
 *
 * Every concrete printer driver (thermal, impact, etc.) MUST extend this class
 * and implement every method marked with `@abstract`.  Calling an unimplemented
 * method throws an error at runtime so that missing implementations surface
 * immediately during development.
 *
 * @module PrinterInterface
 */

'use strict';

/**
 * @typedef {Object} ReceiptData
 * @property {string}   transactionId       - Unique transaction / receipt number
 * @property {string}   cashier             - Cashier name or ID
 * @property {string}   [terminal]          - POS terminal identifier
 * @property {Date}     [date]              - Transaction date (defaults to now)
 * @property {ReceiptItem[]} items          - Line items
 * @property {number}   subtotal            - Pre-tax subtotal
 * @property {number}   vatAmount           - 12 % VAT amount
 * @property {number}   [vatExemptSales]    - VAT-exempt sales total
 * @property {number}   [zeroRatedSales]    - Zero-rated sales total
 * @property {number}   discount            - Total discount
 * @property {string}   [discountType]      - e.g. "Senior Citizen", "PWD", "Promo"
 * @property {number}   total               - Grand total after tax & discount
 * @property {number}   amountPaid          - Amount tendered
 * @property {number}   change              - Change due
 * @property {string}   [paymentMethod]     - CASH | CARD | GCASH | MAYA etc.
 * @property {string}   [customerName]      - Customer name (for SC/PWD discount)
 * @property {string}   [customerTIN]       - Customer TIN
 * @property {string}   [scPwdIdNo]         - SC / PWD ID number
 * @property {Object}   [business]          - Override default business info
 */

/**
 * @typedef {Object} ReceiptItem
 * @property {string}  name       - Item description
 * @property {number}  quantity   - Quantity
 * @property {number}  unitPrice  - Unit price
 * @property {number}  amount     - Line total  (qty × price)
 * @property {string}  [unit]     - Unit of measure (e.g. "gal", "kg", "pc")
 * @property {boolean} [vatExempt] - Whether item is VAT-exempt
 */

/**
 * @typedef {Object} KitchenOrderData
 * @property {string}        orderId   - Order / ticket number
 * @property {string}        [table]   - Table number or area
 * @property {string}        [server]  - Server / waiter name
 * @property {Date}          [date]    - Order timestamp
 * @property {KitchenItem[]} items     - Items to prepare
 * @property {string}        [notes]   - Special instructions
 */

/**
 * @typedef {Object} KitchenItem
 * @property {string} name     - Item name
 * @property {number} quantity - Quantity
 * @property {string} [notes]  - Modifiers / special requests
 */

/**
 * @typedef {Object} BarcodeOptions
 * @property {'CODE128'|'EAN13'|'EAN8'|'UPC_A'|'CODE39'} [type='CODE128'] - Barcode symbology
 * @property {number} [width=2]    - Module width  (1-6)
 * @property {number} [height=80]  - Barcode height in dots
 * @property {string} [position='below'] - HRI position: 'none'|'above'|'below'|'both'
 */

/**
 * @typedef {Object} PrinterStatus
 * @property {boolean} online       - Printer is reachable
 * @property {boolean} paperPresent - Paper roll is loaded
 * @property {boolean} coverClosed  - Cover / lid is closed
 * @property {boolean} drawerOpen   - Cash drawer is open
 * @property {string}  [error]      - Human-readable error if any
 */

/**
 * Abstract base class for POS printer drivers.
 *
 * @abstract
 */
class PrinterInterface {
  /**
   * @param {Object} config - Printer-specific configuration
   * @param {string} config.id         - Unique printer ID
   * @param {string} config.name       - Human-readable printer name
   * @param {string} config.connection - 'usb' | 'network' | 'serial'
   * @param {string} [config.address]  - IP address (network) or COM port (serial)
   * @param {number} [config.port]     - TCP port for network printers
   * @param {number} [config.paperWidth=80] - Paper width in mm (58 | 80)
   */
  constructor(config = {}) {
    if (new.target === PrinterInterface) {
      throw new Error('PrinterInterface is abstract and cannot be instantiated directly.');
    }
    /** @protected */
    this.config = {
      id: config.id || 'default',
      name: config.name || 'Printer',
      connection: config.connection || 'usb',
      address: config.address || null,
      port: config.port || 9100,
      vendorId: config.vendorId || null,
      productId: config.productId || null,
      baudRate: config.baudRate || 9600,
      paperWidth: config.paperWidth || 80,
      encoding: config.encoding || 'GB18030',
      enabled: config.enabled !== undefined ? config.enabled : true,
      role: config.role || 'receipt',
    };

    /** @protected */
    this.connected = false;
  }

  // ─── abstract methods ────────────────────────────────────────────

  /**
   * Print a full sales receipt.
   * @abstract
   * @param {ReceiptData} data
   * @returns {Promise<boolean>} true on success
   */
  async printReceipt(data) {
    throw new Error('printReceipt() must be implemented by subclass.');
  }

  /**
   * Print a kitchen / service order ticket.
   * @abstract
   * @param {KitchenOrderData} data
   * @returns {Promise<boolean>}
   */
  async printKitchenOrder(data) {
    throw new Error('printKitchenOrder() must be implemented by subclass.');
  }

  /**
   * Trigger the cash drawer kick-out pulse.
   * @abstract
   * @returns {Promise<boolean>}
   */
  async openCashDrawer() {
    throw new Error('openCashDrawer() must be implemented by subclass.');
  }

  /**
   * Return the real-time printer status.
   * @abstract
   * @returns {Promise<PrinterStatus>}
   */
  async getPrinterStatus() {
    throw new Error('getPrinterStatus() must be implemented by subclass.');
  }

  /**
   * Cut paper (full or partial).
   * @abstract
   * @param {boolean} [partial=true] - `true` for partial cut, `false` for full cut
   * @returns {Promise<boolean>}
   */
  async cutPaper(partial = true) {
    throw new Error('cutPaper() must be implemented by subclass.');
  }

  /**
   * Print a barcode.
   * @abstract
   * @param {string}         data    - Data to encode
   * @param {BarcodeOptions} options - Barcode options
   * @returns {Promise<boolean>}
   */
  async printBarcode(data, options = {}) {
    throw new Error('printBarcode() must be implemented by subclass.');
  }

  // ─── concrete helpers ────────────────────────────────────────────

  /**
   * Open a connection to the printer.
   * @abstract
   * @returns {Promise<void>}
   */
  async connect() {
    throw new Error('connect() must be implemented by subclass.');
  }

  /**
   * Close the connection to the printer.
   * @abstract
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('disconnect() must be implemented by subclass.');
  }

  /**
   * Whether the driver is currently connected to hardware.
   * @returns {boolean}
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Return the column count for the current paper width.
   * 58 mm ≈ 32 chars (standard font), 80 mm ≈ 48 chars.
   * @returns {number}
   */
  getColumnCount() {
    return this.config.paperWidth <= 58 ? 32 : 48;
  }

  /**
   * Friendly summary for logging.
   * @returns {string}
   */
  toString() {
    return `[${this.config.name}] ${this.config.connection}://${this.config.address || 'auto'} (${this.config.paperWidth}mm)`;
  }
}

module.exports = PrinterInterface;
