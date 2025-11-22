# Flux de Code - Système d'Impression POSPlus

## Vue d'Ensemble du Problème

**Symptôme:** L'application affiche "Ticket imprimé avec succès" mais rien ne s'imprime physiquement.

**Cause Racine:** Le code utilise `StandardPrinterService` (commande `print` de Windows) au lieu de `ThermalPrinterService` (commandes ESC/POS). La commande `print` envoie du texte brut qui n'est pas interprété correctement par les imprimantes thermiques.

## Architecture du Système d'Impression

```
┌─────────────────────────────────────────────────────┐
│              Interface Utilisateur                   │
│         (Bouton "Imprimer Ticket Test")             │
└───────────────────┬─────────────────────────────────┘
                    │ handlePrintTest()
                    ↓
┌─────────────────────────────────────────────────────┐
│                   IPC Bridge                         │
│        window.electron.printTestTicket()            │
└───────────────────┬─────────────────────────────────┘
                    │ Electron IPC
                    ↓
┌─────────────────────────────────────────────────────┐
│              PrinterService.ts                       │
│           (Détection Plateforme)                    │
└───────────────────┬─────────────────────────────────┘
                    │
        ┌───────────┴──────────────┐
        │                          │
        ↓                          ↓
┌─────────────────┐      ┌──────────────────────┐
│ ThermalPrinter  │      │ StandardPrinter      │
│   (ESC/POS)     │      │  (Commande print)    │
│   ✅ Correct    │      │  ❌ Ne fonctionne    │
│                 │      │     pas avec         │
│                 │      │     thermique        │
└─────────────────┘      └──────────────────────┘
```

## Flux Détaillé du Code

### 1. Interface Utilisateur → IPC
**Fichier:** `src/renderer/components/Settings.tsx`

```typescript
const handlePrintTest = async () => {
  try {
    const result = await window.electron.printTestTicket()

    if (result) {
      alert('Ticket de test imprimé avec succès')  // ← Message de succès affiché
    } else {
      alert('Échec de l\'impression du ticket')
    }
  } catch (error) {
    alert('Erreur lors de l\'impression')
  }
}
```

**Problème:** Le message "succès" s'affiche dès que `result` est `true`, SANS vérifier si l'impression physique a réussi.

---

### 2. IPC Bridge → Main Process
**Fichier:** `src/main-process/ipc-handlers.ts`

```typescript
ipcMain.handle('print-test-ticket', async () => {
  return await PrinterService.printTestTicket()
})
```

**Rôle:** Simple pont entre renderer et main process.

---

### 3. PrinterService - Initialisation (CRITIQUE)
**Fichier:** `src/main-process/services/printer/PrinterService.ts` (lignes 16-86)

```typescript
private async initialize(): Promise<void> {
  if (process.platform === 'darwin') {
    // macOS - Utilise StandardPrinterService
    log.info('Platform: macOS - using standard printer service')
    this.useStandardPrinter = true
    await StandardPrinterService.initialize()
    this.isConnected = await StandardPrinterService.testConnection()
  } else if (process.platform === 'win32') {
    // Windows - Teste d'abord les interfaces thermiques
    log.info('Platform: Windows - trying thermal printer interfaces first')

    const interfaces = [
      'printer:POS80 Printer',  // ← Nom de l'imprimante Windows
      'CP001',                  // ← Nom du port direct
      '//./CP001',              // ← Format chemin périphérique
      '\\\\.\\CP001',           // ← Format Windows device path
      'tcp://localhost:9100',   // ← Fallback réseau
    ]

    log.info('Available interfaces to test:', interfaces)

    // Tester chaque interface thermique
    for (const printerInterface of interfaces) {
      try {
        log.info(`Testing thermal interface: ${printerInterface}`)

        this.printer = new ThermalPrinter({
          type: PrinterTypes.EPSON,
          interface: printerInterface,
          characterSet: 'PC850_MULTILINGUAL',
          removeSpecialCharacters: false,
          lineCharacter: '─',
          options: {
            timeout: 3000,
          },
        })

        const connected = await this.printer.isPrinterConnected()

        if (connected) {
          log.info(`✓ Thermal printer connected successfully using interface: ${printerInterface}`)
          this.isConnected = true
          this.useStandardPrinter = false
          return  // ← SUCCÈS - Utilise thermal printer
        }

        log.warn(`✗ Thermal interface ${printerInterface} not connected`)
      } catch (err: any) {
        log.error(`✗ Thermal interface ${printerInterface} error:`, {
          message: err.message,
          code: err.code,
          stack: err.stack?.split('\n')[0],
        })
      }
    }

    // ❌ TOUS LES INTERFACES THERMIQUES ONT ÉCHOUÉ
    log.warn('Thermal printer not found after trying all interfaces, falling back to standard printer service')
    this.useStandardPrinter = true
    await StandardPrinterService.initialize()
    this.isConnected = await StandardPrinterService.testConnection()
  }
}
```

