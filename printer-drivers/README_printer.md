# POS Printer Drivers — Thermal & Impact

This module handles communication with physical printing hardware, specifically targeting 58mm/80mm thermal ESC/POS printers and raw impact dot-matrix printers.

## Supported Connections
1. **USB**: Standard local connection (requires Zadig driver configuration on Windows).
2. **Network**: Ethernet/Wi-Fi connection (using TCP port 9100).
3. **Serial**: COM/RS232 connections.

## Setup and Troubleshooting (Windows)

### Thermal Printer Setup
For Windows deployments, POS thermal printers (e.g. Xprinter, Epson) require mapping the USB device to a virtual port or using raw printing.
1. Download and open **Zadig** (https://zadig.akeo.ie/).
2. Select your printer from the device list.
3. Replace the default Windows driver with **WinUSB** or **libusb-win32**.
4. Test by running the demo script:
   ```bash
   npm run demo
   ```

### Troubleshooting Serial Port Errors
If serial connection reports `ACCESS_DENIED`, verify that:
- The baud rate in `config/printer.config.json` matches the printer hardware switches (usually 9600 or 19200).
- No other software (such as utility tools or word processors) is holding the COM port.
