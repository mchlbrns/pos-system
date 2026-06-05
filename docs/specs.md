# Universal POS System — Product Specification

> **Version:** 1.0  
> **Last Updated:** 2026-06-05  
> **Status:** Approved  
> **Target Market:** Water Refilling Stations, Laundry Shops, Motorcycle Repair Shops — Philippines

---

## 1. Executive Summary

The Universal POS System is a plugin-based, offline-first point-of-sale application designed for micro and small businesses in the Philippines. It runs on low-cost Windows PCs, supports thermal and impact printers commonly used in Philippine sari-sari stores and service shops, and provides business-type-specific workflows through a plugin architecture.

### 1.1 Key Design Principles

| Principle | Description |
|-----------|-------------|
| **Offline-First** | Full functionality without internet; sync when connected |
| **Low-Cost Deployment** | Runs on ₱8,000–₱15,000 PCs with no server costs |
| **Plugin-Based** | Business logic is modular; new business types can be added |
| **Printer-Agnostic** | Works with thermal (58mm/80mm) and impact/dot-matrix printers |
| **Bilingual** | Filipino (Tagalog) and English UI |
| **PWA-Ready** | Can run as installed desktop app or in browser |

---

## 2. User Personas

### 2.1 Ate Merly — Water Station Owner
- **Age:** 42
- **Tech Level:** Basic smartphone user, uses Facebook
- **Business:** "Merly's Pure Water" — 3 employees, 50–100 customers/day
- **Pain Points:** Tracks sales in a notebook; loses track of container deposits; can't generate reports for BIR
- **Needs:** Quick gallon tracking, container deposit management, delivery tracking, daily/monthly sales summary

### 2.2 Kuya Jun — Laundry Shop Owner
- **Age:** 35
- **Tech Level:** Comfortable with computers, uses GCash
- **Business:** "QuickWash Laundry" — 5 employees, 30–60 orders/day
- **Pain Points:** Handwritten claim stubs get lost; customers argue about pickup dates; can't track which machine is available
- **Needs:** Order tracking with claim stubs, SMS/print notifications, weight-based pricing, service type management

### 2.3 Boss Eddie — Motorcycle Repair Shop Owner
- **Age:** 50
- **Tech Level:** Uses smartphone for calls/text only
- **Business:** "Eddie's Motor Works" — 2 mechanics, 10–25 jobs/day
- **Pain Points:** Forgets to charge for small parts; customers dispute labor hours; no parts inventory
- **Needs:** Job order management, parts inventory, labor tracking, itemized receipts

---

## 3. User Stories

### 3.1 Common / Core POS Stories

#### Authentication & Access

| ID | Story | Priority | Acceptance Criteria |
|----|-------|----------|-------------------|
| C-001 | As a **business owner**, I want to log in with a PIN code so that I can quickly access the system without typing a full password | Must | 4–6 digit PIN; lock after 5 failed attempts; auto-lock after 5 min idle |
| C-002 | As a **business owner**, I want to create cashier accounts with limited permissions so that employees can only process sales | Must | Role-based: Owner (full), Manager (reports+sales), Cashier (sales only) |
| C-003 | As a **cashier**, I want to clock in/out so that my shift hours are tracked | Should | Shift start/end recorded; tied to transactions during shift |
| C-004 | As a **business owner**, I want to see an audit log of all actions so that I can detect fraud | Should | Log: user, action, timestamp, old/new values |

#### Product & Category Management

| ID | Story | Priority | Acceptance Criteria |
|----|-------|----------|-------------------|
| C-010 | As a **business owner**, I want to add products with name, price, and category so that they appear in the POS | Must | Name (required), price (required), category (optional), barcode (optional) |
| C-011 | As a **business owner**, I want to organize products into categories so that cashiers can find them quickly | Must | Nested categories up to 2 levels; drag-and-drop reorder |
| C-012 | As a **business owner**, I want to set multiple price tiers (regular, wholesale, member) so that different customers get different prices | Should | At least 3 price tiers; default tier configurable |
| C-013 | As a **business owner**, I want to import products from a CSV file so that I can set up quickly | Could | CSV template downloadable; validation with error report |
| C-014 | As a **business owner**, I want to track product stock levels so that I know when to reorder | Must | Current stock, low-stock threshold, stock alerts |

