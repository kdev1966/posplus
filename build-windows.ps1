# POSPlus Windows Build Script
# Script PowerShell pour Windows 10

Write-Host "=== POSPlus Windows Build Script ===" -ForegroundColor Cyan

# Vérifier Node.js
try {
    $nodeVersion = node --version
    Write-Host "Node version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js n'est pas installé. Téléchargez-le sur https://nodejs.org/" -ForegroundColor Red
    exit 1
}

try {
    $npmVersion = npm --version
    Write-Host "NPM version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: NPM n'est pas installé" -ForegroundColor Red
    exit 1
}

# Nettoyer les anciens builds
Write-Host "`nNettoyage des anciens builds..." -ForegroundColor Yellow
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue dist
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue release
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue "node_modules/.cache"

# Installer les dépendances
Write-Host "`nInstallation des dépendances..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Installation des dépendances échouée" -ForegroundColor Red
    exit 1
}

# Build
Write-Host "`nBuild de l'application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build échoué" -ForegroundColor Red
    exit 1
}

# Package Windows
Write-Host "`nCréation du package Windows portable..." -ForegroundColor Yellow
npm run package:win
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Packaging échoué" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Build terminé avec succès ===" -ForegroundColor Green
Write-Host "Le package Windows se trouve dans: .\release\" -ForegroundColor Cyan

# Lister les fichiers créés
Get-ChildItem -Path ".\release" -Filter "*.exe" | ForEach-Object {
    Write-Host "  - $($_.Name) ($([math]::Round($_.Length / 1MB, 2)) MB)" -ForegroundColor White
}
