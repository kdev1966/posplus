# Guide de Débogage - Imprimante Thermique Windows

## Problème Actuel

**Symptômes:**
- ✅ Statut: "Imprimante connectée"
- ✅ Message: "Ticket de test imprimé avec succès"
- ❌ Aucune impression physique
- ❌ Aucun son de l'imprimante

**Cause Probable:**
L'application utilise `StandardPrinterService` (commande Windows `print`) au lieu de `ThermalPrinterService` (ESC/POS). La commande `print` envoie du texte brut qui n'est pas correctement interprété par l'imprimante thermique.

## Étape 1: Vérifier les Logs

### Emplacement des Logs
```
C:\Users\[Username]\AppData\Roaming\POSPlus\logs\main.log
```

Ou utilisez la commande PowerShell :
```powershell
notepad "$env:APPDATA\POSPlus\logs\main.log"
```

### Logs Attendus (Si Thermique Fonctionne) ✅
```
[INFO] Initializing printer: Trying thermal printer interfaces first
[INFO] Attempting thermal interface: printer:POS80 Printer
[INFO] Thermal printer connected successfully using interface: printer:POS80 Printer
[INFO] Printing test ticket (thermal)
```

### Logs Actuels (Si StandardPrinter Utilisé) ❌
```
[INFO] Initializing printer: Trying thermal printer interfaces first
[INFO] Attempting thermal interface: printer:POS80 Printer
[WARN] Thermal interface printer:POS80 Printer failed: [error details]
[INFO] Attempting thermal interface: //./CP001
[WARN] Thermal interface //./CP001 failed: [error details]
[INFO] Thermal printer not found, trying standard printer service
[INFO] Standard printer service connected successfully
[INFO] Using standard printer service for test ticket
[INFO] StandardPrinter: Executing: print /D:"Printer Name" "C:\temp\..."
```

## Étape 2: Identifier le Nom Exact de l'Imprimante

### Méthode 1: PowerShell
```powershell
Get-Printer | Select-Object Name, DriverName, PortName | Format-Table
```

**Exemple de sortie:**
```
Name              DriverName           PortName
----              ----------           --------
POS80 Printer     Generic ESC/POS      USB001
XP-80C            XPrinter Driver      COM1
TSP100            Star TSP100 Driver   USB002
```

### Méthode 2: WMIC
```cmd
wmic printer get name,portname,drivername
```

### Méthode 3: Panneau de Configuration
1. **Paramètres** → **Périphériques** → **Imprimantes et scanners**
2. Noter le **nom exact** de l'imprimante thermique

## Étape 3: Identifier le Port Utilisé

### Pour Imprimante USB
```powershell
Get-Printer | Where-Object {$_.PortName -like "USB*"} | Format-Table Name, PortName
```

### Pour Imprimante Série (COM)
```powershell
Get-Printer | Where-Object {$_.PortName -like "COM*"} | Format-Table Name, PortName
```

### Résultat Attendu
- **USB:** `USB001`, `USB002`, etc.
- **Série:** `COM1`, `COM2`, `COM3`, etc.
- **Réseau:** `IP_192.168.1.100`

## Étape 4: Tester l'Impression Directe

### Test 1: Impression Windows Système
```cmd
echo Test > test.txt
print /D:"POS80 Printer" test.txt
```

✅ **Si cela imprime:** L'imprimante fonctionne avec la commande `print`
❌ **Si cela n'imprime pas:** Problème de driver ou de configuration

### Test 2: Test d'Auto-Test de l'Imprimante
La plupart des imprimantes thermiques ont un bouton d'auto-test :
1. Éteindre l'imprimante
2. Maintenir le bouton FEED enfoncé
3. Allumer l'imprimante (en maintenant FEED)
4. Relâcher après 2-3 secondes

✅ **Devrait imprimer:** Configuration, adresse, version firmware

## Étape 5: Corrections Possibles

### Solution 1: Mettre à Jour le Nom de l'Imprimante dans le Code

Si le nom de votre imprimante n'est **PAS** "POS80 Printer", modifiez :

**Fichier:** `src/main-process/services/printer/PrinterService.ts` (ligne 36-40)

**Avant:**
```typescript
const interfaces = [
  'printer:POS80 Printer',  // ← Nom par défaut
  '//./CP001',
  '\\\\.\\CP001',
]
```

