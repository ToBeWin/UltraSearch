@echo off
mkdir icons 2>nul
copy /Y logo.png icons\icon.ico >nul
echo Created temporary icon file for development.
echo Note: For production, please convert your PNG to a proper ICO file. 