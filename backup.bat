@echo off
title POS Database Backup Utility
color 09
cls
echo ==========================================================
echo ... Database Backup Wizard ...
==========================================================
echo.
echo Backing up your shop data...
echo.

cd %~dp0

:: Create timestamp variable
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (set mytime=%%a%%b)
set timestamp=%mydate%_%mytime%

:: Ensure backup directory exists
if not exist "backups" mkdir backups

:: Verify database file exists before backup
if exist "backend\data\pos.db" (
    copy "backend\data\pos.db" "backups\pos_backup_%timestamp%.db" >nul
    echo ==========================================================
    echo   [SUCCESS] Backup saved: backups\pos_backup_%timestamp%.db
    echo ==========================================================
) else (
    echo [ERROR] Database file not found at backend\data\pos.db!
    echo Run install.bat first to create the database.
)
echo.
pause
exit /b 0