#### Cart & Checkout

| ID | Story | Priority | Acceptance Criteria |
|----|-------|----------|-------------------|
| C-020 | As a **cashier**, I want to add items to a cart by searching or scanning so that I can process sales quickly | Must | Search by name/barcode; keyboard shortcut F2 for search |
| C-021 | As a **cashier**, I want to adjust item quantity in the cart so that I can handle bulk purchases | Must | +/- buttons; direct quantity input; max 9999 |
| C-022 | As a **cashier**, I want to apply discounts (percentage or fixed amount) so that I can honor promos | Must | Per-item or whole-cart discount; requires manager approval above 20% |
| C-023 | As a **cashier**, I want to hold/park a transaction so that I can serve another customer while waiting | Should | Up to 5 parked transactions; visual indicator of parked carts |
| C-024 | As a **cashier**, I want to process a refund/void so that I can handle returns | Must | Void (before end of day), Refund (after); requires manager PIN |
| C-025 | As a **cashier**, I want to see the total, tax breakdown, and change due so that I can give correct change | Must | Auto-calculate VAT (12%); display subtotal, tax, discount, total, tendered, change |

#### Payment Processing

| ID | Story | Priority | Acceptance Criteria |
|----|-------|----------|-------------------|
| C-030 | As a **cashier**, I want to accept cash payments and see change due so that transactions are accurate | Must | Tendered amount input; auto-calculate change; denomination shortcut buttons (₱20, ₱50, ₱100, ₱500, ₱1000) |
| C-031 | As a **cashier**, I want to accept GCash/Maya payments so that I can serve customers without cash | Should | Record reference number; mark as e-wallet payment type |
| C-032 | As a **cashier**, I want to split payment across multiple methods so that customers can pay partially in cash and GCash | Could | Multiple payment entries per transaction; total must equal or exceed cart total |
| C-033 | As a **cashier**, I want to record credit/utang transactions so that I can track customer debts | Should | Requires customer record; running balance; partial payment tracking |

#### Receipt & Printing

| ID | Story | Priority | Acceptance Criteria |
|----|-------|----------|-------------------|
| C-040 | As a **cashier**, I want to print a receipt after each transaction so that customers have proof of purchase | Must | Auto-print or prompt; includes business name, items, total, date, transaction # |
| C-041 | As a **business owner**, I want to customize receipt templates so that my branding appears on receipts | Should | Edit header (business name, address, TIN, tagline), footer (return policy, promo) |
| C-042 | As a **cashier**, I want to reprint a receipt so that I can give a copy if the customer asks | Should | Search by transaction # or date; reprint identical receipt |
| C-043 | As a **business owner**, I want receipts to print on both thermal (58mm/80mm) and dot-matrix printers so that I can use whatever printer I have | Must | Auto-detect printer type; format accordingly |

#### Reporting

| ID | Story | Priority | Acceptance Criteria |
|----|-------|----------|-------------------|
| C-050 | As a **business owner**, I want to see daily sales summary so that I know how much I earned today | Must | Total sales, transaction count, average ticket, payment breakdown |
| C-051 | As a **business owner**, I want to see sales by product/category so that I know what sells best | Must | Ranked list; quantity sold, revenue, % of total |
| C-052 | As a **business owner**, I want to generate a Z-report (end of day) so that I can reconcile cash | Must | Expected cash, actual cash (input), over/short; printable |
| C-053 | As a **business owner**, I want to see weekly/monthly trends so that I can plan inventory | Should | Line chart; compare to previous period |
| C-054 | As a **business owner**, I want to export reports to CSV/PDF so that I can share with my accountant | Should | Date range filter; export button |

#### Customer Management

