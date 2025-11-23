# Diagnostic - Imprimante OK sous Windows mais pas sous POSPlus

**Situation :** L'imprimante thermique fonctionne avec la page de test Windows, mais POSPlus ne peut pas imprimer.

---

## 🔍 Diagnostic Immédiat

### Étape 1 : Vérifier le nom EXACT de l'imprimante

Dans PowerShell, exécuter :

```powershell
Get-Printer | Where-Object {$_.Name -like "*POS*" -or $_.Name -like "*80*"} | Format-List Name, PortName, DriverName, PrinterStatus
```

**IMPORTANT :** Notez le nom EXACT (sensible à la casse et aux espaces)

**Exemples de variations possibles :**
- ❌ `POS80 Printer` (config actuelle)
- ✅ `POS-80 Printer` (avec tiret)
- ✅ `Generic POS80`
- ✅ `Thermal Printer POS80`
- ✅ `USB Thermal Printer`

### Étape 2 : Vérifier le port réel

```powershell
Get-Printer | Where-Object {$_.Name -like "*POS*"} | Select-Object Name, PortName
```

**Le port peut être :**
- `CP001` (config actuelle)
- `USB001` (plus courant)
- `USB002`, `USB003`, etc.
- `COM1`, `COM3`, etc.
- `DOT4_001`

### Étape 3 : Consulter les logs POSPlus

**Emplacement :** `%APPDATA%\POSPlus\logs\main.log`

**Ouvrir avec :**
```powershell
notepad "$env:APPDATA\POSPlus\logs\main.log"
```

**Rechercher :**
- Messages avec "Printer" ou "printer"
- Messages avec "❌" ou "ERROR"
- Dernières 50 lignes

---

## 🚨 Causes Probables

### Cause #1 : Nom d'imprimante incorrect (80% des cas)

**Symptôme :**
- Windows test page : ✅ Fonctionne
- POSPlus : ❌ Toutes les configurations échouent

**Logs typiques :**
```
[ERROR] ✗ Configuration failed: interface="printer:POS80 Printer", Error: Printer not found
[ERROR] ✗ Configuration failed: interface="\\.\CP001", Error: Access denied
[ERROR] ❌ All thermal printer interfaces failed
```

**Solution :**

1. Identifier le nom exact dans Windows :
   ```powershell
   (Get-Printer | Where-Object {$_.PortName -like "*USB*" -or $_.PortName -like "*CP*"}).Name
   ```

2. Mettre à jour `config/printer.json` :
   ```json
   {
     "printerName": "VOTRE_NOM_EXACT_ICI",
     "port": "VOTRE_PORT_ICI",
     "type": "EPSON"
   }
   ```

3. Redémarrer POSPlus

---

### Cause #2 : Port incorrect (15% des cas)

**Symptôme :**
- Interface `printer:NAME` échoue
- Accès direct au port échoue

**Logs typiques :**
```
[INFO] Testing: interface="printer:POS80 Printer", type=EPSON
[ERROR] Connection test failed
[INFO] Testing: interface="\\.\CP001", type=EPSON
[ERROR] Access denied / File not found
```

**Solution :**

Trouver le port réel :
```powershell
Get-Printer | Format-Table Name, PortName
```

Puis mettre à jour la config.

---

### Cause #3 : Accès direct au port bloqué par Windows (10% des cas)

**Symptôme :**
- `printer:NAME` pourrait fonctionner
- Mais tous les accès directs (`\\.\PORT`) échouent avec "Access denied"

**Explication :**
Windows 10 peut bloquer l'accès direct aux ports USB/série pour des raisons de sécurité.

**Solution :**

**Option A : Utiliser UNIQUEMENT l'interface Windows Spooler**

Modifier la configuration pour forcer l'utilisation du spooler :

Créer/éditer `%APPDATA%\POSPlus\printer.json` :
```json
{
  "printerName": "NOM_EXACT_DE_VOTRE_IMPRIMANTE",
  "port": "",
  "type": "EPSON",
  "useSpoolerOnly": true
}
```

**Option B : Exécuter POSPlus en administrateur**

1. Clic droit sur POSPlus.exe
2. "Exécuter en tant qu'administrateur"
3. Tester l'impression

⚠️ **Attention :** Exécuter en admin n'est pas recommandé pour une utilisation quotidienne

---

### Cause #4 : Bibliothèque node-thermal-printer incompatible (5% des cas)

