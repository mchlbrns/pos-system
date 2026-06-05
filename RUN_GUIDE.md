# How to Run the Universal POS System

This guide explains how to install and start the Universal POS system on a Windows development machine or offline terminal.

---

## Method 1: Automatic One-Click Launch (Recommended)

We have created an automated script in the root directory that checks for prerequisites, installs all backend/frontend dependencies, creates database tables, and launches the application.

1. Locate the **`run.bat`** file in the root of the project folder:
   - Path: `C:\Users\Geloo\Downloads\pos-system\run.bat`
2. **Double-click** `run.bat` (or open Command Prompt and execute `run.bat`).
3. The script will automatically:
   - Check if Node.js is installed.
   - Run `npm install` inside `/server`, `/client`, and `/printer-drivers` (if not already installed).
   - Generate the local SQLite database.
   - Boot both local servers.
   - Open your browser to the cashier login page: **http://localhost:5173**

---

## Method 2: Manual Step-by-Step Installation

If you prefer to run the commands manually or troubleshoot execution issues:

### Step 1: Install Dependencies
Open your Command Prompt (CMD) or PowerShell and run:
```cmd
:: 1. Install Backend Express dependencies
cd server
npm install
cd ..

:: 2. Install Frontend React dependencies
cd client
npm install
cd ..

:: 3. Install Printer drivers dependencies
cd printer-drivers
npm install
cd ..
```

### Step 2: Initialize Database
Generate the standalone SQLite database file:
```cmd
:: Copy environment variables
copy server\.env.example server\.env

:: Runs schema initialization script
node server/src/database/init.js
```

### Step 3: Run the Servers
Open two terminal windows:

* **Terminal 1 (Backend API)**:
  ```cmd
  cd server
  npm start
  ```
  *(The backend launches on http://localhost:3000)*

* **Terminal 2 (Frontend Cashier UI)**:
  ```cmd
  cd client
  npm run dev
  ```
  *(Vite hosts the frontend on http://localhost:5173)*

Open Google Chrome and navigate to **http://localhost:5173**.

---

## Login Credentials

Use the default cashier account to sign in:
* **Username**: `admin`
* **Password**: `admin123`
