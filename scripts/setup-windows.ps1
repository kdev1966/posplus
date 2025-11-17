# POSPlus - Windows Development Environment Setup Script
# Run this script in PowerShell as Administrator

#Requires -RunAsAdministrator

param(
    [switch]$SkipNodeInstall,
    [switch]$SkipVSCodeExtensions
)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  POSPlus - Windows Development Environment Setup" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Helper functions
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Test-CommandExists {
    param([string]$Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# 1. Check Windows version
$osInfo = Get-CimInstance Win32_OperatingSystem
Write-Status "Windows Version: $($osInfo.Caption) $($osInfo.Version)"

if ([version]$osInfo.Version -lt [version]"10.0") {
    Write-Error "Windows 10 or higher is required"
    exit 1
}

# 2. Install Chocolatey (package manager)
if (-not (Test-CommandExists "choco")) {
    Write-Status "Installing Chocolatey..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    Write-Success "Chocolatey installed"

    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
} else {
    Write-Success "Chocolatey is already installed"
}

# 3. Install Node.js
if (-not $SkipNodeInstall) {
    if (-not (Test-CommandExists "node")) {
        Write-Status "Installing Node.js..."
        choco install nodejs-lts -y
        Write-Success "Node.js installed"

        # Refresh environment
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } else {
        $nodeVersion = node -v
        Write-Success "Node.js is already installed: $nodeVersion"
    }
}

# Verify npm
if (-not (Test-CommandExists "npm")) {
    Write-Error "npm not found. Please restart PowerShell and run script again"
    exit 1
}

$npmVersion = npm -v
Write-Success "npm version: $npmVersion"

# 4. Install Visual Studio Build Tools (required for native modules)
Write-Status "Checking for Visual Studio Build Tools..."

# Check if build tools are installed
$vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$hasBuildTools = $false

if (Test-Path $vsWhere) {
    $vsInstances = & $vsWhere -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if ($vsInstances) {
        $hasBuildTools = $true
    }
}

if (-not $hasBuildTools) {
    Write-Warning "Visual Studio Build Tools not found. Installing..."
    choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive --norestart" -y
    Write-Success "Visual Studio Build Tools installed"
} else {
    Write-Success "Visual Studio Build Tools already installed"
}

# 5. Install Python (required for node-gyp)
if (-not (Test-CommandExists "python")) {
    Write-Status "Installing Python..."
    choco install python311 -y
    Write-Success "Python installed"

    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
} else {
    $pythonVersion = python --version
    Write-Success "Python is already installed: $pythonVersion"
}

# 6. Install Git
if (-not (Test-CommandExists "git")) {
    Write-Status "Installing Git..."
    choco install git -y
    Write-Success "Git installed"
} else {
    $gitVersion = git --version
    Write-Success "Git is already installed: $gitVersion"
}

# 7. Configure npm for Windows
Write-Status "Configuring npm for Windows..."
npm config set msvs_version 2022
npm config set python python
Write-Success "npm configured"

# 8. Install VSCode extensions (optional)
if (-not $SkipVSCodeExtensions -and (Test-CommandExists "code")) {
    Write-Status "Installing recommended VSCode extensions..."

    $extensions = @(
        "ms-vscode.vscode-typescript-next",
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "bradlc.vscode-tailwindcss",
        "dsznajder.es7-react-js-snippets",
        "formulahendry.auto-rename-tag",
        "PKief.material-icon-theme",
        "eamodio.gitlens"
    )

    foreach ($ext in $extensions) {
        $installed = code --list-extensions | Select-String $ext
        if (-not $installed) {
            code --install-extension $ext --force
            Write-Success "Installed extension: $ext"
        } else {
            Write-Success "Extension $ext already installed"
        }
    }
} else {
    Write-Warning "VSCode not found or skipped. Install extensions manually."
}

# 9. Navigate to project directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Split-Path -Parent $scriptPath
Set-Location $projectDir
Write-Status "Working in: $projectDir"

# 10. Clean previous installations
Write-Status "Cleaning previous installations..."
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules"
}
if (Test-Path "package-lock.json") {
    Remove-Item -Force "package-lock.json"
}
Write-Success "Cleaned node_modules and package-lock.json"

# 11. Install project dependencies
Write-Status "Installing project dependencies..."
npm install
Write-Success "Dependencies installed successfully"

# 12. Rebuild native modules for Electron
Write-Status "Rebuilding native modules for Electron..."
npm run postinstall
Write-Success "Native modules rebuilt successfully"

# 13. Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Status "Creating .env file..."
    @"
# POSPlus Environment Configuration
NODE_ENV=development
VITE_APP_VERSION=1.0.0
"@ | Out-File -Encoding utf8 ".env"
    Write-Success ".env file created"
}

# 14. Test the build
Write-Status "Testing build process..."
npm run build:electron
Write-Success "Build test passed"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Success "Your Windows development environment is ready!"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open the project in VSCode: code ."
Write-Host "  2. Start development server: npm run dev"
Write-Host "  3. Build for production: npm run build"
Write-Host "  4. Package for Windows: npm run package:win"
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  npm run dev           - Start development with hot reload"
Write-Host "  npm run build         - Build for production"
Write-Host "  npm run test          - Run tests"
Write-Host "  npm run lint          - Check code quality"
Write-Host "  npm run format        - Format code with Prettier"
Write-Host "  npm run package:win   - Create Windows installer"
Write-Host ""
Write-Warning "If you encounter build issues, restart your terminal to refresh environment variables"
Write-Host ""
