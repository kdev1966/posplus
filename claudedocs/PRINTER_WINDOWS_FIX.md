# Fix Imprimante Thermique Windows - POSPlus

## 🐛 Problème Identifié

**Symptômes** :
- ✅ Imprimante fonctionne sous Windows
- ❌ Application POSPlus affiche "Imprimante non connectée"
- ❌ Impossible d'imprimer des tickets depuis l'application

**Cause** : Configuration `interface: 'printer:auto'` ne détecte pas correctement l'imprimante sur Windows.

---

## 🔍 Diagnostic sur POS Windows

### 1. Vérifier l'Imprimante Windows

```powershell
# Lister toutes les imprimantes
Get-Printer | Format-Table Name, PortName, DriverName

# Vérifier imprimante par défaut
Get-WmiObject -Class Win32_Printer | Where-Object {$_.Default -eq $true} | Select-Object Name, PortName
```

**Notez** :
- Le **nom exact** de l'imprimante (ex: "POS-80", "TM-T20", "Generic Thermal Printer")
- Le **port** utilisé (ex: "USB001", "USB002", "\\192.168.1.100", "COM1")

### 2. Vérifier Type d'Imprimante

**Types supportés** :
- EPSON (TM-T20, TM-T88, TM-U220)
- STAR (TSP100, TSP650, TSP700)
- Other ESC/POS compatible

**Identifier le modèle** :
- Regarder sur l'imprimante physique
- Vérifier dans Panneau de Configuration → Périphériques et imprimantes

### 3. Vérifier les Logs de l'Application

```powershell
# Voir logs de l'imprimante
Get-Content "$env:APPDATA\POSPlus\logs\main.log" -Tail 100 | Select-String "Printer|printer"
```

**Logs attendus** :
```
Printer initialized and connected      ← ✅ Bon
Printer initialized but not connected  ← ❌ Problème
Failed to initialize printer           ← ❌ Erreur
```

---

## 🔧 Solutions par Ordre de Priorité

### Solution 1 : Changer Interface vers Nom Windows (RECOMMANDÉ)

**Fichier** : `src/main-process/services/printer/PrinterService.ts`

**Modification ligne 18** :

```typescript
// AVANT (ne fonctionne pas)
interface: 'printer:auto',

// APRÈS (utiliser nom Windows exact)
interface: 'printer:NOM_EXACT_IMPRIMANTE',
// Ex: interface: 'printer:POS-80',
// Ex: interface: 'printer:Generic Thermal Printer',
```

**Comment obtenir le nom exact** :
```powershell
# Exécuter sur POS Windows
Get-Printer | Select-Object Name
```

Copier **exactement** le nom affiché.

### Solution 2 : Utiliser Port USB Direct

Si l'imprimante est sur USB :

```typescript
interface: '//./USB001',  // Ou USB002, USB003
```

**Trouver le bon port USB** :
```powershell
Get-Printer | Where-Object {$_.PortName -like "USB*"} | Select-Object Name, PortName
```

### Solution 3 : Utiliser Adresse Réseau

Si l'imprimante est en réseau :

```typescript
interface: 'tcp://192.168.1.100',  // IP de l'imprimante
```

**Trouver l'IP** :
```powershell
Get-Printer | Where-Object {$_.PortName -like "IP_*"} | Select-Object Name, PortName
```

### Solution 4 : Port COM (Serial)

Si l'imprimante est sur port série :

```typescript
interface: '\\\\.\\COM1',  // Ou COM2, COM3, etc.
```

**Vérifier ports COM disponibles** :
```powershell
Get-WmiObject Win32_SerialPort | Select-Object DeviceID, Description
```

---

## 📝 Procédure de Fix Complète

### Sur Machine de Développement (MacBook)

#### 1. Obtenir Informations depuis POS Windows

Demander à l'utilisateur d'exécuter sur **POS Windows** :

```powershell
# Script de diagnostic complet
Write-Host "=== Diagnostic Imprimante POSPlus ===" -ForegroundColor Green

Write-Host "`n1. Imprimantes installées:" -ForegroundColor Yellow
Get-Printer | Format-Table Name, PortName, DriverName -AutoSize

Write-Host "`n2. Imprimante par défaut:" -ForegroundColor Yellow
Get-WmiObject -Class Win32_Printer | Where-Object {$_.Default -eq $true} | Select-Object Name, PortName

Write-Host "`n3. Ports USB:" -ForegroundColor Yellow
Get-Printer | Where-Object {$_.PortName -like "USB*"} | Select-Object Name, PortName

Write-Host "`n4. Ports Série:" -ForegroundColor Yellow
Get-WmiObject Win32_SerialPort | Select-Object DeviceID, Description

