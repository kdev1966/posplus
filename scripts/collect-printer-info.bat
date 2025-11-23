@echo off
REM Script de collecte d'informations imprimante pour diagnostic POSPlus
REM Genere un fichier diagnostic-YYYYMMDD-HHMMSS.txt

setlocal enabledelayedexpansion

echo ====================================================
echo   Collecte Informations Imprimante - POSPlus
echo ====================================================
echo.

REM Generer nom de fichier avec timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set timestamp=%datetime:~0,8%-%datetime:~8,6%
set outputfile=diagnostic-%timestamp%.txt

echo Generation du rapport de diagnostic...
echo Fichier de sortie: %outputfile%
echo.

REM Creer le fichier de diagnostic
(
echo ====================================================
echo   DIAGNOSTIC IMPRIMANTE POSPLUS
echo   Date: %date% %time%
echo ====================================================
echo.

echo ====================================================
echo 1. IMPRIMANTES INSTALLEES
echo ====================================================
powershell -Command "Get-Printer | Format-Table Name, PortName, DriverName, PrinterStatus -AutoSize"
echo.

echo ====================================================
echo 2. IMPRIMANTE PAR DEFAUT
echo ====================================================
powershell -Command "$p = Get-WmiObject Win32_Printer | Where-Object {$_.Default -eq $true}; if ($p) { $p | Format-List Name, PortName, PrinterStatus } else { Write-Host 'Aucune imprimante par defaut' }"
echo.

echo ====================================================
echo 3. IMPRIMANTES AVEC MOT-CLE 'POS' ou '80'
echo ====================================================
powershell -Command "Get-Printer | Where-Object {$_.Name -like '*POS*' -or $_.Name -like '*80*' -or $_.Name -like '*Thermal*'} | Format-List Name, PortName, DriverName, PrinterStatus"
echo.

echo ====================================================
echo 4. CONFIGURATION POSPLUS ACTUELLE
echo ====================================================
echo.
echo [Fichier utilisateur: %%APPDATA%%\POSPlus\printer.json]
if exist "%APPDATA%\POSPlus\printer.json" (
    type "%APPDATA%\POSPlus\printer.json"
) else (
    echo   Fichier n'existe pas
)
echo.
echo [Fichier projet: config\printer.json]
if exist "config\printer.json" (
    type "config\printer.json"
) else (
    echo   Fichier n'existe pas
)
echo.

echo ====================================================
echo 5. LOGS POSPLUS (50 dernieres lignes avec 'printer')
echo ====================================================
powershell -Command "if (Test-Path '$env:APPDATA\POSPlus\logs\main.log') { Get-Content '$env:APPDATA\POSPlus\logs\main.log' -Tail 100 | Select-String -Pattern 'printer|Printer|PRINTER|ERROR|error' -Context 1 } else { Write-Host 'Fichier de log introuvable' }"
echo.

echo ====================================================
echo 6. PORTS USB ET SERIE
echo ====================================================
powershell -Command "Get-WmiObject Win32_SerialPort | Format-Table DeviceID, Description -AutoSize"
echo.

echo ====================================================
echo 7. VERSION WINDOWS
echo ====================================================
ver
echo.

echo ====================================================
echo 8. TEST DE CONNEXION POSPLUS (simulation)
echo ====================================================
powershell -Command "$printers = Get-Printer | Where-Object {$_.Name -like '*POS*' -or $_.Name -like '*80*'}; if ($printers) { foreach ($p in $printers) { Write-Host ''; Write-Host \"Test pour: $($p.Name)\"; Write-Host \"  Interface printer:$($p.Name)\"; Write-Host \"  Port: $($p.PortName)\"; Write-Host \"  Statut Windows: $($p.PrinterStatus)\" } } else { Write-Host 'Aucune imprimante POS detectee' }"
echo.

echo ====================================================
echo FIN DU DIAGNOSTIC
echo ====================================================
) > %outputfile%

echo.
echo ====================================================
echo   DIAGNOSTIC TERMINE
echo ====================================================
echo.
echo Fichier genere: %outputfile%
echo.
echo PROCHAINES ETAPES:
echo 1. Ouvrir le fichier: %outputfile%
echo 2. Verifier les informations
echo 3. Partager ce fichier pour diagnostic
echo.
echo Voulez-vous ouvrir le fichier maintenant? (O/N)
set /p choice=

if /i "%choice%"=="O" (
    notepad %outputfile%
)

echo.
echo Script termine.
pause
