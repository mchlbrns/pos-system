# Manual Test Checklist - Universal POS System

> **Layunin:** Checklist para sa manual testing ng hardware components na hindi ma-automate.
> I-perform ang lahat ng tests bago mag-deploy sa production.

---

## 📋 Test Information

| Field | Value |
|---|---|
| **Tester Name** | __________________ |
| **Test Date** | __________________ |
| **POS Version** | v1.0.0 |
| **Operating System** | Windows ____ |
| **Business Type Plugin** | ☐ Water Station ☐ Laundry ☐ Motor Repair |

---

## 🖨️ 1. Thermal Printer Testing (58mm)

**Printer Model:** __________________ (e.g., Xprinter XP-58IIH)
**Connection Type:** ☐ USB ☐ Network ☐ Bluetooth

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|---|---|---|---|---|
| 1.1 | Printer Detection | Plug in printer → Go to Settings → Printers | Printer appears in list | ☐ Pass ☐ Fail | |
| 1.2 | Test Print | Click "Test Print" button | Prints test page with store name, date, alignment test | ☐ Pass ☐ Fail | |
| 1.3 | Receipt Print (Short) | Complete 1-item transaction | Receipt prints: header, 1 item, total, footer | ☐ Pass ☐ Fail | |
| 1.4 | Receipt Print (Long) | Complete 10+ item transaction | Receipt prints all items, no truncation | ☐ Pass ☐ Fail | |
| 1.5 | Peso Sign (₱) | Check receipt amounts | ₱ symbol prints correctly (not garbled) | ☐ Pass ☐ Fail | |
| 1.6 | Filipino Characters | Add product with Filipino name (e.g., "Pinakuluang Tubig") | Characters print correctly | ☐ Pass ☐ Fail | |
| 1.7 | Auto-cut | Complete transaction | Paper auto-cuts after receipt | ☐ Pass ☐ Fail | |
| 1.8 | Paper Width | Check margins | Text fits within 58mm, no overflow | ☐ Pass ☐ Fail | |
| 1.9 | Barcode/QR Print | Enable QR on receipt → print | QR code is scannable | ☐ Pass ☐ Fail | |
| 1.10 | Printer Offline | Unplug printer → try to print | Shows error "Printer not connected" gracefully | ☐ Pass ☐ Fail | |
| 1.11 | Paper Out | Remove paper → try to print | Shows "Out of paper" error, re-prints after paper loaded | ☐ Pass ☐ Fail | |

---

## 🖨️ 2. Thermal Printer Testing (80mm)

**Printer Model:** __________________ (e.g., Epson TM-T82III)
**Connection Type:** ☐ USB ☐ Network ☐ Bluetooth

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|---|---|---|---|---|
| 2.1 | Printer Detection | Plug in printer → Settings → Printers | Printer appears, detected as 80mm | ☐ Pass ☐ Fail | |
| 2.2 | Test Print | Click "Test Print" | Test page with correct 80mm width formatting | ☐ Pass ☐ Fail | |
| 2.3 | Receipt Layout 80mm | Complete transaction | Receipt uses full 80mm width (wider columns) | ☐ Pass ☐ Fail | |
| 2.4 | Column Alignment | Print receipt with qty, price, total columns | Columns align properly (right-align amounts) | ☐ Pass ☐ Fail | |
| 2.5 | Logo Printing | Upload store logo → print receipt | Logo prints at top of receipt | ☐ Pass ☐ Fail | |
| 2.6 | Switch 58mm ↔ 80mm | Change printer setting from 58mm to 80mm | Layout adjusts, no text overflow | ☐ Pass ☐ Fail | |

---

## 🖨️ 3. Impact/Dot Matrix Printer Testing

**Printer Model:** __________________ (e.g., Epson LX-310)
**Connection Type:** ☐ USB ☐ Parallel (LPT)

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|---|---|---|---|---|
| 3.1 | Printer Detection | Connect printer → Settings → Printers | Detected as impact printer | ☐ Pass ☐ Fail | |
| 3.2 | Plain Text Print | Print receipt | Prints in plain text mode (no graphics) | ☐ Pass ☐ Fail | |
| 3.3 | Carbon Copy | Insert multi-part paper → print | All copies are legible | ☐ Pass ☐ Fail | |
| 3.4 | Form Feed | Complete transaction | Paper feeds correctly after print | ☐ Pass ☐ Fail | |
| 3.5 | Long Receipt | 15+ items | Continuous feed, all items printed | ☐ Pass ☐ Fail | |

---

## 💰 4. Cash Drawer Testing

**Drawer Model:** __________________ 
**Connection:** ☐ RJ11 (via Printer) ☐ USB ☐ Manual

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|---|---|---|---|---|
| 4.1 | Auto-Open on Sale | Complete cash transaction | Drawer opens automatically | ☐ Pass ☐ Fail | |
| 4.2 | Manual Open | Click "Open Drawer" in POS | Drawer opens | ☐ Pass ☐ Fail | |
| 4.3 | No Open on Non-Cash | Complete GCash/card transaction | Drawer does NOT open | ☐ Pass ☐ Fail | |
| 4.4 | Drawer Status | Close drawer | System detects drawer is closed | ☐ Pass ☐ Fail | |
| 4.5 | Open on Start of Day | Click "Open Register" / start shift | Drawer opens for counting | ☐ Pass ☐ Fail | |

---

