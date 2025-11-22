# Windows POS - Imprimante Thermique : Checklist d'installation

Ce document décrit les étapes à suivre sur un POS Windows 10 avec imprimante thermique intégrée (ex: `POS80 Printer` sur le port `CP001`).

1) Vérifier la présence de l'imprimante dans Windows

```powershell
Get-Printer | Format-Table Name, PortName, DriverName
[System.IO.Ports.SerialPort]::GetPortNames()
```

2) Vérifier que le driver est installé et que le port est correct
- Notez le `Name` exact et `PortName` (ex: `POS80 Printer` / `CP001` ou `USB001`).

3) Tester la commande Windows (test texte brut)

```powershell
echo Test > C:\Windows\Temp\posplus-test.txt
print /D:"POS80 Printer" C:\Windows\Temp\posplus-test.txt
```

Remarque : cet envoi texte peut ne pas fonctionner sur une thermique (la thermique nécessite ESC/POS). C'est juste pour valider que Windows envoie des travaux vers le port.

4) Démarrer POSPlus et lancer un ticket de test (Settings → Imprimer ticket de test)

5) Vérifier les logs de l'application (main process)

```powershell
notepad "$env:APPDATA\POSPlus\logs\main.log"
```

Cherchez les lignes suivantes :
- `Initializing printer: Trying thermal printer configurations`
- `Created ThermalPrinter instance`
- `Connection test result: true`
- `✅ SUCCESS! Thermal printer connected AND printing works`
- `Test ticket printed successfully`

6) Si la détection échoue
- Vérifier le nom exact renvoyé par `Get-Printer` et mettre à jour la configuration locale :
  - Ouvrir l'application Settings → saisir `Nom de l'imprimante` exactement tel qu'il apparaît, saisir le `Port` (ex: `CP001`), cliquer `Enregistrer la configuration` puis `Reconnexion`.
- Redémarrer l'application POSPlus après modification du driver si nécessaire.

7) En dernier recours
- Si la thermique n'est toujours pas détectée, collecter les logs et envoyer à l'équipe :
  - `%APPDATA%\POSPlus\logs\main.log`
  - sortie de `Get-Printer`
