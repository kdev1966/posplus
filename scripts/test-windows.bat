@echo off
echo ============================================
echo POSPlus Windows Diagnostic Test
echo ============================================
echo.

echo [1] Checking Node.js version...
node --version
echo.

echo [2] Checking npm version...
npm --version
echo.

echo [3] Checking if dist folder exists...
if exist "dist" (
    echo ✓ dist folder exists
) else (
    echo ✗ dist folder NOT found
    goto :end
)
echo.

echo [4] Checking dist structure...
dir /B dist
echo.

echo [5] Checking if renderer files exist...
if exist "dist\renderer\index.html" (
    echo ✓ index.html exists
    type dist\renderer\index.html
) else (
    echo ✗ index.html NOT found
)
echo.

echo [6] Checking if assets exist...
if exist "dist\renderer\assets" (
    echo ✓ assets folder exists
    dir /B dist\renderer\assets
) else (
    echo ✗ assets folder NOT found
)
echo.

echo [7] Checking main process...
if exist "dist\main\main-process\main.js" (
    echo ✓ main.js exists
) else (
    echo ✗ main.js NOT found
)
echo.

echo [8] Testing Electron...
echo Starting Electron in 3 seconds...
echo Press Ctrl+C to cancel
timeout /t 3
npx electron .

:end
echo.
echo ============================================
echo Diagnostic complete
echo ============================================
pause
