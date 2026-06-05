# Cashier User Manual — Universal POS

Welcome to the Universal POS Cashier user guide.

## 1. Getting Started
1. Launch the POS server using `scripts\start.bat`.
2. Open Google Chrome and navigate to http://localhost:5173.
3. Login using the default credentials:
   - **Username**: `admin`
   - **Password**: `admin123`

## 2. Cashier Checkout Flow
- **Product Selection**: Click on any product card in the main grid or scan a barcode to add it to the cart.
- **Adjust Quantities**: Click `+` or `-` buttons next to the item inside the cart sidebar.
- **Applying Discounts**: 
  - To apply a Senior Citizen or PWD discount, click the **Senior/PWD** button. The system will automatically exclude VAT (12%) and apply a 20% discount as mandated by Philippine Law.
- **Processing Payment**:
  - Click the large **CHECKOUT** button.
  - Select Gcash, PayMaya, or Cash.
  - Input amount paid and verify change due.
  - Click **Process Payment** to save transaction and trigger receipt printer.

## 3. Keyboard Shortcuts Reference

| Key | Action |
|-----|--------|
| **F1** | Focus search input |
| **F4** | Trigger Checkout Modal |
| **F8** | Apply 10% Discount |
| **F9** | Apply Senior/PWD Discount |
| **Esc** | Close Modals / Clear Cart |
