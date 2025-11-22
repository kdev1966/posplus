# Guide - Impression de Ticket de Test

## Vue d'ensemble

La fonctionnalité "Imprimer ticket de test" permet de tester l'imprimante thermique sans créer de vraie vente. C'est particulièrement utile pour :

- **MacBook développement** : Tester avec imprimante PDF (format 80mm)
- **POS Windows** : Diagnostiquer problèmes d'impression thermique
- **Configuration initiale** : Vérifier que l'imprimante fonctionne correctement

## Comment utiliser

### 1. Accéder aux Paramètres d'impression

```
Application POSPlus
  └─ Paramètres
      └─ Paramètres d'impression
          └─ 🖨️ Imprimer ticket de test
```

### 2. Cliquer sur le bouton

Le bouton **"🖨️ Imprimer ticket de test"** va :
- Créer un ticket fictif avec données d'exemple
- Envoyer à l'imprimante configurée
- Afficher message de succès ou d'erreur

### 3. Résultats attendus

**✅ Succès** :
```
Message : "Ticket de test imprimé avec succès!"
Résultat : Ticket imprimé sur imprimante (PDF ou thermique)
```

**❌ Échec** :
```
Message : "Échec de l'impression du ticket de test"
Action : Vérifier logs et statut imprimante
```

## Contenu du Ticket de Test

Le ticket de test contient :

```
================================
     POSPlus - TEST TICKET
    Point of Sale System
================================

Test Date: [Date actuelle]
Printer Type: Thermal 80mm
Character Set: SLOVENIA
================================

Sample Product 1
  2 x 5.500 DT = 11.000 DT

Sample Product 2
  1 x 3.250 DT = 3.250 DT

Sample Product 3
  3 x 2.000 DT = 6.000 DT

================================
              Subtotal: 20.250 DT
              Discount: -2.000 DT

                TOTAL: 18.250 DT

================================
Payment Method: CASH
Amount Paid: 20.000 DT
Change: 1.750 DT

================================
    This is a test ticket
   Printer test successful!

        POSPlus v1.0.0
```

## Configuration pour Développement (MacBook)

### Installer une Imprimante PDF 80mm

**Option 1 : CUPS-PDF (Recommandé)**
```bash
# Installer CUPS-PDF
brew install cups-pdf

# Créer une imprimante virtuelle 80mm
lpadmin -p "Thermal80mm" -v cups-pdf:/ -P /System/Library/Frameworks/ApplicationServices.framework/Versions/A/Frameworks/PrintCore.framework/Resources/Generic.ppd -E
```

**Option 2 : macOS Print to PDF**
1. Ouvrir **Préférences Système** → **Imprimantes et scanners**
2. Cliquer sur **+** pour ajouter imprimante
3. Sélectionner **Ajouter autre imprimante ou scanner**
4. Choisir **Imprimante générique** avec largeur papier personnalisée 80mm

### Configurer POSPlus pour PDF

Modifier `PrinterService.ts` pour MacBook :

```typescript
const interfaces = [
  'printer:Thermal80mm',     // Imprimante PDF créée
  'printer:CUPS-PDF',        // CUPS-PDF générique
  '/dev/null',               // Test sans impression réelle
]
```

### Tester l'impression

1. Lancer POSPlus en mode développement : `npm run dev`
2. Naviguer vers **Paramètres** → **Paramètres d'impression**
3. Cliquer **"Vérifier le statut de l'imprimante"** → Doit afficher "Connecté"
4. Cliquer **"🖨️ Imprimer ticket de test"**
5. Vérifier le PDF généré dans `~/PDF/` ou `~/Desktop/`

## Diagnostic sur POS Windows

### Vérifier l'état actuel

```powershell
# 1. Vérifier que l'imprimante existe
Get-Printer | Select-Object Name, PortName, PrinterStatus

# 2. Lancer l'application
.\release\POSPlus-Portable-1.0.0.exe

# 3. Tester l'impression
Paramètres → Paramètres d'impression → Imprimer ticket de test

# 4. Consulter les logs
Get-Content "$env:APPDATA\POSPlus\logs\main.log" -Tail 50 | Select-String "test"
```

### Logs attendus (Succès)

```
[INFO] Printing test ticket
[INFO] Sending test print job to printer...
[INFO] Test print command executed, result: [Buffer/Success]
[INFO] Test ticket printed successfully
```

### Logs attendus (Échec)

```
[ERROR] Printer not initialized
OU
[ERROR] Test print execute failed: [Error details]
OU
[ERROR] Failed to print test ticket: [Error details]
```

## Comparaison : Test Ticket vs Test Windows

| Critère | Test Ticket POSPlus | Test Windows |
|---------|---------------------|--------------|
| Source | Application POSPlus | Pilote Windows |
| Format | ESC/POS thermique 80mm | Format standard |
| Données | Ticket fictif formaté | Page de test générique |
| Diagnostic | Teste toute la chaîne (app→printer) | Teste uniquement pilote→printer |

**Si Windows fonctionne mais POSPlus échoue** → Problème dans la connexion/commandes ESC/POS de l'application

## Prochaines Étapes

### Si le test réussit sur MacBook
✅ L'imprimante PDF fonctionne correctement
✅ Le formatage du ticket est correct
✅ Les commandes ESC/POS sont valides
→ **Prêt pour tester sur POS Windows**

### Si le test échoue sur POS Windows
❌ Consulter les logs détaillés
❌ Vérifier la configuration de l'interface
❌ Tester avec différentes méthodes de connexion
→ **Voir [PRINTER_WINDOWS_FIX.md](./PRINTER_WINDOWS_FIX.md)**

## Support

**Logs Mac** :
```bash
tail -f ~/Library/Logs/POSPlus/main.log | grep -i "print\|test"
```

**Logs Windows** :
```powershell
Get-Content "$env:APPDATA\POSPlus\logs\main.log" -Wait -Tail 20
```

**Rechercher des problèmes spécifiques** :
```bash
# Mac
grep -i "error\|fail" ~/Library/Logs/POSPlus/main.log

# Windows
Select-String "error|fail" "$env:APPDATA\POSPlus\logs\main.log"
```
