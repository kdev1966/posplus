# Auto-Detection de l'Imprimante Thermique POSPlus
# Ce script détecte automatiquement l'imprimante thermique et génère la configuration

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Auto-Détection Imprimante POSPlus" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Mots-clés pour identifier les imprimantes thermiques
$thermalKeywords = @("POS", "Thermal", "80", "Receipt", "Ticket", "TM-", "RP", "TSP")

# Récupérer toutes les imprimantes
$allPrinters = Get-Printer

Write-Host "1. RECHERCHE D'IMPRIMANTES THERMIQUES..." -ForegroundColor Yellow
Write-Host ""

$candidates = @()

foreach ($printer in $allPrinters) {
    $score = 0
    $reasons = @()

    # Vérifier les mots-clés dans le nom
    foreach ($keyword in $thermalKeywords) {
        if ($printer.Name -like "*$keyword*") {
            $score += 10
            $reasons += "Nom contient '$keyword'"
        }
    }

    # Bonus si le port est USB ou COM (typique pour thermique)
    if ($printer.PortName -like "USB*") {
        $score += 5
        $reasons += "Port USB"
    } elseif ($printer.PortName -like "COM*" -or $printer.PortName -like "CP*") {
        $score += 5
        $reasons += "Port série/virtuel"
    }

    # Bonus si l'imprimante est prête
    if ($printer.PrinterStatus -eq "Normal" -or $printer.PrinterStatus -eq "Idle") {
        $score += 3
        $reasons += "Statut: Prêt"
    }

    if ($score -gt 0) {
        $candidates += [PSCustomObject]@{
            Name = $printer.Name
            PortName = $printer.PortName
            DriverName = $printer.DriverName
            Status = $printer.PrinterStatus
            Score = $score
            Reasons = $reasons -join ", "
        }
    }
}

if ($candidates.Count -eq 0) {
    Write-Host "❌ AUCUNE IMPRIMANTE THERMIQUE DÉTECTÉE" -ForegroundColor Red
    Write-Host ""
    Write-Host "Toutes les imprimantes installées:" -ForegroundColor Yellow
    $allPrinters | Format-Table Name, PortName, PrinterStatus -AutoSize
    Write-Host ""
    Write-Host "Si votre imprimante thermique est dans la liste ci-dessus," -ForegroundColor White
    Write-Host "notez son nom EXACT et son port, puis configurez manuellement." -ForegroundColor White
    exit 1
}

# Trier par score décroissant
$candidates = $candidates | Sort-Object -Property Score -Descending

Write-Host "✅ IMPRIMANTE(S) THERMIQUE(S) TROUVÉE(S):" -ForegroundColor Green
Write-Host ""

$index = 1
foreach ($candidate in $candidates) {
    Write-Host "[$index] " -NoNewline -ForegroundColor Cyan
    Write-Host $candidate.Name -ForegroundColor White
    Write-Host "    Port        : " -NoNewline -ForegroundColor Gray
    Write-Host $candidate.PortName -ForegroundColor Yellow
    Write-Host "    Pilote      : " -NoNewline -ForegroundColor Gray
    Write-Host $candidate.DriverName -ForegroundColor Gray
    Write-Host "    Statut      : " -NoNewline -ForegroundColor Gray
    $statusColor = if ($candidate.Status -eq "Normal") { "Green" } else { "Yellow" }
    Write-Host $candidate.Status -ForegroundColor $statusColor
    Write-Host "    Score       : " -NoNewline -ForegroundColor Gray
    Write-Host "$($candidate.Score) points" -ForegroundColor Cyan
    Write-Host "    Raisons     : " -NoNewline -ForegroundColor Gray
    Write-Host $candidate.Reasons -ForegroundColor Gray
    Write-Host ""
    $index++
}

# Sélectionner la meilleure candidate (score le plus élevé)
$bestPrinter = $candidates[0]

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "2. IMPRIMANTE SÉLECTIONNÉE (score le plus élevé):" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Nom  : " -NoNewline -ForegroundColor White
Write-Host $bestPrinter.Name -ForegroundColor Green
Write-Host "  Port : " -NoNewline -ForegroundColor White
Write-Host $bestPrinter.PortName -ForegroundColor Green
Write-Host ""

# Générer la configuration JSON
$config = @{
    printerName = $bestPrinter.Name
    port = $bestPrinter.PortName
    type = "EPSON"
} | ConvertTo-Json -Depth 2

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "3. CONFIGURATION GÉNÉRÉE:" -ForegroundColor Yellow
Write-Host ""
Write-Host $config -ForegroundColor Cyan
Write-Host ""