**Points Critiques:**
1. **Ligne 36-42:** Liste des interfaces à tester - **SI le nom ou port ne correspond pas, TOUTES échouent**
2. **Ligne 44-82:** Boucle de test - chaque erreur est loggée avec détails
3. **Ligne 83-86:** Si tous échouent → Bascule vers StandardPrinter (**PROBLÈME**)

---

### 4A. ThermalPrinterService - Impression (✅ CORRECT)
**Fichier:** `src/main-process/services/printer/PrinterService.ts` (lignes 225-290)

```typescript
async printTestTicket(): Promise<boolean> {
  await this.initPromise  // Attendre initialisation

  if (!this.isConnected) {
    log.error('Printer not initialized')
    return false
  }

  // Déléguer au StandardPrinter si utilisé
  if (this.useStandardPrinter) {
    log.info('Using standard printer service for test ticket')
    return await StandardPrinterService.printTestTicket()
  }

  // ✅ UTILISE LE THERMAL PRINTER
  try {
    log.info('Printing test ticket (thermal)')

    this.printer.alignCenter()
    this.printer.setTextSize(2, 2)
    this.printer.bold(true)
    this.printer.println('POSPlus')
    this.printer.bold(false)
    this.printer.setTextNormal()

    this.printer.println('')
    this.printer.println('TICKET DE TEST')
    this.printer.println('')
    this.printer.println(new Date().toLocaleString('fr-FR'))
    this.printer.println('')
    this.printer.println('Impression thermique')
    this.printer.println('fonctionnelle !')

    this.printer.cut()

    // ✅ ENVOIE VRAIMENT LES COMMANDES ESC/POS
    await this.printer.execute()

    log.info('Test ticket printed successfully (thermal)')
    return true  // ← Retourne true APRÈS impression réelle

  } catch (error) {
    log.error('Failed to print test ticket (thermal):', error)
    return false
  }
}
```

**Fonctionnement:** Envoie des commandes ESC/POS directement à l'imprimante thermique. **FONCTIONNE CORRECTEMENT.**

---

### 4B. StandardPrinterService - Impression (❌ PROBLÈME)
**Fichier:** `src/main-process/services/printer/StandardPrinterService.ts` (lignes 291-316)

```typescript
async printTestTicket(): Promise<boolean> {
  await this.initPromise  // Attendre initialisation

  if (!this.isConnected) {
    log.error('StandardPrinter: Printer not connected')
    return false
  }

  try {
    log.info('StandardPrinter: Printing test ticket')

    const content = this.generateTestReceipt()

    // ❌ UTILISE LA COMMANDE 'print' WINDOWS
    return await this.printTextFile(content)

  } catch (error) {
    log.error('StandardPrinter: Failed to print test ticket:', error)
    return false
  }
}
```

**Méthode `printTextFile`** (lignes 208-270):

```typescript
private async printTextFile(content: string): Promise<boolean> {
  const tempDir = os.tmpdir()
  const tempFile = path.join(tempDir, `posplus-receipt-${Date.now()}.txt`)

  try {
    // Créer fichier texte temporaire
    fs.writeFileSync(tempFile, content, 'utf-8')
    log.info(`StandardPrinter: Created temp file: ${tempFile}`)

    if (process.platform === 'win32') {
      // ❌ PROBLÈME: Commande Windows 'print'
      const printerArg = this.printerName ? `/D:"${this.printerName}"` : ''
      const command = `print ${printerArg} "${tempFile}"`

      log.info(`StandardPrinter: Executing: ${command}`)

      const { stdout, stderr } = await execAsync(command)

      if (stderr) {
        log.warn(`StandardPrinter: print stderr: ${stderr}`)
      }
      if (stdout) {
        log.info(`StandardPrinter: print stdout: ${stdout}`)
      }

      // ❌ RETOURNE 'true' MÊME SI L'IMPRESSION N'A PAS FONCTIONNÉ
      log.info('StandardPrinter: Print job sent successfully')
      return true
    }
  } catch (error) {
    log.error('StandardPrinter: Failed to print:', error)
    return false
  } finally {
    // Nettoyer fichier temporaire
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile)
      }
    } catch (cleanupError) {
      log.warn('Failed to cleanup temp file:', cleanupError)
    }
  }
}
```

**PROBLÈME IDENTIFIÉ:**

1. **Ligne 221:** Commande `print /D:"Printer Name" "file.txt"`
   - Envoie du **texte brut** à l'imprimante
   - Les imprimantes thermiques nécessitent des **commandes ESC/POS binaires**
   - Le texte brut est ignoré ou mal interprété

2. **Ligne 233:** Retourne `true` dès que la commande système s'exécute
   - Ne vérifie PAS si l'impression physique a réussi
   - Ne vérifie PAS si l'imprimante a reçu les données
   - Ne vérifie PAS si le format est compatible

---

## Pourquoi le Message "Succès" Apparaît Sans Impression

**Séquence d'événements:**

