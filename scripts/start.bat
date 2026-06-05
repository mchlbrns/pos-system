@echo off
echo Starting Universal POS System local servers...
cd %~dp0\..

start "POS Backend Server" cmd /k "cd server && npm start"
start "POS Cashier Front-end" cmd /k "cd client && npm run dev"

echo POS System launched. Go to http://localhost:5173 in Google Chrome.
