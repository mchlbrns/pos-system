@echo off
echo ==============================================
echo Installing Universal POS System dependencies
echo ==============================================

cd %~dp0\..

echo [1/4] Installing backend dependencies...
cd server
call npm install
cd ..

echo [2/4] Installing frontend dependencies...
cd client
call npm install
cd ..

echo [3/4] Installing printer-driver dependencies...
cd printer-drivers
call npm install
cd ..

echo [4/4] Setting up environment configurations...
if not exist server\.env (
    copy server\.env.example server\.env
)

echo Initializing database schema...
node server/src/database/init.js
echo Seeding database with default values...
node server/src/database/seeds.js

echo ==============================================
echo Installation complete! Run scripts/start.bat to start.
echo ==============================================
pause