```
1. Utilisateur clique "Imprimer Ticket Test"
   ↓
2. PrinterService.initialize() s'exécute
   ↓
3. Teste interfaces thermiques:
   - 'printer:POS80 Printer' → ÉCHEC (nom incorrect?)
   - '//./CP001' → ÉCHEC (port incorrect?)
   - '\\\\.\\CP001' → ÉCHEC
   - 'tcp://localhost:9100' → ÉCHEC (pas réseau)
   ↓
4. Bascule vers StandardPrinterService
   ↓
5. StandardPrinterService.printTestTicket() s'exécute
   ↓
6. Crée fichier texte temporaire
   ↓
7. Exécute: print /D:"Nom Imprimante" "C:\temp\file.txt"
   ↓
8. Commande Windows retourne code 0 (succès système)
   ↓
9. StandardPrinter retourne 'true'
   ↓
10. Interface affiche "Ticket imprimé avec succès" ✅
   ↓
11. MAIS imprimante thermique n'a rien reçu ❌
```

**Explication:**
- La commande Windows `print` s'exécute avec succès (code retour 0)
- Elle envoie bien les données à l'imprimante
- MAIS l'imprimante thermique ne comprend pas le texte brut
- Elle attend des commandes ESC/POS binaires (0x1B, 0x40, etc.)
- Résultat: Données envoyées mais non imprimées

---

## Solution

### Étape 1: Identifier le Vrai Nom et Port de l'Imprimante

Exécuter le script de diagnostic:
```powershell
.\scripts\diagnose-printer-windows.ps1
```

Cela vous donnera:
- **Nom exact** de l'imprimante (ex: "XP-80C", "TM-T20", "POS80 Printer")
- **Port exact** (ex: "USB001", "COM1", "CP001")

### Étape 2: Mettre à Jour le Code

Modifier `src/main-process/services/printer/PrinterService.ts` ligne 36-42:

```typescript
const interfaces = [
  'printer:VOTRE_NOM_EXACT',     // ← Remplacer par le vrai nom
  'printer:POS80 Printer',       // Garder comme fallback
  '//./VOTRE_PORT',              // ← Remplacer par le vrai port (ex: COM1)
  '\\\\.\\VOTRE_PORT',           // Format alternatif
  '//./CP001',                   // Fallback
  '\\\\.\\CP001',
  'tcp://localhost:9100',
]
```

### Étape 3: Recompiler et Tester

```bash
npm run build
npm run package:win
```

### Étape 4: Vérifier les Logs

Après installation sur le POS, vérifier:
```powershell
notepad "$env:APPDATA\POSPlus\logs\main.log"
```

**Logs attendus si succès:**
```
[INFO] Testing thermal interface: printer:VOTRE_NOM
[INFO] ✓ Thermal printer connected successfully using interface: printer:VOTRE_NOM
[INFO] Printing test ticket (thermal)
[INFO] Test ticket printed successfully (thermal)
```

**Logs actuels (échec):**
```
[INFO] Testing thermal interface: printer:POS80 Printer
[ERROR] ✗ Thermal interface printer:POS80 Printer error: { message: "...", code: "..." }
[INFO] Thermal printer not found, falling back to standard printer service
[INFO] Using standard printer service for test ticket
[INFO] StandardPrinter: Executing: print /D:"..." "..."
```

---

## Résumé Visuel du Problème

```
┌──────────────────────────────────────────────────────────┐
│  PROBLÈME ACTUEL                                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Interfaces thermiques → ÉCHEC (nom/port incorrect)     │
│            ↓                                             │
│  Bascule vers StandardPrinter                            │
│            ↓                                             │
│  Utilise commande 'print' Windows                        │
│            ↓                                             │
│  Envoie texte brut → Imprimante ignore                  │
│            ↓                                             │
│  Commande retourne 'succès' → Message affiché           │
│            ↓                                             │
│  ❌ Aucune impression physique                           │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  SOLUTION                                                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Corriger nom/port dans interfaces[]                     │
│            ↓                                             │
│  Interfaces thermiques → SUCCÈS                          │
│            ↓                                             │
│  Utilise ThermalPrinter (ESC/POS)                        │
│            ↓                                             │
│  Envoie commandes binaires ESC/POS                       │
│            ↓                                             │
│  ✅ Impression physique réussie                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Fichiers Clés à Examiner

### PrinterService.ts
- **Ligne 36-42:** Liste des interfaces à tester (À MODIFIER)
- **Ligne 44-82:** Boucle de test avec logging détaillé
- **Ligne 225-290:** Méthode printTestTicket() thermique

### StandardPrinterService.ts
- **Ligne 208-270:** Méthode printTextFile() (cause du problème)
- **Ligne 291-316:** Méthode printTestTicket() standard

### Settings.tsx
- **handlePrintTest():** Affiche le message de succès/échec

---

## Commandes de Diagnostic

```powershell
# 1. Voir toutes les imprimantes
Get-Printer | Format-Table Name, PortName, DriverName

# 2. Voir les logs POSPlus
notepad "$env:APPDATA\POSPlus\logs\main.log"

# 3. Tester impression Windows
echo Test > test.txt
print /D:"NOM_EXACT_IMPRIMANTE" test.txt

# 4. Voir ports COM disponibles
[System.IO.Ports.SerialPort]::getportnames()

# 5. Exécuter diagnostic complet
.\scripts\diagnose-printer-windows.ps1
```
