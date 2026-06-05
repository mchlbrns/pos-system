@echo off
echo Updating POS system codebase...
cd %~dp0\..
git pull
call scripts\install.bat
echo System updated successfully.
pause
