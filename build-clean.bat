@echo off
echo ============================================
echo POSPlus - Clean Build for Windows
echo ============================================
echo.

echo [1] Cleaning dist folder...
if exist "dist" (
    echo Removing dist folder...
    rd /s /q dist
    echo ✓ dist folder removed
) else (
    echo ✓ dist folder does not exist
)
echo.

echo [2] Building application...
call npm run build
if errorlevel 1 (
    echo ✗ Build failed!
    pause
    exit /b 1
)
echo.

echo ============================================
echo Build complete! dist folder created.
echo ============================================
echo.
echo To test the app, run: npx electron .
echo To package the app, run: npm run package:win
echo.
pause
