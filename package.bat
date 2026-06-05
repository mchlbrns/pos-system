@echo off
title POS System Installer Packager
color 0C
cls
echo ==========================================================
echo ... Creating Deployable Zip Package ...
==========================================================
echo.
echo Packaging the system components. Please wait...
echo.

cd %~dp0

:: Remove old zip if it exists
if exist "pos_v2.zip" del /q "pos_v2.zip"

:: Use PowerShell to zip all necessary files and folders
powershell -Command "Compress-Archive -Path backend, frontend, install.bat, start.bat, backup.bat, README.md, MANUAL_SIMPLE.md, TROUBLESHOOTING.md, VIDEO_SCRIPT.md -DestinationPath pos_v2.zip -Force"

if %errorlevel% equ 0 (
    echo.
    echo ==========================================================
    echo   [SUCCESS] Packaged successfully into: pos_v2.zip
    echo ==========================================================
) else (
    echo.
    echo [ERROR] Failed to package files. Please check directory permissions.
)
echo.
pause
exit /b %errorlevel%