# Déterminer le chemin de sauvegarde
$appDataPath = "$env:APPDATA\POSPlus"
$configPath = Join-Path $appDataPath "printer.json"
$projectConfigPath = Join-Path $PSScriptRoot "..\config\printer.json"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "4. OPTIONS DE SAUVEGARDE:" -ForegroundColor Yellow
Write-Host ""
Write-Host "[1] Sauvegarder dans le profil utilisateur (RECOMMANDÉ)" -ForegroundColor White
Write-Host "    Chemin: $configPath" -ForegroundColor Gray
Write-Host ""
Write-Host "[2] Sauvegarder dans le projet" -ForegroundColor White
Write-Host "    Chemin: $projectConfigPath" -ForegroundColor Gray
Write-Host ""
Write-Host "[3] Afficher seulement (ne pas sauvegarder)" -ForegroundColor White
Write-Host ""
Write-Host "[Q] Quitter sans sauvegarder" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Votre choix [1/2/3/Q]"

switch ($choice.ToUpper()) {
    "1" {
        # Créer le dossier si nécessaire
        if (-not (Test-Path $appDataPath)) {
            New-Item -ItemType Directory -Path $appDataPath -Force | Out-Null
        }

        # Sauvegarder
        $config | Out-File -FilePath $configPath -Encoding UTF8

        Write-Host ""
        Write-Host "✅ Configuration sauvegardée avec succès!" -ForegroundColor Green
        Write-Host "   Fichier: $configPath" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "PROCHAINES ÉTAPES:" -ForegroundColor Yellow
        Write-Host "1. Redémarrer POSPlus" -ForegroundColor White
        Write-Host "2. Aller dans Paramètres > Imprimante" -ForegroundColor White
        Write-Host "3. Cliquer 'Imprimer ticket de test'" -ForegroundColor White
        Write-Host "4. Vérifier que le ticket s'imprime" -ForegroundColor White
    }

    "2" {
        # Sauvegarder dans le projet
        $config | Out-File -FilePath $projectConfigPath -Encoding UTF8

        Write-Host ""
        Write-Host "✅ Configuration sauvegardée avec succès!" -ForegroundColor Green
        Write-Host "   Fichier: $projectConfigPath" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "PROCHAINES ÉTAPES:" -ForegroundColor Yellow
        Write-Host "1. Rebuild le projet: npm run build" -ForegroundColor White
        Write-Host "2. Redémarrer POSPlus" -ForegroundColor White
        Write-Host "3. Tester l'impression" -ForegroundColor White
    }

    "3" {
        Write-Host ""
        Write-Host "Configuration affichée ci-dessus." -ForegroundColor White
        Write-Host "Copiez-la manuellement dans config/printer.json" -ForegroundColor White
    }

    Default {
        Write-Host ""
        Write-Host "Opération annulée." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "5. TEST DE L'IMPRIMANTE WINDOWS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Voulez-vous imprimer une page de test Windows maintenant? [O/N]" -ForegroundColor White
$testChoice = Read-Host

if ($testChoice.ToUpper() -eq "O") {
    Write-Host ""
    Write-Host "Envoi d'une page de test à l'imprimante..." -ForegroundColor Cyan

    try {
        # Obtenir l'imprimante WMI
        $wmiPrinter = Get-WmiObject -Class Win32_Printer | Where-Object {$_.Name -eq $bestPrinter.Name}

        if ($wmiPrinter) {
            $result = $wmiPrinter.PrintTestPage()

            if ($result.ReturnValue -eq 0) {
                Write-Host "✅ Page de test envoyée avec succès!" -ForegroundColor Green
                Write-Host ""
                Write-Host "Si la page s'est imprimée correctement:" -ForegroundColor White
                Write-Host "→ L'imprimante fonctionne sous Windows ✅" -ForegroundColor Green
                Write-Host "→ Testez maintenant avec POSPlus" -ForegroundColor Yellow
            } else {
                Write-Host "⚠️  Erreur lors de l'envoi de la page de test (code: $($result.ReturnValue))" -ForegroundColor Yellow
            }
        } else {
            Write-Host "❌ Impossible de trouver l'imprimante via WMI" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 AIDE SUPPLÉMENTAIRE" -ForegroundColor Yellow
Write-Host ""
Write-Host "Si POSPlus ne peut toujours pas imprimer:" -ForegroundColor White
Write-Host "1. Consultez: PRINTER_TROUBLESHOOTING.md" -ForegroundColor Cyan
Write-Host "2. Vérifiez les logs: %APPDATA%\POSPlus\logs\main.log" -ForegroundColor Cyan
Write-Host '3. Executez: .\scripts\diagnose-printer-windows.ps1' -ForegroundColor Cyan
Write-Host ""