## 📊 5. Barcode Scanner Testing

**Scanner Model:** __________________ 
**Connection:** ☐ USB (HID) ☐ Bluetooth ☐ Wireless 2.4GHz

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|---|---|---|---|---|
| 5.1 | Scanner Detection | Plug in scanner → Go to POS screen | Cursor is in search/barcode field | ☐ Pass ☐ Fail | |
| 5.2 | Scan Product | Scan barcode of known product | Product added to cart instantly | ☐ Pass ☐ Fail | |
| 5.3 | Scan Unknown | Scan barcode not in database | Shows "Product not found" message | ☐ Pass ☐ Fail | |
| 5.4 | Rapid Scanning | Scan 5 products quickly | All 5 products added to cart | ☐ Pass ☐ Fail | |
| 5.5 | Scan During Checkout | Scan while checkout modal open | Barcode ignored or handled gracefully | ☐ Pass ☐ Fail | |
| 5.6 | EAN-13 Format | Scan EAN-13 barcode | Recognized correctly | ☐ Pass ☐ Fail | |
| 5.7 | Code 128 Format | Scan Code 128 barcode | Recognized correctly | ☐ Pass ☐ Fail | |
| 5.8 | QR Code | Scan QR code (if supported) | Handled correctly | ☐ Pass ☐ Fail | |

---

## 🌐 6. Network & Connectivity Testing

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|---|---|---|---|---|
| 6.1 | WiFi POS Tablet | Connect tablet to same WiFi → open POS URL | POS loads on tablet browser | ☐ Pass ☐ Fail | |
| 6.2 | Multiple Clients | Open POS on 2 devices simultaneously | Both work, transactions don't conflict | ☐ Pass ☐ Fail | |
| 6.3 | Network Printer | Configure printer via IP → test print | Prints over network | ☐ Pass ☐ Fail | |
| 6.4 | WiFi Disconnect | Disconnect WiFi during operation | POS switches to offline mode | ☐ Pass ☐ Fail | |
| 6.5 | WiFi Reconnect | Reconnect WiFi | Pending transactions sync | ☐ Pass ☐ Fail | |

---

## 📱 7. PWA / Mobile Testing

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|---|---|---|---|---|
| 7.1 | Install PWA | Open POS in Chrome → Install | App icon appears on home screen | ☐ Pass ☐ Fail | |
| 7.2 | PWA Fullscreen | Open installed PWA | Runs without browser chrome | ☐ Pass ☐ Fail | |
| 7.3 | Touch Checkout | Tap products → checkout (touch only) | All interactions work with touch | ☐ Pass ☐ Fail | |
| 7.4 | Responsive Layout | Open on various screen sizes | Layout adapts, no broken elements | ☐ Pass ☐ Fail | |

---

## ⌨️ 8. Keyboard Shortcuts Testing

| # | Shortcut | Action | Works? | Notes |
|---|---|---|---|---|
| 8.1 | `F1` | New Transaction | ☐ Pass ☐ Fail | |
| 8.2 | `F2` | Payment / Checkout | ☐ Pass ☐ Fail | |
| 8.3 | `F5` | Refresh Products | ☐ Pass ☐ Fail | |
| 8.4 | `F9` | Open Cash Drawer | ☐ Pass ☐ Fail | |
| 8.5 | `Esc` | Cancel / Close Modal | ☐ Pass ☐ Fail | |
| 8.6 | `Ctrl+F` | Search Product | ☐ Pass ☐ Fail | |
| 8.7 | `+` / `-` | Increase / Decrease Qty | ☐ Pass ☐ Fail | |
| 8.8 | `Delete` | Remove Item from Cart | ☐ Pass ☐ Fail | |

---

## 🔋 9. Power & Recovery Testing

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|---|---|---|---|---|
| 9.1 | Power Interruption | Pull plug during transaction | After restart, no data loss (pending txn recoverable) | ☐ Pass ☐ Fail | |
| 9.2 | Auto-Start | Restart PC | POS auto-starts (if configured) | ☐ Pass ☐ Fail | |
| 9.3 | Database Recovery | Force-kill server process → restart | Database intact, no corruption | ☐ Pass ☐ Fail | |

---

## ✅ Test Summary

| Category | Total Tests | Passed | Failed | Skipped |
|---|---|---|---|---|
| Thermal 58mm | 11 | ___ | ___ | ___ |
| Thermal 80mm | 6 | ___ | ___ | ___ |
| Impact Printer | 5 | ___ | ___ | ___ |
| Cash Drawer | 5 | ___ | ___ | ___ |
| Barcode Scanner | 8 | ___ | ___ | ___ |
| Network | 5 | ___ | ___ | ___ |
| PWA / Mobile | 4 | ___ | ___ | ___ |
| Keyboard | 8 | ___ | ___ | ___ |
| Power & Recovery | 3 | ___ | ___ | ___ |
| **TOTAL** | **55** | ___ | ___ | ___ |

**Overall Result:** ☐ PASS ☐ FAIL (CONDITIONAL) ☐ FAIL

**Tester Signature:** _________________________ **Date:** _____________

---

## 📝 Additional Notes / Issues Found

_Isulat dito ang mga napansin na issues, suggestions, o mga kailangang i-fix bago mag-deploy:_

1. _______________________________________________________________
2. _______________________________________________________________
3. _______________________________________________________________
4. _______________________________________________________________
5. _______________________________________________________________
