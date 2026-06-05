@echo off
echo ==============================================
echo Backing up POS SQLite Database
echo ==============================================
set BACKUP_DIR=%~dp0\..\backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

set FILE_NAME=pos_backup_%date:~10,4%%date:~4,2%%date:~7,2%.db
copy "%~dp0\..\server\data\pos.db" "%BACKUP_DIR%\%FILE_NAME%"

echo Backup saved: backups/%FILE_NAME%
pause
