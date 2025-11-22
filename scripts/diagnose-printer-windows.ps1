# Script de Diagnostic Imprimante Thermique - POSPlus
# À exécuter sur le POS Windows

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  Diagnostic Imprimante POSPlus" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# 1. Imprimantes installées
Write-Host "1. IMPRIMANTES INSTALLÉES" -ForegroundColor Yellow
Write-Host "   (Notez le NOM EXACT de l'imprimante thermique)`n" -ForegroundColor Gray
Get-Printer | Format-Table Name, PortName, DriverName, PrinterStatus -AutoSize
Write-Host ""

# 2. Imprimante par défaut
Write-Host "2. IMPRIMANTE PAR DÉFAUT" -ForegroundColor Yellow
$defaultPrinter = Get-WmiObject -Class Win32_Printer | Where-Object {$_.Default -eq $true}
if ($defaultPrinter) {
    Write-Host "   Nom     : " -NoNewline -ForegroundColor Gray
    Write-Host $defaultPrinter.Name -ForegroundColor Green
    Write-Host "   Port    : " -NoNewline -ForegroundColor Gray
    Write-Host $defaultPrinter.PortName -ForegroundColor Green
} else {
    Write-Host "   Aucune imprimante par défaut" -ForegroundColor Red
}
Write-Host ""

# 3. Ports USB
Write-Host "3. IMPRIMANTES SUR PORT USB" -ForegroundColor Yellow
$usbPrinters = Get-Printer | Where-Object {$_.PortName -like "USB*"}
if ($usbPrinters) {
    $usbPrinters | Format-Table Name, PortName -AutoSize
} else {
    Write-Host "   Aucune imprimante USB détectée" -ForegroundColor Red
}
Write-Host ""

# 4. Ports Série (COM)
Write-Host "4. PORTS SÉRIE DISPONIBLES" -ForegroundColor Yellow
$comPorts = Get-WmiObject Win32_SerialPort
if ($comPorts) {
    $comPorts | Format-Table DeviceID, Description -AutoSize
} else {
    Write-Host "   Aucun port série détecté" -ForegroundColor Red
}
Write-Host ""

# 5. Ports réseau
Write-Host "5. IMPRIMANTES RÉSEAU" -ForegroundColor Yellow
$networkPrinters = Get-Printer | Where-Object {$_.PortName -like "IP_*" -or $_.PortName -like "WSD*"}
if ($networkPrinters) {
    $networkPrinters | Format-Table Name, PortName -AutoSize
} else {
    Write-Host "   Aucune imprimante réseau détectée" -ForegroundColor Red
}
Write-Host ""

# 6. Vérifier logs POSPlus
Write-Host "6. LOGS POSPLUS (Dernières 10 lignes imprimante)" -ForegroundColor Yellow
$logPath = "$env:APPDATA\POSPlus\logs\main.log"
if (Test-Path $logPath) {
    Write-Host "   Emplacement : $logPath`n" -ForegroundColor Gray
    Get-Content $logPath -Tail 50 | Select-String -Pattern "Printer|printer" | Select-Object -Last 10
} else {
    Write-Host "   Fichier de log introuvable" -ForegroundColor Red
    Write-Host "   Attendu à : $logPath" -ForegroundColor Gray
}
Write-Host ""

# Résumé et recommandations
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  RÉSUMÉ & RECOMMANDATIONS" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

Write-Host "ÉTAPES SUIVANTES :`n" -ForegroundColor Yellow

Write-Host "1. " -NoNewline -ForegroundColor White
Write-Host "Identifiez votre imprimante thermique dans la liste ci-dessus" -ForegroundColor Gray

Write-Host "2. " -NoNewline -ForegroundColor White
Write-Host "Notez SON NOM EXACT (ex: 'POS-80', 'TM-T20', etc.)" -ForegroundColor Gray

Write-Host "3. " -NoNewline -ForegroundColor White
Write-Host "Notez le TYPE DE PORT (USB001, COM1, IP, etc.)" -ForegroundColor Gray

Write-Host "`n4. " -NoNewline -ForegroundColor White
Write-Host "Envoyez ces informations pour mise à jour du code :`n" -ForegroundColor Gray

Write-Host "   - Nom imprimante : " -NoNewline -ForegroundColor Gray
Write-Host "[À COMPLÉTER]" -ForegroundColor Cyan

Write-Host "   - Port           : " -NoNewline -ForegroundColor Gray
Write-Host "[À COMPLÉTER]" -ForegroundColor Cyan

Write-Host "   - Modèle/Marque  : " -NoNewline -ForegroundColor Gray
Write-Host "[EPSON/STAR/Autre]" -ForegroundColor Cyan

Write-Host "`n" -ForegroundColor Gray
Write-Host "Documentation complète : claudedocs/PRINTER_WINDOWS_FIX.md" -ForegroundColor Gray
Write-Host "============================================`n" -ForegroundColor Cyan

# Sauvegarder résultat dans fichier
$outputFile = "printer-diagnostic-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').txt"
$output = @"
=== Diagnostic Imprimante POSPlus - $(Get-Date) ===

1. IMPRIMANTES INSTALLÉES
$(Get-Printer | Format-Table Name, PortName, DriverName, PrinterStatus | Out-String)

2. IMPRIMANTE PAR DÉFAUT
$($defaultPrinter | Format-List Name, PortName | Out-String)

3. IMPRIMANTES USB
$(Get-Printer | Where-Object {$_.PortName -like "USB*"} | Format-Table Name, PortName | Out-String)

4. PORTS SÉRIE
$(Get-WmiObject Win32_SerialPort | Format-Table DeviceID, Description | Out-String)

5. IMPRIMANTES RÉSEAU
$(Get-Printer | Where-Object {$_.PortName -like "IP_*" -or $_.PortName -like "WSD*"} | Format-Table Name, PortName | Out-String)

6. LOGS POSPLUS
$(if (Test-Path $logPath) { Get-Content $logPath -Tail 50 | Select-String -Pattern "Printer|printer" | Select-Object -Last 10 | Out-String } else { "Log file not found" })

=== Fin du diagnostic ===
"@

$output | Out-File -FilePath $outputFile -Encoding UTF8
Write-Host "Résultats sauvegardés dans : " -NoNewline -ForegroundColor Green
Write-Host "$outputFile" -ForegroundColor Cyan
Write-Host ""
