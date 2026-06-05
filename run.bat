@echo off
title Universal POS - Quick Launch
echo ===================================================
echo   🇵🇭 Universal POS System (One-Click Launch) 🇵🇭
echo ===================================================
echo.

cd %~dp0

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please download and install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Auto-install dependencies if node_modules is missing
if not exist "server\node_modules\" (
    echo [INFO] First-time setup detected. Installing server dependencies...
    cd server
    call npm install
    cd ..
)

if not exist "client\node_modules\" (
    echo [INFO] First-time setup detected. Installing client dependencies...
    cd client
    call npm install
    cd ..
)

if not exist "printer-drivers\node_modules\" (
    echo [INFO] First-time setup detected. Installing printer-driver dependencies...
    cd printer-drivers
    call npm install
    cd ..
)

:: Setup environment file
if not exist "server\.env" (
    echo [INFO] Creating default database configurations...
    copy server\.env.example server\.env >nul
)

:: Initialize SQLite database
if not exist "server\data\pos.db" (
    echo [INFO] Initializing SQLite Database and schema...
    node server/src/database/init.js
)
echo [INFO] Running database seeding...
node server/src/database/seeds.js

echo.
echo ===================================================
echo   [SUCCESS] System ready. Starting local servers...
echo   Backend URL:  http://localhost:3000
echo   Cashier App:  http://localhost:5173
echo ===================================================
echo.

:: Launch Backend
start "Universal POS Backend" cmd /k "cd server && npm start"

:: Launch Frontend
start "Universal POS Cashier App" cmd /k "cd client && npm run dev"

echo.
echo Opening Google Chrome to the cashier page...
timeout /t 3 /nobreak >nul
start http://localhost:5173

exit