| ID | Story | Priority | Acceptance Criteria |
|----|-------|----------|-------------------|
| C-060 | As a **business owner**, I want to maintain a customer list so that I can track regulars and credit customers | Should | Name, phone, address, notes, total spent, credit balance |
| C-061 | As a **business owner**, I want to see a customer's purchase history so that I can provide better service | Could | List of all transactions; date, items, amount |
| C-062 | As a **business owner**, I want to track customer credits (utang) and payments so that I know who owes me | Should | Credit ledger per customer; partial payments; aging report |

---

### 3.2 Water Refilling Station Stories

| ID | Story | Priority | Acceptance Criteria |
|----|-------|----------|-------------------|
| W-001 | As a **water station owner**, I want to sell water by container type (slim, round, 5-gallon, 1-gallon) with preset prices so that transactions are fast | Must | Quick-select buttons for each container type; configurable prices |
| W-002 | As a **water station owner**, I want to track container deposits so that I know which containers are borrowed | Must | Deposit amount per container type; linked to customer; deposit refund on return |
| W-003 | As a **water station owner**, I want to track delivery orders separately from walk-in sales so that I can manage my delivery riders | Must | Mark as delivery; assign rider; delivery address; delivery fee; status (pending, out, delivered) |
| W-004 | As a **water station owner**, I want to print delivery receipts with customer name and address so that riders don't get lost | Must | Separate delivery receipt template; includes route info |
| W-005 | As a **water station owner**, I want to manage subscriptions (e.g., "10 gallons per week") so that regular customers are auto-scheduled | Could | Recurring order template; reminder on due date |
| W-006 | As a **water station owner**, I want to track daily water production vs sales so that I can monitor wastage | Should | Input: gallons produced; compare to gallons sold; loss report |
| W-007 | As a **water station owner**, I want to see a list of unreturned containers per customer so that I can follow up | Must | Aging list: customer, container type, days out, deposit amount |
| W-008 | As a **water station owner**, I want to record water quality test results so that I can show compliance to customers | Could | Date, test type, result, next test due; printable certificate |

---

### 3.3 Laundry Shop Stories

| ID | Story | Priority | Acceptance Criteria |
|----|-------|----------|-------------------|
| L-001 | As a **laundry shop owner**, I want to create service types (wash-dry-fold, dry clean, press only, wash only) with different pricing so that I can offer multiple services | Must | Service name, price per kg or per piece, minimum charge |
| L-002 | As a **laundry shop cashier**, I want to create a job order with weight, service type, and special instructions so that the laundry staff knows what to do | Must | Auto-generate job order #; print claim stub; estimated completion time |
| L-003 | As a **laundry shop cashier**, I want to print a claim stub for the customer so that they can pick up their laundry | Must | Stub includes: job order #, date received, estimated pickup, items/weight, total, barcode |
| L-004 | As a **laundry shop owner**, I want to track job order status (received → washing → drying → folding → ready → claimed) so that I can update customers | Must | Status board view; click to advance status; timestamp each status change |
| L-005 | As a **laundry shop cashier**, I want to scan the claim stub barcode at pickup to quickly find the order so that pickup is fast | Should | Barcode scan → show order details → confirm pickup → process payment if not prepaid |
| L-006 | As a **laundry shop owner**, I want to charge extra for add-on services (fabric softener, bleach, rush, stain treatment) so that I can upsell | Should | Add-on items linked to job orders; separate pricing |
| L-007 | As a **laundry shop owner**, I want to set rush order pricing (e.g., 1.5x for same-day) so that I can charge appropriately | Should | Rush multiplier configurable; auto-apply when rush is selected |
| L-008 | As a **laundry shop owner**, I want to track machine usage (washer 1, dryer 2, etc.) so that I can schedule loads and maintain equipment | Could | Machine list; assign job orders to machines; usage counter; maintenance reminders |
| L-009 | As a **laundry shop owner**, I want to send SMS notifications when laundry is ready for pickup so that customers come on time | Could | Integration with SMS gateway (Semaphore/Globe Labs); template messages |
| L-010 | As a **laundry shop owner**, I want to see unclaimed orders aging report so that I can follow up with customers | Should | Days since ready; customer contact info; auto-flag after 7 days |

---

### 3.4 Motorcycle Repair Shop Stories

