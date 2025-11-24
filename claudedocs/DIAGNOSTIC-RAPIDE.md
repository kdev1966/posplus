# Diagnostic Rapide - Problème d'Impression POSPlus

## 🚨 Actions Urgentes - 3 Minutes

### Étape 1 : Identifier le nom EXACT de l'imprimante (30 secondes)

Sur le POS, ouvrir PowerShell et exécuter :

```powershell
Get-Printer | Format-Table Name, PortName, PrinterStatus
```

**➡️ Copier EXACTEMENT le résultat ici :**

```
Nom : _________________
Port : _________________
Statut : _________________
```

---

### Étape 2 : Vérifier les logs POSPlus (1 minute)

```powershell
# Ouvrir le fichier de logs
notepad "$env:APPDATA\POSPlus\logs\main.log"
```

**Dans le fichier, chercher (Ctrl+F) :**
- Le mot "ERROR" ou "❌"
- Le mot "printer"

**➡️ Copier les 10-15 dernières lignes contenant "printer" ici :**

```
[Coller les logs ici]
```

---

### Étape 3 : Vérifier la configuration actuelle (30 secondes)

```powershell
# Vérifier si le fichier de config existe
if (Test-Path "$env:APPDATA\POSPlus\printer.json") {
    Get-Content "$env:APPDATA\POSPlus\printer.json"
} else {
    Write-Host "Fichier de config utilisateur n'existe pas"
    Get-Content "config\printer.json"
}
```

**➡️ Copier le contenu JSON ici :**

```json
{
  "printerName": "_________________",
  "port": "_________________",
  "type": "_________________"
}
```

---

## 🔍 Diagnostic Automatique

Si vous pouvez exécuter le script, faire :

```powershell
cd C:\chemin\vers\posplus
.\scripts\auto-detect-printer.ps1
```

**➡️ Copier le résultat complet du script**

---

## 📝 Informations Supplémentaires

**Quel est le message exact dans POSPlus ?**

- [ ] Badge rouge "Déconnectée"
- [ ] Badge vert "Connectée" mais pas d'impression
- [ ] Message d'erreur : _______________________
- [ ] Autre : _______________________

**Que se passe-t-il quand vous cliquez "Imprimer ticket de test" ?**

- [ ] Rien ne se passe
- [ ] Message d'erreur : _______________________
- [ ] Badge change de vert à rouge
- [ ] POSPlus se fige/crash
- [ ] Autre : _______________________

---

## 🎯 Test Windows (Vérification)

**La page de test Windows s'imprime-t-elle toujours ?**

```powershell
# Imprimer page de test
$printer = Get-Printer | Where-Object {$_.Name -like "*POS*" -or $_.Name -like "*80*"} | Select-Object -First 1
$wmi = Get-WmiObject Win32_Printer | Where-Object {$_.Name -eq $printer.Name}
$wmi.PrintTestPage()
```

**➡️ Résultat :**
- [ ] ✅ Page s'imprime correctement
- [ ] ❌ Erreur : _______________________

---

## 📤 Envoyer ces Informations

Une fois collectées, partagez :

1. **Nom exact de l'imprimante** (Étape 1)
2. **Logs POSPlus** (Étape 2 - dernières lignes avec "printer")
3. **Configuration actuelle** (Étape 3)
4. **Résultat auto-détection** (si exécuté)
5. **Comportement exact** (Messages d'erreur, etc.)

---

## 💡 Solutions Rapides à Essayer

### Solution A : Nom exact avec espaces/tirets

Si votre imprimante s'appelle `POS-80 Printer` (avec tiret) au lieu de `POS80 Printer` :

**Créer/éditer :** `%APPDATA%\POSPlus\printer.json`

```json
{
  "printerName": "POS-80 Printer",
  "port": "USB001",
  "type": "EPSON"
}
```

Redémarrer POSPlus et tester.

---

### Solution B : Forcer Windows Spooler uniquement

**Créer/éditer :** `%APPDATA%\POSPlus\printer.json`

```json
{
  "printerName": "NOM_EXACT_DE_WINDOWS",
  "port": "",
  "type": "EPSON"
}
```

☝️ **Important :** `port` est vide (`""`)

Cela force l'utilisation de l'interface `printer:NOM` qui passe par le spooler Windows (plus compatible).

Redémarrer POSPlus et tester.

---

### Solution C : Exécuter en Administrateur

Clic droit sur POSPlus.exe → "Exécuter en tant qu'administrateur"

Tester l'impression.

⚠️ Si ça fonctionne, le problème est un accès bloqué aux ports.

---

## 🆘 Si Rien ne Fonctionne

Fournir toutes les informations collectées ci-dessus pour un diagnostic approfondi.
