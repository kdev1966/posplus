@echo off
REM POSPlus Windows Build Script (CMD)
REM Execute this script on Windows 10 with Administrator privileges

echo === POSPlus Windows Build Script ===
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js not found. Download from https://nodejs.org/
    exit /b 1
)

echo Node version:
node --version
echo NPM version:
npm --version

echo.
echo Cleaning old builds...
if exist dist rmdir /s /q dist
if exist release rmdir /s /q release
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo.
echo Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to install dependencies
    exit /b 1
)

echo.
echo Building application...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ERROR: Build failed
    exit /b 1
)

echo.
echo Creating Windows portable package...
call npm run package:win
if %ERRORLEVEL% neq 0 (
    echo ERROR: Packaging failed
    exit /b 1
)

echo.
echo === Build Complete ===
echo Windows package is in: .\release\
dir release\*.exe 2>nul || dir release\ | findstr /i ".exe portable"

pause