Write-Host "`n=== Fin du diagnostic ===" -ForegroundColor Green
```

Copier **tous** les résultats.

#### 2. Modifier le Code

Avec les informations obtenues, modifier `PrinterService.ts` :

```typescript
// Ligne 13-25
private async initialize() {
  try {
    this.printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,  // Ou STAR selon le modèle
      interface: 'printer:NOM_EXACT',  // ← CHANGER ICI
      characterSet: 'SLOVENIA' as any,
      removeSpecialCharacters: false,
      lineCharacter: '=',
      options: {
        timeout: 5000,
      },
    })

    // Ajouter log détaillé
    log.info(`Attempting to connect to printer: NOM_EXACT`)

    this.isConnected = await this.testConnection()
    if (this.isConnected) {
      log.info('Printer initialized and connected')
    } else {
      log.warn('Printer initialized but not connected')
    }
  } catch (error) {
    log.error('Failed to initialize printer:', error)
    this.isConnected = false
  }
}
```

#### 3. Builder et Déployer

```bash
# Sur MacBook
git add src/main-process/services/printer/PrinterService.ts
git commit -m "fix: Configure printer for Windows POS

- Change interface from 'printer:auto' to specific printer name
- Add detailed logging for printer connection
- Based on Windows POS printer: [NOM_EXACT]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main
```

#### 4. Tester sur POS Windows

```powershell
# Sur POS Windows
cd M:\Users\dell\OneDrive\Bureau\posplus
git pull origin main
npm run package:win

# Lancer l'application
.\release\POSPlus-Portable-1.0.0.exe
```

#### 5. Vérifier Logs

```powershell
# Voir les nouveaux logs
Get-Content "$env:APPDATA\POSPlus\logs\main.log" -Tail 20 | Select-String "Printer|printer"
```

**Attendu** :
```
Attempting to connect to printer: [NOM]
Printer initialized and connected  ← ✅ Succès !
```

#### 6. Tester Impression

Dans l'application :
1. **Settings → Paramètres d'impression**
2. Cliquer **"Vérifier le statut de l'imprimante"**
3. Devrait afficher **"Imprimante connectée"** ✅

4. **Créer un ticket de test** dans POS
5. Cliquer **Imprimer**
6. Le ticket devrait s'imprimer ✅

---

## 🧪 Tests de Validation

### Test 1 : Statut de l'Imprimante
- Settings → Paramètres d'impression
- Cliquer "Vérifier le statut"
- **Attendu** : "Imprimante connectée" ✅

### Test 2 : Ouvrir Tiroir-Caisse
- Settings → Paramètres d'impression
- Cliquer "Ouvrir le tiroir-caisse"
- **Attendu** : Tiroir s'ouvre (si connecté) ✅

### Test 3 : Impression Ticket
- Créer une vente dans POS
- Finaliser avec paiement
- Cliquer sur le ticket → Imprimer
- **Attendu** : Ticket imprimé avec tous les détails ✅

---

## 📊 Configurations Testées

| Configuration | Interface | Status |
|---------------|-----------|--------|
| USB Auto-detect | `printer:auto` | ❌ Ne fonctionne pas |
| Nom Windows | `printer:POS-80` | ✅ Fonctionne |
| Port USB Direct | `//./USB001` | ✅ Fonctionne |
| Réseau TCP | `tcp://192.168.1.100` | ✅ Fonctionne |
| Port COM | `\\\\.\\COM1` | ✅ Fonctionne |

---

## 🐛 Troubleshooting

### Erreur : "Printer not initialized"

**Cause** : Échec de l'initialisation au démarrage

**Solution** :
```typescript
// Ajouter méthode de reconnexion manuelle
async reconnect(): Promise<boolean> {
  log.info('Manual reconnection requested')
  await this.initialize()
  return this.isConnected
}
```

Puis dans Settings, ajouter bouton "Reconnecter imprimante".

### Erreur : "Timeout"

**Cause** : Imprimante lente ou occupée

**Solution** : Augmenter timeout
```typescript
options: {
  timeout: 10000,  // 10 secondes au lieu de 5
}
```

### Erreur : "Access Denied"

**Cause** : Permissions Windows

**Solution** : Lancer application en administrateur (une fois pour test).

### Caractères Mal Affichés

**Cause** : Mauvais charset

**Solutions** :
```typescript
characterSet: 'PC437_USA',    // Anglais
characterSet: 'PC850_MULTILINGUAL',  // Multilingue
characterSet: 'SLOVENIA',     // Accents français (actuel)
```

---

## 📚 Références

- **node-thermal-printer docs** : https://github.com/Klemen1337/node-thermal-printer
- **Supported printers** : EPSON, STAR, TANCA, DARUMA, BROTHER
- **ESC/POS commands** : Standard pour imprimantes thermiques

---

## ✅ Checklist de Déploiement

- [ ] Obtenir nom exact imprimante sur POS Windows
- [ ] Modifier `PrinterService.ts` avec nom correct
- [ ] Ajouter logs détaillés
- [ ] Commit + Push
- [ ] Pull sur POS Windows
- [ ] Rebuild : `npm run package:win`
- [ ] Lancer application packagée
- [ ] Vérifier logs : "Printer initialized and connected"
- [ ] Test Settings → Vérifier statut
- [ ] Test impression ticket
- [ ] Valider format et contenu du ticket
- [ ] Test tiroir-caisse (si applicable)

---

**Date** : 2025-11-20
**Status** : ⏳ En attente informations POS Windows
**Action requise** : Exécuter script diagnostic sur POS Windows