| ID | Story | Priority | Acceptance Criteria |
|----|-------|----------|-------------------|
| M-001 | As a **motor shop owner**, I want to create job orders for each motorcycle brought in, recording plate number, model, and customer info so that I can track each repair | Must | Job order form: customer, motorcycle (plate, make, model, year, mileage), complaint |
| M-002 | As a **motor shop owner**, I want to maintain a parts inventory with stock tracking so that I know what parts I have | Must | Part name, brand, part number, quantity, cost, selling price, reorder level |
| M-003 | As a **mechanic**, I want to add parts used and labor to a job order so that the customer is billed correctly | Must | Select parts from inventory (auto-deduct stock); add labor items with hours × rate |
| M-004 | As a **motor shop owner**, I want to set labor rates per service type (oil change, tune-up, overhaul, tire change) so that pricing is consistent | Must | Service catalog: name, estimated hours, labor rate, common parts |
| M-005 | As a **motor shop owner**, I want to print an itemized receipt showing parts and labor separately so that customers see the breakdown | Must | Receipt sections: Parts (item, qty, unit price, total), Labor (service, hours, rate, total), Grand Total |
| M-006 | As a **motor shop owner**, I want to track job order status (received → diagnosing → waiting for parts → in progress → done → released) so that I can update customers | Must | Status board; mechanic assignment; estimated completion |
| M-007 | As a **motor shop owner**, I want to see a vehicle history for returning customers so that mechanics know past issues | Should | By plate number or customer; all past job orders, parts used, total spent |
| M-008 | As a **motor shop owner**, I want to create estimates/quotations before starting work so that customers can approve costs first | Should | Quote → convert to job order on approval; print quotation |
| M-009 | As a **motor shop owner**, I want to track mechanic productivity (jobs completed, revenue generated) so that I can evaluate performance | Could | Per-mechanic report: jobs, labor hours, revenue, average job time |
| M-010 | As a **motor shop owner**, I want low-stock alerts for critical parts so that I don't run out of oil filters and spark plugs | Should | Configurable threshold per part; dashboard alert; reorder report |
| M-011 | As a **motor shop owner**, I want to record warranty information for parts installed so that I can handle warranty claims | Could | Warranty period per part; expiry tracking; customer notification |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Transaction processing time | < 2 seconds from "Pay" to receipt print | Stopwatch test on ₱15,000 PC |
| Application startup time | < 5 seconds to login screen | Cold start measurement |
| Search response time | < 500ms for product search | With 1,000+ products |
| Report generation | < 3 seconds for daily report | Single day, up to 500 transactions |
| Database size support | Up to 5 years of data (~500MB) | Without performance degradation |
| Concurrent users | Up to 3 simultaneous terminals | Same SQLite database |

### 4.2 Offline Capability

| Requirement | Description |
|-------------|-------------|
| Full offline operation | All POS functions work without internet |
| Local data storage | All data stored in local SQLite database |
| PWA installation | App can be installed from browser and run offline |
| Service worker caching | All static assets cached for offline use |
| No cloud dependency | Zero external API calls required for core functions |
| Optional sync | When online, can sync to remote backup (future feature) |

### 4.3 Printer Support

| Requirement | Description |
|-------------|-------------|
| Thermal printers (ESC/POS) | Support 58mm and 80mm thermal receipt printers |
| Impact/dot-matrix printers | Support standard impact printers via raw text |
| USB connection | Primary connection method |
| Network printers | Support printers shared over network (future) |
| Auto-detection | Detect connected printers and their capabilities |
| Paper cut support | Auto-cut after receipt on supported printers |
| Cash drawer | Open cash drawer command on supported hardware |
| Print queue | Queue print jobs if printer is busy/offline; retry on reconnect |
| Common brands | Tested with: Epson TM series, XPrinter, Bixolon, Star Micronics, generic 58mm/80mm Chinese printers |

### 4.4 Security

