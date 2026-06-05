# Printer Driver Interface Definition

All hardware drivers (Thermal ESC/POS, Dot-matrix raw text) must implement the following base structure.

## Methods

1. **`detectPrinters()`**
   - Returns: `Promise<Array<Object>>` - Array of detected printers: `[ { name: 'Epson XP-58', connection: 'usb' } ]`

2. **`printReceipt(data, options)`**
   - Params:
     - `data`: Object containing business_name, items, subtotal, tax_amount, discount_amount, total, payments.
     - `options`: Connection config.
   - Returns: `Promise<boolean>`

3. **`openCashDrawer(options)`**
   - Returns: `Promise<boolean>` - Triggers ESC/POS drawer kick code (`ESC p 0 25 250`).

4. **`getPrinterStatus(options)`**
   - Returns: `Promise<string>` - `online`, `paper-out`, or `offline`.
