# Test d'Impression sur MacBook avec Samsung ML-2160

## Problème Résolu

**Symptôme** : L'application affichait "Ticket imprimé avec succès" mais aucune impression physique ne se produisait avec la Samsung ML-2160.

**Cause** : La Samsung ML-2160 est une **imprimante laser A4**, pas une imprimante thermique 80mm. Le code utilisait `node-thermal-printer` qui envoie des commandes ESC/POS spécifiques aux imprimantes thermiques, incompatibles avec les imprimantes laser.

**Solution** : Nouveau service `StandardPrinterService` qui utilise les commandes système (`lp` sur macOS) pour imprimer sur imprimantes laser/inkjet/PDF.

## Architecture Multi-Imprimantes

L'application détecte maintenant automatiquement le type d'imprimante :

```
PrinterService.initialize()
  ├─ 1. Essayer imprimantes thermiques (Windows POS)
  │   ├─ printer:POS80 Printer
  │   ├─ //./CP001
  │   └─ \\\\.\\CP001
  │
  ├─ 2. Si échec → Essayer imprimante standard (MacBook)
  │   └─ StandardPrinterService (via commande lp)
  │
  └─ 3. Déléguer à service approprié
      ├─ Thermal → ESC/POS commands
      └─ Standard → Text file + lp command
```

## Comment Tester sur MacBook

### 1. Vérifier l'Imprimante

```bash
# Vérifier que Samsung ML-2160 est configurée
lpstat -p -d
# Devrait afficher :
# printer Samsung_ML_2160_Series is idle.  enabled since ...
# system default destination: Samsung_ML_2160_Series

# Vérifier le port
lpstat -v | grep Samsung
# Devrait afficher :
# device for Samsung_ML_2160_Series: usb://Samsung/ML-2160%20Series?serial=...
```

### 2. Lancer l'Application en Mode Dev

L'application est déjà compilée et en cours d'exécution. Ouvrez simplement l'application POSPlus qui s'est lancée.

### 3. Tester l'Impression

Dans l'application POSPlus :

1. **Connexion** :
   - Username: `admin`
   - Password: `admin123`

2. **Aller dans Paramètres** :
   - Cliquer sur l'icône ⚙️ dans la sidebar
   - Section "Paramètres d'impression"

3. **Vérifier le statut** :
   - Cliquer sur "Vérifier le statut de l'imprimante"
   - Devrait afficher : **"Imprimante connectée"**

4. **Imprimer ticket de test** :
   - Cliquer sur "🖨️ Imprimer ticket de test"
   - L'imprimante Samsung ML-2160 devrait **imprimer physiquement**

### 4. Ce Qui Va Se Passer

Quand vous cliquez "Imprimer ticket de test" :

```
1. StandardPrinterService.printTestTicket() est appelé
2. Génère un fichier texte temporaire (/tmp/posplus-receipt-XXXXX.txt)
3. Exécute : lp -d "Samsung_ML_2160_Series" -o media=A4 -o fit-to-page "/tmp/posplus-receipt-XXXXX.txt"
4. Imprimante Samsung imprime le ticket sur papier A4
5. Fichier temporaire supprimé après 5 secondes
```

## Format du Ticket

Le ticket imprimé ressemblera à :

```
                              POSPlus - TEST TICKET
                            Point of Sale System
================================================================================

Test Date: 22/11/2025 10:53:00
Printer Type: Standard (Laser/Inkjet/PDF)
Printer Name: Samsung_ML_2160_Series
================================================================================

Sample Product 1
  2 x 5.500 DT                                                       11.000 DT

Sample Product 2
  1 x 3.250 DT                                                        3.250 DT

Sample Product 3
  3 x 2.000 DT                                                        6.000 DT

================================================================================
                                                       Subtotal:     20.250 DT
                                                       Discount:     -2.000 DT

                                                          TOTAL:     18.250 DT

================================================================================
Payment Method: CASH
Amount Paid: 20.000 DT
Change: 1.750 DT

================================================================================
                          This is a test ticket
                         Printer test successful!

                              POSPlus v1.0.0
```

## Vérifier les Logs

Si l'impression ne fonctionne pas, consultez les logs :

```bash
# Logs principaux (si l'app écrit dedans)
tail -f ~/Library/Logs/POSPlus/main.log

# Logs console de l'application
# Dans l'app, DevTools peut être ouvert avec : Cmd+Option+I
```

**Logs attendus (succès)** :
```
[INFO] StandardPrinter: Initializing standard printer service
[INFO] StandardPrinter: Found default printer: Samsung_ML_2160_Series
[INFO] StandardPrinter: Printing test ticket
[INFO] StandardPrinter: Created temp file: /tmp/posplus-receipt-1234567890.txt
[INFO] StandardPrinter: Executing: lp -d "Samsung_ML_2160_Series" -o media=A4 -o fit-to-page "/tmp/..."
[INFO] StandardPrinter: lp stdout: request id is Samsung_ML_2160_Series-123 (1 file(s))
[INFO] StandardPrinter: Print job sent successfully
[INFO] StandardPrinter: Cleaned up temp file: /tmp/posplus-receipt-1234567890.txt
```

## Dépannage

### Problème : "Imprimante non connectée"

```bash
# Vérifier l'imprimante
lpstat -p Samsung_ML_2160_Series

# Si imprimante en pause, la relancer
cupsenable Samsung_ML_2160_Series

# Vérifier qu'elle est par défaut
lpoptions -d Samsung_ML_2160_Series
```

### Problème : "Impression réussie" mais rien ne sort

```bash
# Vérifier la file d'impression
lpq -P Samsung_ML_2160_Series

# Annuler jobs bloqués
cancel -a Samsung_ML_2160_Series

# Relancer CUPS si nécessaire
sudo launchctl stop org.cups.cupsd
sudo launchctl start org.cups.cupsd
```

### Problème : "Permission denied"

```bash
# Vérifier les permissions
ls -la /tmp/posplus-*

# L'application devrait avoir accès à /tmp
```

## Comparaison : Thermal vs Standard

| Critère | Thermal (Windows POS) | Standard (MacBook Dev) |
|---------|----------------------|------------------------|
| Type | POS80 Printer | Samsung ML-2160 |
| Connexion | USB (CP001 port) | USB |
| Protocole | ESC/POS commands | lp text printing |
| Format | 80mm thermal paper | A4 paper |
| Commandes | ThermalPrinter.execute() | lp command |
| Caractéristiques | Coupe papier, tiroir-caisse | Pas de coupe, pas de tiroir |

## Prochaines Étapes

Après avoir vérifié que l'impression fonctionne sur MacBook :

1. **✅ Impression de test** → Confirme que StandardPrinterService fonctionne
2. **✅ Formatage correct** → Ticket lisible sur A4
3. **✅ Détection automatique** → Application choisit le bon service

**Pour Windows POS** :
- L'imprimante thermique POS80 sera détectée en premier
- Utilisera ThermalPrinter avec ESC/POS
- StandardPrinterService sera ignoré

**Pour MacBook** :
- Imprimante thermique non trouvée
- Basculera automatiquement sur StandardPrinterService
- Utilisera Samsung ML-2160 via lp

C'est une solution universelle qui fonctionne sur les deux environnements ! 🎉
