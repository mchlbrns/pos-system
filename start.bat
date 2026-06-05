@echo off
title POS System Quick Launcher
color 0B
cls
echo ==========================================================
echo ... Starting POS System ...
echo =========================================================
echo.
echo Please keep this window open while using the POS.
echo.

cd %~dp0

:: Start Backend
echo Starting backend server...
start "POS Backend Server" /min cmd /c "cd backend && npm start"

:: Wait a brief moment for backend to initialize
timeout /t 2 /nobreak >nul

:: Start Frontend dev server
echo Starting cashier interface...
start "POS Cashier App" /min cmd /c "cd frontend && npm run dev"

:: Wait for frontend to spin up
timeout /t 3 /nobreak >nul

:: Open browser
echo Opening your browser to the checkout screen...
start http://localhost:5173

echo.
echo ==========================================================
echo   [SUCCESS] POS System is now running!
echo ==========================================================
echo.
echo - To use the POS, go to http://localhost:5173 in your browser.
echo - When you are finished, you can close this window.
echo.
pause
exit /b 0
