# POS System Cashier Dashboard — React PWA

This is the front-end application built with Vite + React. It works as an offline-capable Progressive Web App (PWA) using IndexedDB to store offline cashier logs and sync checkout details once connection is restored.

## Setup Instructions

1. Install Dependencies:
   ```bash
   npm install
   ```

2. Configure Environment:
   Create a `.env` file in this folder:
   - `VITE_API_URL`: Base URL of the backend (e.g. `http://localhost:3000/api`)

3. Run Development Server:
   ```bash
   npm run dev
   ```
   The application will run on http://localhost:5173.

4. Build for Production:
   ```bash
   npm run build
   ```
   This generates static deployment files with PWA assets under the `dist/` folder.
