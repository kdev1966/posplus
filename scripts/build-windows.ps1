# POSPlus - Windows Build & Packaging Script
# Creates NSIS installer for Windows distribution

param(
    [switch]$Clean,
    [switch]$SkipBuild,
    [switch]$Portable,
    [switch]$NSIS,
    [switch]$Both
)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  POSPlus - Windows Build & Packaging" -ForegroundColor Cyan
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

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Navigate to project directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Split-Path -Parent $scriptPath
Set-Location $projectDir
Write-Status "Working in: $projectDir"

# 1. Clean build directories
if ($Clean) {
    Write-Status "Cleaning build directories..."

    if (Test-Path "dist") {
        Remove-Item -Recurse -Force "dist"
        Write-Success "Cleaned dist directory"
    }

    if (Test-Path "release") {
        Remove-Item -Recurse -Force "release"
        Write-Success "Cleaned release directory"
    }
}

# 2. Verify dependencies
Write-Status "Verifying dependencies..."
if (-not (Test-Path "node_modules")) {
    Write-Status "Installing dependencies..."
    npm install
}

# 3. Build the application
if (-not $SkipBuild) {
    Write-Status "Building application..."

    # Build Vite (renderer)
    Write-Status "Building renderer process (Vite)..."
    npm run build:vite
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Vite build failed"
        exit 1
    }
    Write-Success "Renderer build complete"

    # Build Electron (main process)
    Write-Status "Building main process (Electron)..."
    npm run build:electron
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Electron build failed"
        exit 1
    }
    Write-Success "Main process build complete"
}

# 4. Verify migrations are copied
Write-Status "Verifying migrations..."
$migrationsPath = "dist/main/main-process/services/database/migrations"
if (-not (Test-Path $migrationsPath)) {
    Write-Status "Creating migrations directory..."
    New-Item -ItemType Directory -Force -Path $migrationsPath | Out-Null
}

# Copy migrations
$sourceMigrations = "src/main-process/services/database/migrations/*.sql"
Copy-Item $sourceMigrations $migrationsPath -Force
Write-Success "Migrations copied to dist"

# 5. Create Windows-specific electron-builder config
Write-Status "Creating Windows-optimized electron-builder config..."

$electronBuilderConfig = @{
    appId = "com.posplus.app"
    productName = "POSPlus"
    copyright = "Copyright 2024 POSPlus Team"

    directories = @{
        output = "release"
        buildResources = "build"
    }

    files = @(
        "dist/**/*",
        "package.json",
        "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
        "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
        "!**/node_modules/*.d.ts",
        "!**/node_modules/.bin"
    )

    # Windows-specific configuration
    win = @{
        target = @()
        icon = "build/icon.ico"
        signingHashAlgorithms = @()
        signDlls = $false
        rfc3161TimeStampServer = $null

        # Disable code signing (can be enabled later with proper certificate)
        sign = $null

        # NPM rebuild configuration
        npmRebuild = $true
        nodeGypRebuild = $false
    }

    # NSIS installer configuration
    nsis = @{
        oneClick = $false
        allowToChangeInstallationDirectory = $true
        createDesktopShortcut = $true
        createStartMenuShortcut = $true
        shortcutName = "POSPlus"
        uninstallDisplayName = "POSPlus"
        installerIcon = "build/icon.ico"
        uninstallerIcon = "build/icon.ico"
        installerHeaderIcon = "build/icon.ico"
        license = "LICENSE"
        perMachine = $false
        allowElevation = $true
        runAfterFinish = $true
        deleteAppDataOnUninstall = $false
    }

    # Portable configuration
    portable = @{
        artifactName = "POSPlus-Portable-\${version}.exe"
    }

    # Asset management
    asarUnpack = @(
        "**/*.node",
        "**/better-sqlite3/**",
        "**/usb/**",
        "**/canvas/**"
    )

    # Extra resources (migrations, assets)
    extraResources = @(
        @{
            from = "assets/"
            to = "assets/"
            filter = @("**/*")
        }
    )
}

# Determine build target
if ($Portable -or $Both) {
    $electronBuilderConfig.win.target += @{
        target = "portable"
        arch = @("x64")
    }
}

if ($NSIS -or $Both -or (-not $Portable -and -not $NSIS -and -not $Both)) {
    $electronBuilderConfig.win.target += @{
        target = "nsis"
        arch = @("x64")
    }
}

# Write config to JSON
$configPath = "electron-builder-windows.json"
$electronBuilderConfig | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 $configPath
Write-Success "Windows electron-builder config created"

# 6. Package the application
Write-Status "Packaging application for Windows..."
npx electron-builder --win --config $configPath

if ($LASTEXITCODE -ne 0) {
    Write-Error "Packaging failed"
    exit 1
}

Write-Success "Packaging complete!"

# 7. Show results
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Build Complete!" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$releaseDir = "release"
if (Test-Path $releaseDir) {
    Write-Host "Generated installers:" -ForegroundColor Green
    Get-ChildItem $releaseDir -Include *.exe,*.msi -Recurse | ForEach-Object {
        $size = [math]::Round($_.Length / 1MB, 2)
        Write-Host "  - $($_.Name) ($size MB)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Distribution files are in the 'release' folder" -ForegroundColor Cyan
Write-Host ""

# 8. Cleanup
if (Test-Path $configPath) {
    Remove-Item $configPath
}

Write-Success "Build process completed successfully!"
