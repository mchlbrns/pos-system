/**
 * @fileoverview Receipt and ticket formatter for POS printers.
 *
 * Converts raw receipt / kitchen-order data into structured, column-aligned
 * text layouts suitable for both ESC/POS thermal printers and plain-text
 * impact printers.  Supports 58 mm (32-col) and 80 mm (48-col) paper widths.
 *
 * Philippine locale: ₱ currency, MM/DD/YYYY dates, BIR-required fields.
 *
 * @module ReceiptFormatter
 */

'use strict';

const path = require('path');
const fs   = require('fs');

/** Default config path */
const DEFAULT_CONFIG_PATH = path.resolve(__dirname, '..', 'config', 'printer.config.json');

/**
 * Loads the business / receipt config from disk (or returns defaults).
 * @param {string} [configPath]
 * @returns {Object}
 */
function loadConfig(configPath) {
  try {
    const raw = fs.readFileSync(configPath || DEFAULT_CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { business: {}, receipt: {} };
  }
}

class ReceiptFormatter {
  /**
   * @param {Object}  [options]
   * @param {number}  [options.paperWidth=80]  - 58 or 80 mm
   * @param {Object}  [options.business]       - Override business info
   * @param {Object}  [options.receipt]         - Override receipt settings
   * @param {string}  [options.configPath]      - Path to config JSON
   */
  constructor(options = {}) {
    const cfg = loadConfig(options.configPath);

    this.paperWidth = options.paperWidth || 80;
    this.cols       = this.paperWidth <= 58 ? 32 : 48;
    this.business   = { ...cfg.business, ...options.business };
    this.receipt    = { ...cfg.receipt, ...options.receipt };
    this.currency   = this.receipt.currency || '₱';
    this.vatRate    = this.receipt.vatRate ?? 0.12;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Format a complete sales receipt as an array of text lines.
   * @param {import('./PrinterInterface').ReceiptData} data
   * @returns {string[]}
   */
  formatReceipt(data) {
    const lines = [];

    // ── Header ──────────────────────────────────────────────────────
    lines.push(...this._businessHeader(data.business));
    lines.push(this._separator('='));

    // ── Transaction info ────────────────────────────────────────────
    const dt = data.date ? new Date(data.date) : new Date();
    lines.push(this._leftRight('Receipt #:', data.transactionId || '---'));
    lines.push(this._leftRight('Date:', this._formatDate(dt)));
    lines.push(this._leftRight('Time:', this._formatTime(dt)));
    if (data.cashier)  lines.push(this._leftRight('Cashier:', data.cashier));
    if (data.terminal) lines.push(this._leftRight('Terminal:', data.terminal));
    lines.push(this._separator('-'));

    // ── Column headings ─────────────────────────────────────────────
    lines.push(this._itemHeader());
    lines.push(this._separator('-'));

    // ── Items ───────────────────────────────────────────────────────
    for (const item of (data.items || [])) {
      lines.push(...this._formatItem(item));
    }
    lines.push(this._separator('-'));

    // ── Totals ──────────────────────────────────────────────────────
    lines.push(this._leftRight('Subtotal:', this._money(data.subtotal)));

    if (data.discount && data.discount > 0) {
      const discLabel = data.discountType
        ? `Discount (${data.discountType}):`
        : 'Discount:';
      lines.push(this._leftRight(discLabel, `-${this._money(data.discount)}`));
    }

    if (data.vatExemptSales) {
      lines.push(this._leftRight('VAT-Exempt Sales:', this._money(data.vatExemptSales)));
    }
    if (data.zeroRatedSales) {
      lines.push(this._leftRight('Zero-Rated Sales:', this._money(data.zeroRatedSales)));
    }

    lines.push(this._leftRight(`VAT (${(this.vatRate * 100).toFixed(0)}%):`, this._money(data.vatAmount)));
    lines.push(this._separator('='));
    lines.push(this._leftRight('TOTAL:', this._money(data.total)));
    lines.push(this._separator('='));

    // ── Payment ─────────────────────────────────────────────────────
    const payMethod = data.paymentMethod || 'CASH';
    lines.push(this._leftRight(`${payMethod} Tendered:`, this._money(data.amountPaid)));
    lines.push(this._leftRight('Change:', this._money(data.change)));

    // ── SC / PWD info ───────────────────────────────────────────────
    if (data.customerName) {
      lines.push(this._separator('-'));
      lines.push(this._leftRight('Customer:', data.customerName));
      if (data.customerTIN)  lines.push(this._leftRight('Customer TIN:', data.customerTIN));
      if (data.scPwdIdNo)    lines.push(this._leftRight('SC/PWD ID:', data.scPwdIdNo));
    }

    // ── Footer ──────────────────────────────────────────────────────
    lines.push(this._separator('-'));
    lines.push(...this._receiptFooter());
    lines.push('');

    return lines;
  }

  /**
   * Format a kitchen / service order ticket.
   * @param {import('./PrinterInterface').KitchenOrderData} data
   * @returns {string[]}
   */
  formatKitchenOrder(data) {
    const lines = [];
    const dt = data.date ? new Date(data.date) : new Date();

    lines.push(this._center('*** KITCHEN ORDER ***'));
    lines.push(this._separator('='));
    lines.push(this._leftRight('Order #:', data.orderId || '---'));
    if (data.table)  lines.push(this._leftRight('Table:', data.table));
    if (data.server) lines.push(this._leftRight('Server:', data.server));
    lines.push(this._leftRight('Time:', this._formatTime(dt)));
    lines.push(this._separator('-'));

    for (const item of (data.items || [])) {
      const qty = `x${item.quantity}`;
      lines.push(this._leftRight(qty, item.name));
      if (item.notes) {
        lines.push(`  >> ${item.notes}`);
      }
    }

    if (data.notes) {
      lines.push(this._separator('-'));
      lines.push(this._center('NOTES'));
      lines.push(this._wrapText(data.notes));
    }

    lines.push(this._separator('='));
    lines.push('');
    return lines;
  }

  /**
   * Return a single formatted receipt as one string (for console / file output).
   * @param {import('./PrinterInterface').ReceiptData} data
   * @returns {string}
   */
  formatReceiptText(data) {
    return this.formatReceipt(data).join('\n');
  }

  /**
   * Return a formatted kitchen order as one string.
   * @param {import('./PrinterInterface').KitchenOrderData} data
   * @returns {string}
   */
  formatKitchenOrderText(data) {
    return this.formatKitchenOrder(data).join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Business header block.
   * @param {Object} [overrideBiz]
   * @returns {string[]}
   */
  _businessHeader(overrideBiz) {
    const biz = { ...this.business, ...overrideBiz };
    const lines = [];

    if (biz.name) lines.push(this._center(biz.name.toUpperCase()));
    if (biz.address) {
      const addr = [biz.address, biz.city, biz.province, biz.zip].filter(Boolean).join(', ');
      lines.push(...this._wrapCenter(addr));
    }
    if (biz.phone) lines.push(this._center(biz.phone));
    if (biz.email) lines.push(this._center(biz.email));

    // BIR-required fields
    if (biz.tin) lines.push(this._center(`TIN: ${biz.tin}`));
    if (biz.vatRegistered !== undefined) {
      lines.push(this._center(biz.vatRegistered ? 'VAT Registered' : 'Non-VAT'));
    }
    if (biz.permitNo)        lines.push(this._center(`Permit #: ${biz.permitNo}`));
    if (biz.accreditationNo) lines.push(this._center(`Accreditation #: ${biz.accreditationNo}`));
    if (biz.ptuNo)           lines.push(this._center(`PTU #: ${biz.ptuNo}`));

    return lines;
  }

  /** Receipt footer. @returns {string[]} */
  _receiptFooter() {
    const lines = [];
    if (this.receipt.footerMessage) {
      lines.push(this._center(this.receipt.footerMessage));
    }
    if (this.receipt.returnPolicy) {
      lines.push(...this._wrapCenter(this.receipt.returnPolicy));
    }
    if (this.receipt.headerLines && this.receipt.headerLines.length) {
      for (const l of this.receipt.headerLines) lines.push(this._center(l));
    }
    lines.push(this._center('THIS SERVES AS YOUR OFFICIAL RECEIPT'));
    return lines;
  }

  // ── column / alignment helpers ────────────────────────────────────

  /** Item column header */
  _itemHeader() {
    if (this.cols >= 48) {
      return this._columns(['Item', 'Qty', 'Price', 'Amount'], [24, 6, 9, 9]);
    }
    return this._columns(['Item', 'Qty', 'Price', 'Amt'], [14, 4, 7, 7]);
  }

  /**
   * Format a single receipt item (may span multiple lines on narrow paper).
   * @param {import('./PrinterInterface').ReceiptItem} item
   * @returns {string[]}
   */
  _formatItem(item) {
    const qty   = String(item.quantity);
    const price = this._money(item.unitPrice);
    const amt   = this._money(item.amount);
    const unit  = item.unit ? ` (${item.unit})` : '';
    const name  = `${item.name}${unit}`;

    if (this.cols >= 48) {
      // 80 mm — try to fit on one line
      const nameCol = 24;
      if (name.length <= nameCol) {
        return [this._columns([name, qty, price, amt], [nameCol, 6, 9, 9])];
      }
      // long name: first line is name only, second line has numbers
      return [
        name,
        this._columns(['', qty, price, amt], [24, 6, 9, 9]),
      ];
    }

    // 58 mm — name on first line, numbers on second
    if (name.length <= 14) {
      return [this._columns([name, qty, price, amt], [14, 4, 7, 7])];
    }
    return [
      name,
      this._columns(['', qty, price, amt], [14, 4, 7, 7]),
    ];
  }

  /**
   * Build a row from column values with fixed widths.
   * Last column is right-aligned; others are left-aligned.
   * @param {string[]} values
   * @param {number[]} widths
   * @returns {string}
   */
  _columns(values, widths) {
    let row = '';
    for (let i = 0; i < values.length; i++) {
      const v = String(values[i]);
      const w = widths[i];
      if (i === values.length - 1) {
        // right-align last column
        row += v.padStart(w);
      } else {
        row += v.padEnd(w);
      }
    }
    return row.substring(0, this.cols);
  }

  /**
   * Left-right justified line.
   * @param {string} left
   * @param {string} right
   * @returns {string}
   */
  _leftRight(left, right) {
    const gap = this.cols - left.length - right.length;
    if (gap < 1) {
      return left + ' ' + right;
    }
    return left + ' '.repeat(gap) + right;
  }

  /**
   * Center a string within the column width.
   * @param {string} text
   * @returns {string}
   */
  _center(text) {
    if (text.length >= this.cols) return text.substring(0, this.cols);
    const pad = Math.floor((this.cols - text.length) / 2);
    return ' '.repeat(pad) + text;
  }

  /**
   * Center-wrapped text for long strings.
   * @param {string} text
   * @returns {string[]}
   */
  _wrapCenter(text) {
    const wrapped = this._wrapLines(text);
    return wrapped.map(l => this._center(l));
  }

  /**
   * Separator line.
   * @param {string} [char='-']
   * @returns {string}
   */
  _separator(char = '-') {
    return char.repeat(this.cols);
  }

  /**
   * Word-wrap text to column width.
   * @param {string} text
   * @returns {string[]}
   */
  _wrapLines(text) {
    const words = text.split(/\s+/);
    const lines = [];
    let current = '';
    for (const word of words) {
      if (current.length + word.length + 1 > this.cols) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = current ? current + ' ' + word : word;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  /**
   * Wrap text and return as a single string (for simple inline use).
   * @param {string} text
   * @returns {string}
   */
  _wrapText(text) {
    return this._wrapLines(text).join('\n');
  }

  // ── currency / date helpers ───────────────────────────────────────

  /**
   * Format a number as Philippine Peso.
   * @param {number} amount
   * @returns {string}
   */
  _money(amount) {
    if (amount === undefined || amount === null) return `${this.currency}0.00`;
    return `${this.currency}${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Format date as MM/DD/YYYY.
   * @param {Date} d
   * @returns {string}
   */
  _formatDate(d) {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = d.getFullYear();
    return `${mm}/${dd}/${yy}`;
  }

  /**
   * Format time as hh:mm:ss AM/PM.
   * @param {Date} d
   * @returns {string}
   */
  _formatTime(d) {
    let h = d.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${mm}:${ss} ${ampm}`;
  }
}

module.exports = ReceiptFormatter;
