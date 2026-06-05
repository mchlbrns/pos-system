# Installation Guide — Universal POS System

This guide outlines how to deploy the POS system locally on a Windows PC or terminal.

## System Requirements
- OS: Windows 10 or 11 (64-bit)
- RAM: 4GB minimum (8GB recommended)
- Disk: 1GB available space
- Software: Node.js v18+ (https://nodejs.org/)

## Step-by-Step Local Deployment

1. **Install Node.js**
   - Download the LTS installer from nodejs.org and complete installation.
   - Verify installation in Terminal: `node -v`

2. **Extract Project Bundle**
   - Place project files in your preferred local folder (e.g. `C:\pos-system`).

3. **Run One-Click Installer**
   - Open Terminal or command prompt, navigate to folder, and execute the installation batch script:
     ```cmd
     scripts\install.bat
     ```
   - This script runs `npm install` for backend, frontend, and printer systems, creates SQLite database config, initializes schema, and seeds default values.

4. **Launch POS App**
   - Run the startup script to host the backend and Vite server locally:
     ```cmd
     scripts\start.bat
     ```
   - Once running, the cashier UI is accessible at: **http://localhost:5173**

## Hardware USB Printer Mapping
1. Download **Zadig** from https://zadig.akeo.ie/
2. plug in your thermal printer via USB and turn it on.
3. Open Zadig, click *Options -> List All Devices*.
4. Select your USB Printer (often named USB Printing Support or POS-58/80).
5. Set target driver to **WinUSB** and click **Replace Driver**.
