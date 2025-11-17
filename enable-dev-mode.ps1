# Script to enable Windows Developer Mode
# Run this in PowerShell as Administrator

Write-Host "=== Enable Windows Developer Mode ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host ""
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "Enabling Developer Mode..." -ForegroundColor Yellow

try {
    # Enable Developer Mode
    reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" /t REG_DWORD /f /v "AllowDevelopmentWithoutDevLicense" /d "1"
    
    Write-Host ""
    Write-Host "SUCCESS: Developer Mode enabled!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Now you can run: npm run package:win" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to enable Developer Mode" -ForegroundColor Red
    Write-Host "Please enable it manually:" -ForegroundColor Yellow
    Write-Host "1. Open Settings (Windows + I)" -ForegroundColor White
    Write-Host "2. Go to Update & Security -> For developers" -ForegroundColor White
    Write-Host "3. Enable 'Developer Mode'" -ForegroundColor White
}

pause
