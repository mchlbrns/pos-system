# 📦 Shop Deployment & Setup Guide

This document describes how to deploy the POS package (`pos_v2.zip`) onto a new Windows PC at a shop.

---

## 🛠️ Step-by-Step Deployment Flow

```
  [Developer PC]
        │
        ▼
  Run package.bat  ──► Creates "pos_v2.zip"
        │
        ▼
  Copy pos_v2.zip to USB Drive
        │
        ▼
  [Shop PC (Windows 10/11)]
        │
        ▼
  Extract pos_v2.zip
        │
        ▼
  Double-click install.bat (Installs Node modules, DB seeds)
        │
        ▼
  Double-click start.bat (Launches POS register in Chrome)
```

---

## 📋 Detailed Actions

### Step 1: Copy to USB
Transfer the generated `pos_v2.zip` from your development computer onto a USB flash drive.

### Step 2: Unzip on Shop PC
1. Plug the USB flash drive into the shop computer.
2. Drag `pos_v2.zip` to the shop computer's Desktop or Documents folder.
3. Right-click the zip file and select **Extract All...**, then click **Extract**.

### Step 3: Run the Setup Wizard
1. Double-click the **`install.bat`** file inside the extracted folder.
2. The installer checks if Node.js is ready. If not, it prompts you to install it.
3. The script automatically installs local program dependencies and seeds standard products.

### Step 4: Launch the Register
1. Double-click **`start.bat`**.
2. Keep the system window minimized.
3. Chrome will open automatically, allowing you to log in with username `admin` and password `admin123`.