**Après (exemple si votre imprimante s'appelle "XP-80C"):**
```typescript
const interfaces = [
  'printer:XP-80C',         // ← VOTRE NOM EXACT
  'printer:POS80 Printer',  // Garder comme fallback
  '//./CP001',
  '\\\\.\\CP001',
]
```

### Solution 2: Utiliser le Port Série Direct

Si votre imprimante utilise un port série (COM1, COM2, etc.) :

**Avant:**
```typescript
const interfaces = [
  'printer:POS80 Printer',
  '//./CP001',
  '\\\\.\\CP001',
]
```

**Après (exemple pour COM1):**
```typescript
const interfaces = [
  'printer:POS80 Printer',
  '//./COM1',              // ← Port série direct
  '\\\\.\\COM1',           // Format alternatif
  '//./CP001',
  '\\\\.\\CP001',
]
```

### Solution 3: Tester avec node-thermal-printer en Ligne de Commande

Créez un fichier `test-thermal.js` :

```javascript
const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');

async function testPrinter() {
  const interfaces = [
    'printer:POS80 Printer',
    '//./COM1',
    '//./CP001',
  ];

  for (const iface of interfaces) {
    console.log(`Testing interface: ${iface}`);

    try {
      const printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: iface,
      });

      const isConnected = await printer.isPrinterConnected();
      console.log(`  Connection test: ${isConnected ? 'SUCCESS' : 'FAILED'}`);

      if (isConnected) {
        printer.println('Test POSPlus');
        printer.println('Impression reussie!');
        printer.cut();

        await printer.execute();
        console.log(`  Print test: SUCCESS`);
        return;
      }
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
  }

  console.log('All interfaces failed');
}

testPrinter();
```

**Exécuter:**
```bash
node test-thermal.js
```

### Solution 4: Vérifier les Drivers

**Drivers Recommandés pour Imprimantes Thermiques:**
- **EPSON TM-series:** EPSON TM-T20 / TM-T88 / TM-U220 driver
- **Star Micronics:** Star TSP100 / TSP650 driver
- **XPrinter:** XPrinter Driver (depuis le site du fabricant)
- **Generic ESC/POS:** Generic / Text Only driver

**Installation:**
1. Télécharger le driver depuis le site du fabricant
2. Désinstaller l'ancienne imprimante
3. Réinstaller avec le nouveau driver
4. Tester l'auto-test de l'imprimante

### Solution 5: Permissions et Accès aux Ports

Sur Windows, l'accès aux ports série peut nécessiter des permissions :

1. Exécuter POSPlus **en tant qu'administrateur**
2. Vérifier les permissions du port COM :
   ```powershell
   # Vérifier les ports COM disponibles
   [System.IO.Ports.SerialPort]::getportnames()
   ```

## Étape 6: Informations à Fournir

Pour un diagnostic précis, fournissez :

1. **Nom exact de l'imprimante** (depuis Imprimantes et scanners)
2. **Type de port** (USB001, COM1, etc.)
3. **Nom du driver** (Generic ESC/POS, EPSON TM-T20, etc.)
4. **Logs de l'application** (`%APPDATA%\POSPlus\logs\main.log`)
5. **Résultat de la commande:**
   ```powershell
   Get-Printer | Format-Table Name, DriverName, PortName
   ```

## Résumé du Workflow de Diagnostic

```
1. Vérifier les logs
   ↓
2. Identifier le nom exact de l'imprimante
   ↓
3. Identifier le port (USB/COM)
   ↓
4. Tester impression système (print command)
   ↓
5. Si échec → Vérifier drivers
   ↓
6. Si succès système mais échec app → Modifier le code (nom/port)
   ↓
7. Recompiler et tester
```

## Notes Importantes

- **StandardPrinterService** = Texte brut (ne fonctionne pas correctement avec thermique)
- **ThermalPrinterService** = ESC/POS (requis pour impression thermique)
- Le code actuel bascule sur Standard si Thermal échoue
- Il faut **absolument** que Thermal se connecte pour que l'impression fonctionne

## Prochaines Étapes

Fournissez les informations demandées à l'Étape 6, et nous pourrons :
1. Identifier pourquoi les interfaces thermiques échouent
2. Modifier le code avec les bons paramètres
3. Recompiler et redéployer
4. Tester l'impression réelle avec ESC/POS
