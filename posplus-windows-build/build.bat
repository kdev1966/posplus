@echo off
echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo Failed to install dependencies
    pause
    exit /b 1
)

echo Building POSPlus for Windows...
call npm run package:win
if errorlevel 1 (
    echo Build failed
    pause
    exit /b 1
)

echo Build complete! Check the release folder.
pause
