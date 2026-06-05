# Test Environment Setup Guide

> Paano i-setup ang test environment para sa Universal POS System.
> Sundan ang mga steps na ito para ma-run ang automated at manual tests.

---

## 📋 Prerequisites

### Required Software

| Software | Minimum Version | Download Link |
|---|---|---|
| **Node.js** | v18.0.0+ | https://nodejs.org/en/download/ |
| **npm** | v9.0.0+ | Kasama na sa Node.js |
| **Git** | v2.30+ | https://git-scm.com/download/win |
| **Google Chrome** | Latest | https://www.google.com/chrome/ |

### Hardware Requirements (for full testing)

| Component | Requirement |
|---|---|
| **PC/Laptop** | Windows 10/11, 4GB RAM minimum |
| **Thermal Printer (58mm)** | Xprinter XP-58IIH or similar (USB) |
| **Thermal Printer (80mm)** | Epson TM-T82III or similar (optional) |
| **Cash Drawer** | RJ11-connected via printer (optional) |
| **Barcode Scanner** | USB HID mode (optional) |
| **Tablet** | Any tablet with Chrome browser (optional, for PWA testing) |

---

## 🚀 Step-by-Step Setup

### Step 1: Check Node.js Installation

Buksan ang Command Prompt o PowerShell:

```bash
node --version
# Expected: v18.x.x or higher

npm --version
# Expected: v9.x.x or higher
```

Kung wala pa ang Node.js, i-download sa https://nodejs.org at i-install (LTS version).

### Step 2: Clone or Extract the Project

```bash
# If using Git:
git clone <repository-url> pos-system
cd pos-system

# If from ZIP file:
# Extract universal_pos_v1.0.zip to a folder
# Open terminal in that folder
cd pos-system
```

### Step 3: Install Backend Dependencies

```bash
cd server
npm install
```

This will install Express, SQLite (better-sqlite3), and all backend dependencies.

> **Note:** SQLite is bundled — walang kailangan i-install na separate database server!

### Step 4: Setup Environment Variables

```bash
# Still in /server directory
copy .env.example .env
```

Edit `.env` file with these defaults (okay na for testing):

```env
PORT=3000
NODE_ENV=development
DB_PATH=./data/pos.db
JWT_SECRET=test-secret-key-change-in-production
LICENSE_KEY=TEST-MODE-0000-0000
```

### Step 5: Initialize the Database

```bash
# Still in /server directory
npm run db:init
# or
node src/database/init.js
```

This creates the SQLite database and seeds it with sample data:
- Admin user (username: `admin`, password: `admin123`)
- Sample products for each business type
- Default settings

### Step 6: Install Frontend Dependencies

```bash
cd ../client
npm install
```

### Step 7: Start the Backend Server

Open a **new terminal window**:

```bash
cd server
npm run dev
# Server runs on http://localhost:3000
```

Verify it's running:
```bash
curl http://localhost:3000/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Step 8: Start the Frontend Dev Server

Open **another terminal window**:

```bash
cd client
npm run dev
# Frontend runs on http://localhost:5173
```

Open Chrome and go to: **http://localhost:5173**

You should see the POS login screen.

### Step 9: Install E2E Test Dependencies

```bash
cd e2e-tests
npm install
npx playwright install chromium
```

---

## 🧪 Running Automated Tests

### Run All Tests

```bash
cd e2e-tests
npm test
```

### Run Specific Test Suite

```bash
# Checkout flow test
npm run test:checkout

# Plugin switching test
npm run test:plugin

# Offline sync test
npm run test:offline

# Product management test
npm run test:products
```

### Run Tests with Browser Visible (Headed Mode)

```bash
npm run test:headed
```

### Run Tests with Playwright UI

```bash
npm run test:ui
```

### View Test Report

After running tests:

```bash
npm run test:report
```

This opens an HTML report in your browser showing all test results.

---

## 📊 Test Results

Test results are saved in:
- **HTML Report:** `e2e-tests/playwright-report/index.html`
- **Screenshots (on failure):** `e2e-tests/test-results/`
- **Videos (on retry):** `e2e-tests/test-results/`
- **Traces:** `e2e-tests/test-results/` (viewable at https://trace.playwright.dev)

---

## 🔧 Troubleshooting

### "Cannot find module" Error
```bash
# Re-install dependencies
cd server && npm install
cd ../client && npm install
cd ../e2e-tests && npm install
```

### Port Already in Use
```bash
# Find process using port 3000
netstat -ano | findstr :3000
# Kill the process
taskkill /PID <PID_NUMBER> /F
```

### Database Errors
```bash
# Reset the database
cd server
del data\pos.db
npm run db:init
```

### Playwright Browser Not Found
```bash
cd e2e-tests
npx playwright install chromium
```

### Tests Timing Out
- Make sure both backend (port 3000) and frontend (port 5173) are running
- Check that the database is initialized with seed data
- Try running in headed mode to see what's happening: `npm run test:headed`

### Printer Not Detected
- Check USB connection
- Install printer driver from manufacturer's website
- On Windows: Settings → Devices → Printers & Scanners → check if printer is listed
- Try: `wmic printer list brief` in Command Prompt

---

## 📁 Project Structure for Testers

```
pos-system/
├── server/               # Backend (Express + SQLite)
│   ├── src/
│   │   ├── routes/       # API endpoints to test
│   │   ├── database/     # DB init and migrations
│   │   └── middleware/    # Auth, license validation
│   └── data/             # SQLite database file
├── client/               # Frontend (React + Vite PWA)
│   ├── src/
│   │   ├── pages/        # Page components (POS, Products, etc.)
│   │   └── components/   # Reusable UI components
│   └── public/           # Static assets
├── e2e-tests/            # ← You are here
│   ├── tests/            # Test spec files
│   ├── playwright.config.js
│   └── package.json
├── plugins/              # Business type plugins
│   ├── waterstation/
│   ├── laundry/
│   └── motorepair/
└── printer-drivers/      # ESC/POS printer drivers
```

---

## 🔐 Test Accounts

| Role | Username | Password | Permissions |
|---|---|---|---|
| Admin | `admin` | `admin123` | Full access |
| Cashier | `cashier` | `cashier123` | POS, view transactions |
| Manager | `manager` | `manager123` | POS, products, reports |

> ⚠️ **PALITAN ANG MGA PASSWORDS NA ITO BAGO MAG-DEPLOY SA PRODUCTION!**
