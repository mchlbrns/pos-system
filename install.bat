@echo off
title POS System Setup Wizard
color 0A
cls
echo ==========================================================
echo ... Setup Wizard for Your POS System ...
echo ==========================================================
echo.
echo Checking if Node.js is ready on your computer...
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js was not found!
    echo.
    echo Please follow these simple steps to install it:
    echo 1. Go to https://nodejs.org/
    echo 2. Download the Recommended version (LTS) for Windows.
    echo 3. Install it using the default settings.
    echo 4. Restart your computer and double-click this file again.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js is ready.
echo.
echo Installing internal programs. Please wait, this might take a minute...
echo.

:: Initialize directories
cd %~dp0

:: Install Backend Dependencies
if exist "backend" (
    echo [1/3] Preparing the backend system...
    cd backend
    call npm install --no-audit --no-fund
    cd ..
)

:: Install Frontend Dependencies
if exist "frontend" (
    echo [2/3] Preparing the checkout application...
    cd frontend
    call npm install --no-audit --no-fund
    cd ..
)

:: Environment config
echo [3/3] Setting up configuration files...
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        copy backend\.env.example backend\.env >nul
    ) else (
        echo PORT=3000 > backend\.env
        echo DB_PATH=./data/pos.db >> backend\.env
        echo BUSINESS_TYPE=waterstation >> backend\.env
    )
)

:: Run seeding
echo Seeding water station products for first use...
node backend/database/seeds.js

echo.
echo ==========================================================
echo   [SUCCESS] Setup is complete and your shop is ready!
echo ==========================================================
echo.
echo NEXT STEP:
echo Double-click the "start.bat" file in this folder to start.
echo.
pause
exit /b 0