| Requirement | Description |
|-------------|-------------|
| PIN authentication | 4–6 digit PIN for quick login |
| Role-based access | Owner, Manager, Cashier roles with granular permissions |
| Session timeout | Auto-lock after configurable idle period (default: 5 min) |
| Audit logging | All create/update/delete operations logged |
| Void/refund authorization | Requires manager/owner PIN |
| Data encryption | SQLite database encrypted at rest (SQLCipher option) |
| No external data transmission | Data never leaves the local machine unless explicitly exported |

### 4.5 Deployment & Infrastructure

| Requirement | Description |
|-------------|-------------|
| Target hardware | Windows 10/11 PC, minimum 4GB RAM, 64GB storage |
| Hardware cost | System runs on PCs costing ₱8,000–₱15,000 |
| Installation | One-click installer (Electron or NSIS) |
| Updates | Manual update via USB or download |
| No server required | No separate database server or cloud service |
| Single-file database | SQLite .db file, easily backed up by copying |
| Backup | One-click backup to USB drive or local folder |

### 4.6 Localization & Language

| Requirement | Description |
|-------------|-------------|
| Languages | Filipino (Tagalog) and English |
| Default language | Filipino, switchable to English |
| Currency | Philippine Peso (₱) |
| Date format | MM/DD/YYYY (Philippine standard) |
| Number format | 1,234.56 |
| Receipt language | Follows system language setting |
| Tax | Philippine VAT (12%), configurable |
| BIR compliance | Receipt format follows BIR requirements (future: CAS/CRM integration) |

### 4.7 Usability

| Requirement | Description |
|-------------|-------------|
| Touch-friendly | Buttons minimum 44×44px for touchscreen support |
| Keyboard shortcuts | F1-Help, F2-Search, F3-New Transaction, F4-Hold, F5-Pay, F9-Print |
| Training time | New cashier operational within 30 minutes |
| Font size | Minimum 14px for readability |
| Color coding | Green (success), Red (error/void), Yellow (warning/hold), Blue (info) |
| Responsive | Works on 1024×768 minimum resolution |
| Error messages | Clear, non-technical, in selected language |

### 4.8 Data Integrity

| Requirement | Description |
|-------------|-------------|
| Transaction atomicity | All-or-nothing transaction processing |
| Auto-save | Cart state saved on every change (survives crash) |
| Database WAL mode | Write-Ahead Logging for crash resistance |
| Daily auto-backup | Automatic daily backup of database file |
| Referential integrity | Foreign keys enforced in SQLite |
| Sequence numbers | Guaranteed sequential, no gaps in transaction numbers |

---

## 5. System Constraints

| Constraint | Description |
|------------|-------------|
| No internet required | Must work 100% offline |
| Low-cost hardware | Must run on ₱8,000–₱15,000 Windows PCs |
| Existing printers | Must support cheap Chinese thermal + old dot-matrix printers |
| Non-technical users | UI must be intuitive for users with basic tech skills |
| Philippine regulations | Receipt format must comply with BIR requirements |
| Single-machine first | V1 targets single-machine deployment; multi-terminal is V2 |
| Plugin extensibility | New business types must be addable without modifying core code |

---

## 6. Out of Scope (V1)

- Mobile app (Android/iOS) — PWA serves this need
- Cloud sync / multi-branch — future version
- Online ordering / e-commerce integration
- Barcode label printing
- Kitchen Display System (KDS)
- Accounting integration (QuickBooks, etc.)
- BIR CAS/CRM certification (planned for V2)
- Inventory purchase order management
- Employee payroll

---

## 7. Glossary

| Term | Definition |
|------|-----------|
| **BIR** | Bureau of Internal Revenue — Philippine tax authority |
| **CAS** | Computerized Accounting System — BIR-accredited POS |
| **ESC/POS** | Epson Standard Code for Point of Sale — thermal printer protocol |
| **GCash** | Philippine e-wallet service by Globe Telecom |
| **Maya** | Philippine e-wallet service (formerly PayMaya) |
| **PWA** | Progressive Web App — web app installable like native app |
| **Utang** | Filipino term for credit/debt |
| **Z-Report** | End-of-day summary report with cash reconciliation |
| **Claim Stub** | Receipt given to laundry customer for order pickup |
| **WAL** | Write-Ahead Logging — SQLite crash-resistant mode |
