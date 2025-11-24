# Guide de Déploiement - Impression POS80 sur Windows 10

**Date:** 22 novembre 2025
**Projet:** POSPlus
**Cible:** Windows 10 + POS80 Printer (imprimante thermique générique) sur port CP001

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Prérequis](#prérequis)
3. [Configuration matérielle](#configuration-matérielle)
4. [Installation du pilote](#installation-du-pilote)
5. [Configuration POSPlus](#configuration-posplus)
6. [Tests et vérification](#tests-et-vérification)
7. [Résolution de problèmes](#résolution-de-problèmes)
8. [Détails techniques](#détails-techniques)

---

## 🎯 Vue d'ensemble

POSPlus utilise une **imprimante thermique ESC/POS** pour imprimer les tickets de caisse. Le système supporte les imprimantes génériques compatibles ESC/POS comme la **POS80 Printer**.

### Configuration cible
- **OS:** Windows 10
- **Imprimante:** POS80 Printer (générique ESC/POS)
- **Port:** CP001 (port série virtuel)
- **Protocole:** ESC/POS (EPSON compatible)
- **Largeur papier:** 80mm (48 caractères)

---

## ✅ Prérequis

### Matériel requis
- ✅ Terminal POS sous Windows 10
- ✅ Imprimante thermique POS80 (ou compatible ESC/POS)
- ✅ Câble USB ou série selon le modèle
- ✅ Papier thermique 80mm

### Logiciel requis
- ✅ Windows 10 (64-bit recommandé)
- ✅ Pilote d'imprimante POS80 installé
- ✅ POSPlus installé

---

## 🔌 Configuration Matérielle

### 1. Connexion physique

**USB (Recommandé)**
```
1. Connecter le câble USB de l'imprimante au PC
2. Windows devrait détecter automatiquement l'imprimante
3. Le système créera un port COM virtuel (ex: CP001)
```

**Série RS-232** (Alternative)
```
1. Connecter le câble série au port COM du PC
2. Noter le numéro du port (COM1, COM2, etc.)
3. Configurer vitesse: 9600 baud (standard)
```

### 2. Vérification de la connexion

Ouvrir PowerShell et exécuter :
```powershell
Get-Printer | Format-Table Name, PortName
```

Vous devriez voir :
```
Name           PortName
----           --------
POS80 Printer  CP001
```

---

## 📥 Installation du Pilote

### Option 1 : Installation automatique (Windows)

1. Connecter l'imprimante via USB
2. Windows Update installera automatiquement le pilote générique
3. Vérifier dans "Périphériques et imprimantes"

### Option 2 : Installation manuelle

1. **Télécharger le pilote**
   - Depuis le site du fabricant
   - Ou utiliser le CD fourni avec l'imprimante

2. **Installer le pilote**
   ```
   - Double-cliquer sur le setup.exe
   - Suivre l'assistant d'installation
   - Sélectionner le port CP001 (ou USB001)
   - Terminer l'installation
   ```

3. **Vérifier l'installation**
   ```
   Panneau de configuration > Périphériques et imprimantes
   → "POS80 Printer" doit apparaître avec état "Prêt"
   ```

### Nom de l'imprimante

⚠️ **IMPORTANT** : Le nom exact de l'imprimante doit être :
```
POS80 Printer
```

Si le nom est différent (ex: "Generic POS80", "Thermal Printer"), vous devez :
- Soit renommer l'imprimante dans Windows
- Soit modifier `config/printer.json` dans POSPlus

**Renommer dans Windows :**
```
1. Panneau de configuration > Périphériques et imprimantes
2. Clic droit sur l'imprimante > Propriétés de l'imprimante
3. Onglet Général > Modifier le nom en "POS80 Printer"
4. Cliquer OK
```

---

## ⚙️ Configuration POSPlus

### Configuration par défaut

POSPlus est **pré-configuré** pour la POS80 sur CP001 :

**Fichier:** `config/printer.json`
```json
{
  "printerName": "POS80 Printer",
  "port": "CP001",
  "type": "EPSON"
}
```

✅ **Aucune modification nécessaire** si votre configuration correspond !

### Configuration personnalisée

Si votre imprimante utilise un nom ou port différent :

**Méthode 1 : Interface POSPlus (Recommandé)**
```
1. Lancer POSPlus
2. Aller dans "Paramètres" > "Imprimante"
3. Modifier :
   - Nom de l'imprimante
   - Port
   - Type (EPSON/STAR)
4. Cliquer "Sauvegarder"
5. Cliquer "Reconnecter"
```

**Méthode 2 : Fichier de configuration**
```
1. Éditer : config/printer.json
2. Modifier les valeurs :
   {
     "printerName": "VOTRE_NOM_IMPRIMANTE",
     "port": "VOTRE_PORT",
     "type": "EPSON"
   }
3. Sauvegarder le fichier
4. Redémarrer POSPlus
```

### Types d'imprimantes supportés

| Type | Description | Quand l'utiliser |
|------|-------------|------------------|
| `EPSON` | ESC/POS EPSON | **POS80 et la plupart des imprimantes génériques** ✅ |
| `STAR` | Star Micronics | Imprimantes Star TSP, SP, etc. |

⚠️ Pour POS80 Printer, utilisez **toujours EPSON**

---

## 🧪 Tests et Vérification

### 1. Vérification du système

**Exécuter le script de diagnostic :**
```powershell
cd C:\chemin\vers\posplus
.\scripts\diagnose-printer-windows.ps1
```

**Ce script affichera :**
- ✅ Toutes les imprimantes installées
- ✅ L'imprimante par défaut
- ✅ Les ports disponibles
- ✅ Les logs POSPlus récents

### 2. Test depuis POSPlus

1. **Démarrer POSPlus**
   ```
   Double-cliquer sur POSPlus.exe
   ```

2. **Vérifier le statut**
   ```
   Interface : Icône imprimante en haut à droite
   - 🟢 Vert = Connectée
   - 🔴 Rouge = Déconnectée
   ```

3. **Imprimer un ticket de test**
   ```
   1. Aller dans "Paramètres" > "Imprimante"
   2. Cliquer "Imprimer ticket de test"
   3. Vérifier que le ticket s'imprime physiquement
   ```

**Contenu du ticket de test :**
```
===========================================
       POSPlus - TEST TICKET
      Point of Sale System
-------------------------------------------

Test Date: 22/11/2025 14:30:00
Printer Type: Thermal 80mm
Character Set: PC850 Multilingual
-------------------------------------------

Sample Product 1
  2 x 5.500 DT = 11.000 DT

Sample Product 2
  1 x 3.250 DT = 3.250 DT

Sample Product 3
  3 x 2.000 DT = 6.000 DT

-------------------------------------------
                   Subtotal: 20.250 DT
                   Discount: -2.000 DT

                TOTAL: 18.250 DT
-------------------------------------------

Payment Method: CASH
Amount Paid: 20.000 DT
Change: 1.750 DT

-------------------------------------------
     This is a test ticket
    Printer test successful!

        POSPlus v1.0.0
===========================================
```

### 3. Test d'impression de vente

1. Créer une vente test dans POSPlus
2. Finaliser la transaction
3. Le ticket devrait s'imprimer automatiquement
4. Vérifier la qualité de l'impression

### 4. Test du tiroir-caisse (optionnel)

Si votre imprimante est connectée à un tiroir-caisse :

```
1. Interface POS > Bouton "Ouvrir tiroir"
2. Le tiroir devrait s'ouvrir automatiquement
```

---

## 🔧 Résolution de Problèmes

### Problème 1 : "Imprimante déconnectée"

**Symptômes :**
- Icône rouge dans l'interface
- Message "Thermal printer not connected"

**Solutions :**

1. **Vérifier la connexion physique**
   ```
   - Câble USB bien branché ?
   - Imprimante allumée ?
   - Voyant d'alimentation allumé ?
   ```

2. **Vérifier dans Windows**
   ```powershell
   Get-Printer -Name "POS80 Printer"
   ```

   Statut doit être "Normal" ou "Idle"

3. **Vérifier le nom exact**
   ```powershell
   Get-Printer | Select-Object Name
   ```

   Le nom doit être exactement "POS80 Printer"

4. **Redémarrer le spooler d'impression**
   ```powershell
   Restart-Service -Name Spooler
   ```

5. **Reconnecter depuis POSPlus**
   ```
   Paramètres > Imprimante > Reconnecter
   ```

### Problème 2 : "Ticket ne s'imprime pas"

**Symptômes :**
- Statut "Connectée" mais rien ne s'imprime
- Pas d'erreur affichée

**Solutions :**

1. **Test Windows**
   ```
   1. Panneau de configuration > Périphériques et imprimantes
   2. Clic droit sur "POS80 Printer" > Propriétés
   3. Onglet Général > Imprimer une page de test
   4. Si ça fonctionne → Problème dans POSPlus
   5. Si ça ne fonctionne pas → Problème pilote/matériel
   ```

2. **Vérifier le papier**
   ```
   - Papier thermique présent ?
   - Rouleau correctement installé ?
   - Capot fermé ?
   ```

3. **Vérifier les logs POSPlus**
   ```
   Fichier : %APPDATA%\POSPlus\logs\main.log

   Rechercher :
   - "Printer" ou "printer"
   - Messages d'erreur
   ```

4. **Réinstaller le pilote**
   ```
   1. Désinstaller l'imprimante
   2. Débrancher/rebrancher USB
   3. Réinstaller le pilote
   4. Redémarrer POSPlus
   ```

### Problème 3 : "Port CP001 introuvable"

**Symptômes :**
- Windows n'affiche pas le port CP001
- L'imprimante utilise un autre port (USB001, COM3, etc.)

**Solutions :**

1. **Identifier le port réel**
   ```powershell
   Get-Printer -Name "POS80 Printer" | Select-Object PortName
   ```

2. **Mettre à jour la configuration POSPlus**

   Éditer `config/printer.json` :
   ```json
   {
     "printerName": "POS80 Printer",
     "port": "USB001",  ← Utiliser le port réel
     "type": "EPSON"
   }
   ```

3. **Redémarrer POSPlus**

### Problème 4 : "Caractères bizarres imprimés"

**Symptômes :**
- Caractères corrompus ou illisibles
- Symboles au lieu de texte

**Cause :** Encodage incorrect

**Solution :**

POSPlus utilise `PC850 Multilingual` par défaut.

Si le problème persiste :
1. Vérifier les paramètres du pilote d'imprimante
2. Essayer de changer le type d'imprimante (EPSON → STAR)

### Problème 5 : "Impression lente"

**Solutions :**

1. **Augmenter le timeout**

   Nécessite modification du code (contactez le support)

2. **Vérifier le port USB**
   ```
   - Utiliser USB 2.0 plutôt que 3.0
   - Éviter les hubs USB
   - Brancher directement sur le PC
   ```

---

## 🔬 Détails Techniques

### Architecture du système d'impression

```
┌─────────────────────────────────────────┐
│         Interface Utilisateur           │
│  (Bouton "Imprimer", statut, etc.)      │
└────────────────┬────────────────────────┘
                 │ IPC (Inter-Process Communication)
                 ↓
┌─────────────────────────────────────────┐
│         printerHandlers.ts              │
│   (7 handlers IPC pour l'impression)    │
└────────────────┬────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│        PrinterService.ts                │
│  (Logique métier d'impression)          │
└────────────────┬────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│      node-thermal-printer v4.4.4        │
│    (Bibliothèque ESC/POS)               │
└────────────────┬────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│      Windows Printer Spooler            │
│         OU accès port direct            │
└────────────────┬────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│         POS80 Printer (matériel)        │
└─────────────────────────────────────────┘
```

### Stratégie de connexion

POSPlus teste **14 configurations** dans l'ordre de priorité :

#### 1. Configurations depuis `printer.json` (priorité haute)

```typescript
// Si printerName = "POS80 Printer" et port = "CP001"
1. printer:POS80 Printer    // Interface Windows Spooler ✅ RECOMMANDÉ
2. \\.\CP001                // Accès port direct Windows
3. //./CP001                // Format UNC alternatif
4. CP001                    // Nom direct
```

#### 2. Fallbacks hardcodés

```typescript
5. printer:POS80 Printer (EPSON)
6. \\.\CP001 (EPSON)
7. //./CP001 (EPSON)
8. CP001 (EPSON)
9. printer:POS80 Printer (STAR)
10. \\.\CP001 (STAR)
11. //./CP001 (STAR)
```

**🎯 La configuration #1 (`printer:POS80 Printer`) est la plus fiable !**

Elle utilise le Windows Printer Spooler qui :
- ✅ Gère la file d'attente automatiquement
- ✅ Utilise le pilote installé
- ✅ Plus compatible que l'accès direct au port

### Paramètres de l'imprimante

```typescript
{
  type: PrinterTypes.EPSON,              // Type ESC/POS
  interface: 'printer:POS80 Printer',    // Interface de connexion
  characterSet: CharacterSet.PC850_MULTILINGUAL,  // Encodage
  removeSpecialCharacters: false,        // Garder caractères spéciaux
  lineCharacter: '-',                    // Caractère pour les lignes
  width: 48,                             // 48 caractères (80mm)
  options: {
    timeout: 5000                        // Timeout 5 secondes
  }
}
```

### Commandes ESC/POS utilisées

POSPlus utilise les commandes ESC/POS standard :

| Commande | Code ESC/POS | Fonction |
|----------|--------------|----------|
| `alignCenter()` | `ESC a 1` | Centrer le texte |
| `alignLeft()` | `ESC a 0` | Aligner à gauche |
| `alignRight()` | `ESC a 2` | Aligner à droite |
| `bold(true)` | `ESC E 1` | Texte gras |
| `setTextSize(1,1)` | `GS ! 0x11` | Taille double |
| `drawLine()` | Impression `-` × 48 | Ligne de séparation |
| `cut()` | `GS V 0` | Couper le papier |
| `openCashDrawer()` | `ESC p 0 25 250` | Ouvrir tiroir-caisse |

### Logs et diagnostic

**Emplacement des logs :**
```
Windows : %APPDATA%\POSPlus\logs\main.log
Exemple : C:\Users\Caissier\AppData\Roaming\POSPlus\logs\main.log
```

**Logs d'impression utiles :**
```
[INFO] Initializing printer: Trying thermal printer configurations
[INFO] Testing: interface="printer:POS80 Printer", type=EPSON
[INFO] Created ThermalPrinter instance
[INFO] Connection test result: true
[INFO] ✅ Thermal printer interface connected: printer:POS80 Printer
[INFO] Printing ticket (thermal): TICKET-001
[INFO] Sending print job to printer...
[INFO] Print command executed, result: <Buffer>
[INFO] Ticket printed successfully: TICKET-001
```

**Erreurs courantes :**
```
[ERROR] ❌ All thermal printer interfaces failed
[ERROR] THERMAL PRINTER REQUIRED: Application cannot use standard printer
[ERROR] Please check:
[ERROR]   1. Printer name is exactly: "POS80 Printer"
[ERROR]   2. Printer port is: CP001
[ERROR]   3. Printer is powered on and ready
[ERROR]   4. Driver is installed correctly
```

---

## 📝 Corrections Appliquées (v1.1)

### Version 1.0 → 1.1 (22 Nov 2025)

#### 1. Correction CharacterSet
**Avant :**
```typescript
// Incohérence entre code et message
characterSet: CharacterSet.PC850_MULTILINGUAL  // Code
this.printer.println('Character Set: SLOVENIA')  // Message test ❌
```

**Après :**
```typescript
characterSet: CharacterSet.PC850_MULTILINGUAL  // Code
this.printer.println('Character Set: PC850 Multilingual')  // Message test ✅
```

#### 2. Correction Logique de Statut
**Avant :**
```typescript
// L'imprimante apparaissait "déconnectée" même si connectée
const connected = this.isConnected && this.printTestPassed  // ❌
```

**Après :**
```typescript
// Statut basé sur le test de connexion uniquement
const connected = this.isConnected  // ✅
```

**Amélioration UX :**
- ✅ Statut correct dès le démarrage
- ✅ Pas besoin de test manuel pour voir "Connecté"

#### 3. Correction Format Port Windows
**Avant :**
```typescript
interface: `\\.\\${cfg.port}`  // Produit: \.\\CP001 ❌
```

**Après :**
```typescript
interface: `\\\\.\\${cfg.port}`  // Produit: \\.\CP001 ✅
```

**Résultat :**
- ✅ Format Windows correct : `\\.\CP001`
- ✅ Compatibilité améliorée avec Windows 10

---

## 🎯 Checklist de Déploiement

### Avant le déploiement
- [ ] Windows 10 installé et à jour
- [ ] Imprimante POS80 physiquement connectée
- [ ] Papier thermique 80mm chargé
- [ ] Pilote d'imprimante installé
- [ ] Nom de l'imprimante vérifié : "POS80 Printer"
- [ ] Port vérifié : CP001 (ou autre noté)

### Installation POSPlus
- [ ] POSPlus installé sur le terminal
- [ ] Configuration `config/printer.json` vérifiée
- [ ] Nom et port correspondent à l'imprimante Windows

### Tests
- [ ] Script diagnostic exécuté sans erreur
- [ ] POSPlus démarré avec succès
- [ ] Statut imprimante : 🟢 Connectée
- [ ] Ticket de test imprimé physiquement
- [ ] Vente test créée et ticket imprimé
- [ ] Tiroir-caisse testé (si applicable)

### Validation
- [ ] Qualité d'impression correcte (texte lisible)
- [ ] Découpe papier fonctionne
- [ ] Pas de caractères corrompus
- [ ] Vitesse d'impression acceptable
- [ ] Logs POSPlus sans erreur

---

## 📞 Support

En cas de problème persistant :

1. **Collecter les informations**
   ```powershell
   .\scripts\diagnose-printer-windows.ps1
   ```

   Ceci génère un fichier : `printer-diagnostic-YYYY-MM-DD-HHmmss.txt`

2. **Collecter les logs POSPlus**
   ```
   Copier : %APPDATA%\POSPlus\logs\main.log
   ```

3. **Contacter le support**

   Fournir :
   - Fichier de diagnostic
   - Logs POSPlus
   - Capture d'écran de l'erreur
   - Modèle exact de l'imprimante

---

## 📚 Références

### Documentation
- [node-thermal-printer](https://github.com/Klemen1337/node-thermal-printer)
- [ESC/POS Command Reference](https://reference.epson-biz.com/modules/ref_escpos/)
- [Windows Print Spooler](https://docs.microsoft.com/windows/win32/printdocs/print-spooler)

### Fichiers du projet
- `src/main-process/services/printer/PrinterService.ts` - Service principal
- `src/main-process/handlers/printerHandlers.ts` - Handlers IPC
- `src/main-process/utils/printerConfig.ts` - Configuration
- `config/printer.json` - Configuration par défaut
- `scripts/diagnose-printer-windows.ps1` - Script de diagnostic

---

**Document créé le :** 22 novembre 2025
**Version POSPlus :** 1.1
**Dernière mise à jour :** 22 novembre 2025