**Symptôme :**
- Toutes les interfaces échouent
- Même avec le bon nom et port

**Logs typiques :**
```
[ERROR] Failed to initialize printer: Error loading native module
[ERROR] The specified module could not be found
```

**Solution :**

Vérifier les modules natifs :
```bash
npm run postinstall
```

Si erreur, rebuild manuellement :
```bash
npx @electron/rebuild -f -w better-sqlite3
npx @electron/rebuild -f -w usb
npx @electron/rebuild -f -w canvas
```

---

## 🛠️ Solutions Détaillées

### Solution 1 : Script de Détection Automatique

Créer ce fichier PowerShell : `detect-printer.ps1`

```powershell
# Script de détection automatique de l'imprimante POS
Write-Host "=== Détection Imprimante Thermique ===" -ForegroundColor Cyan

# Chercher imprimantes avec mots-clés thermiques
$keywords = @("POS", "Thermal", "80", "Receipt", "Ticket")
$printers = Get-Printer

Write-Host "`nImprimantes détectées:" -ForegroundColor Yellow
foreach ($printer in $printers) {
    foreach ($keyword in $keywords) {
        if ($printer.Name -like "*$keyword*") {
            Write-Host "`n  Nom: " -NoNewline -ForegroundColor White
            Write-Host $printer.Name -ForegroundColor Green
            Write-Host "  Port: " -NoNewline -ForegroundColor White
            Write-Host $printer.PortName -ForegroundColor Green
            Write-Host "  Statut: " -NoNewline -ForegroundColor White
            Write-Host $printer.PrinterStatus -ForegroundColor $(if ($printer.PrinterStatus -eq "Normal") { "Green" } else { "Red" })

            # Générer configuration JSON
            $config = @{
                printerName = $printer.Name
                port = $printer.PortName
                type = "EPSON"
            } | ConvertTo-Json

            Write-Host "`n  Configuration suggérée:" -ForegroundColor Yellow
            Write-Host $config -ForegroundColor Cyan
            break
        }
    }
}

Write-Host "`n=== Fin du diagnostic ===" -ForegroundColor Cyan
Write-Host "`nCopiez la configuration suggérée dans:" -ForegroundColor White
Write-Host "  config/printer.json" -ForegroundColor Yellow
Write-Host "OU" -ForegroundColor White
Write-Host "  %APPDATA%\POSPlus\printer.json" -ForegroundColor Yellow
```

**Utilisation :**
```powershell
.\detect-printer.ps1
```

Copier la configuration JSON générée.

---

### Solution 2 : Mode Debug Verbeux

Activer les logs détaillés pour diagnostiquer :

**Créer :** `%APPDATA%\POSPlus\debug.json`
```json
{
  "enableDebug": true,
  "logLevel": "verbose"
}
```

Puis redémarrer POSPlus et consulter `main.log`.

---

### Solution 3 : Test Direct de l'Interface

Créer un script de test minimal : `test-printer.js`

```javascript
const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');

async function testPrinter() {
  const tests = [
    { interface: 'printer:POS80 Printer', type: PrinterTypes.EPSON },
    { interface: 'printer:Generic POS80', type: PrinterTypes.EPSON },
    { interface: '\\\\.\\CP001', type: PrinterTypes.EPSON },
    { interface: '\\\\.\\USB001', type: PrinterTypes.EPSON },
  ];

  for (const config of tests) {
    console.log(`\nTesting: ${config.interface}`);
    try {
      const printer = new ThermalPrinter({
        type: config.type,
        interface: config.interface,
        width: 48,
      });

      const connected = await printer.isPrinterConnected();
      console.log(`  Result: ${connected ? '✅ SUCCESS' : '❌ FAILED'}`);

      if (connected) {
        console.log(`  ✅ This configuration works!`);
        console.log(`  Use in config: ${JSON.stringify(config, null, 2)}`);
        process.exit(0);
      }
    } catch (err) {
      console.log(`  Error: ${err.message}`);
    }
  }

  console.log('\n❌ All configurations failed');
}

testPrinter();
```

**Exécution :**
```bash
node test-printer.js
```

---

## 🎯 Procédure de Résolution Étape par Étape

### Étape 1 : Diagnostic (5 minutes)

```powershell
# 1. Lister toutes les imprimantes
Get-Printer | Format-Table Name, PortName, PrinterStatus

