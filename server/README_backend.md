# POS System Backend — Node.js & SQLite

This is the backend server for the Universal POS system. It handles database initialization, user authentication, inventory management, checkout transactions, local cloud syncing, dynamic plugin lifecycle hooks, and asynchronous printer queuing.

## Requirements
- Node.js (v18 or higher)
- SQLite3 (handled natively by npm installation)

## Setup and Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Environment:
   Copy `.env.example` to `.env` and configure:
   - `PORT`: API server port (default 3000)
   - `JWT_SECRET`: Secret key for JWT hashing
   - `DB_PATH`: Path to the SQLite database file (e.g. `./data/pos.db`)

3. Run Tests:
   Execute unit tests for VAT calculation and checkout logic:
   ```bash
   npm test
   ```

4. Run Server:
   - **Development**:
     ```bash
     npm run dev
     ```
   - **Production**:
     ```bash
     npm start
     ```

## Printer Queue Worker
The backend launches a background worker thread that polls the database `printer_jobs` table every 5 seconds. If jobs are queued, it sends the print payload to the configured hardware device using the ESC/POS interface. In the absence of physical printers, receipts are logged as text output under `server/data/virtual_printer.txt`.
