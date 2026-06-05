# POS System Redesign Plan

This plan details the architectural and usability enhancements designed to solve the issues listed in `CRITIQUE.md`.

## 1. Folder & Structural Realignment
- **Renaming directories:** Move `/server` → `/backend` and `/client` → `/frontend`.
- **Centralizing Configurations:** Put setup and run scripts in the root directory.

```
/pos-system
  ├── backend/               # Refactored SQLite, routes, and models
  │     ├── database/
  │     ├── models/
  │     ├── routes/
  │     ├── plugins/         # Folder containing business JSON configurations
  │     ├── utils/
  │     └── app.js
  ├── frontend/              # Clean SPA layout
  │     ├── src/
  │     └── package.json
  ├── install.bat            # Non-technical installation script
  ├── start.bat              # Non-technical run script
  ├── README.md              # Simplified user manual
  ├── MANUAL_SIMPLE.md       # 10-words-per-step visual user guide
  ├── TROUBLESHOOTING.md     # Layman-friendly recovery guide
  └── package.bat            # Installer packager script
```

## 2. Zero-Configuration Windows Onboarding
- **`install.bat`:** Detects Node.js and npm. Auto-installs local modules in both `/backend` and `/frontend` concurrently. Seeds the SQLite database file `pos.db` with demo water station items.
- **`start.bat`:** Starts backend and frontend web servers in a single window (or side-by-side terminal windows with informative headers) and opens `http://localhost:5173` automatically.
- **`README.md`:** Simplified to absolute instructions: double-click to install, double-click to start, and where to look.

## 3. SQLite Database & Backend Simplification
- Use a single database file `backend/data/pos.db` loaded dynamically.
- Replace dynamic Javascript loading code with lightweight, JSON-defined plugins (`backend/plugins/waterstation.json`, etc.) that specify units of measure, custom cashier inputs, and receipt print layouts.
- Route endpoints will be versioned under `/api/v1/` and return consistent `{ success, data, error }` envelopes.
- Add an application-wide error boundary and simple logger writing stack traces to `backend/logs/error.log` instead of cluttering the console.

## 4. Rock-Solid Offline Printer Subsystem
- **Setup Wizard (`/setup/printer`):** Lists detected USB/network printers. Lets users test print receipts and set default printers.
- **Offline Fallback Queue:** If a print job fails, the backend logs it to `backend/data/pending_prints.json`, displays a warning badge in the frontend, and automatically retries every 30 seconds.

## 5. Touch-Optimized Cashier UI & Admin Panel
- **Single-Screen Sales View:** Left-hand dynamic product grids with large, touch-friendly buttons; right-hand checkout receipt cart.
- **Payment Modals:** Large interactive keypads calculating change on-the-fly, quick payments (Cash,GCash,PayMaya,Card), and auto-printing.
- **PIN-Protected Admin Portal:** Secures catalogs, configurations, database backups, and printer settings behind a simple code (`1234` by default).