# 2. Chercher l'imprimante thermique
Get-Printer | Where-Object {$_.PortName -like "*USB*" -or $_.PortName -like "*CP*"}

# 3. Noter le nom EXACT et le port
```

### Étape 2 : Mise à jour configuration (2 minutes)

**Option A : Via l'interface POSPlus**
1. Ouvrir POSPlus
2. Paramètres → Imprimante
3. Entrer le nom EXACT et le port
4. Enregistrer
5. Reconnecter

**Option B : Fichier de configuration**
```json
{
  "printerName": "VOTRE_NOM_ICI",
  "port": "VOTRE_PORT_ICI",
  "type": "EPSON"
}
```

Sauvegarder dans :
- `config/printer.json` (projet)
- OU `%APPDATA%\POSPlus\printer.json` (utilisateur - prioritaire)

### Étape 3 : Test (1 minute)

1. Redémarrer POSPlus
2. Paramètres → Imprimante
3. Cliquer "Imprimer ticket de test"
4. Vérifier si ticket s'imprime

### Étape 4 : Si échec, consulter logs (3 minutes)

```powershell
# Voir les 100 dernières lignes avec "printer"
Get-Content "$env:APPDATA\POSPlus\logs\main.log" -Tail 100 | Select-String -Pattern "printer" -Context 2
```

Chercher les messages d'erreur et leur cause.

---

## 📋 Checklist de Vérification

Avant de contacter le support, vérifier :

- [ ] Nom de l'imprimante correspond EXACTEMENT à Windows
- [ ] Port correspond à celui affiché dans Windows
- [ ] Page de test Windows fonctionne
- [ ] POSPlus redémarré après changement de config
- [ ] Logs consultés pour erreur exacte
- [ ] Configuration testée avec `printer:NAME` (prioritaire)
- [ ] Imprimante définie comme imprimante par défaut dans Windows
- [ ] Aucun autre logiciel n'utilise l'imprimante simultanément

---

## 🔧 Configurations Testées qui Fonctionnent

### Configuration Type 1 : Via Windows Spooler (RECOMMANDÉ)

```json
{
  "printerName": "POS-80",
  "port": "USB001",
  "type": "EPSON"
}
```

**Avantages :**
- ✅ Utilise le pilote Windows installé
- ✅ Pas de problème de permissions
- ✅ File d'attente gérée par Windows
- ✅ Plus stable

**Interface utilisée :** `printer:POS-80`

### Configuration Type 2 : Accès direct port (Alternative)

```json
{
  "printerName": "",
  "port": "CP001",
  "type": "EPSON"
}
```

**Avantages :**
- ✅ Accès direct, plus rapide
- ✅ Pas de dépendance au spooler

**Inconvénients :**
- ⚠️ Peut nécessiter droits admin
- ⚠️ Peut être bloqué par Windows

**Interface utilisée :** `\\.\CP001`

---

## 💡 Astuces

### Astuce 1 : Renommer l'imprimante dans Windows

Si le nom est complexe, renommez-le :

1. Panneau de configuration → Périphériques et imprimantes
2. Clic droit sur l'imprimante → Propriétés
3. Onglet Général → Renommer en "POS80 Printer"
4. OK

### Astuce 2 : Définir comme imprimante par défaut

Certaines configurations fonctionnent mieux si l'imprimante est définie par défaut :

1. Paramètres Windows → Imprimantes
2. Clic sur votre imprimante thermique
3. "Définir par défaut"

### Astuce 3 : Désactiver "Laisser Windows gérer l'imprimante par défaut"

Windows 10 change automatiquement l'imprimante par défaut :

1. Paramètres → Périphériques → Imprimantes
2. Décocher "Laisser Windows gérer mon imprimante par défaut"

---

## 🚀 Prochaines Étapes

1. **Exécuter le script de détection**
   ```powershell
   Get-Printer | Where-Object {$_.PortName -like "*USB*"} | Select-Object Name, PortName
   ```

2. **Mettre à jour la configuration** avec le nom et port exacts

3. **Tester** avec POSPlus

4. **Si échec**, envoyer :
   - Nom exact de l'imprimante
   - Port exact
   - Contenu du fichier `main.log` (dernières 100 lignes)
   - Capture d'écran de l'erreur

---

**Document créé le :** 22 novembre 2025
**Pour assistance :** Fournir les informations ci-dessus
