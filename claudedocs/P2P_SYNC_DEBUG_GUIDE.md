# Guide de Debug - Synchronisation P2P

## 🔍 Diagnostic Rapide

Si les machines sont connectées mais pas de synchronisation automatique, suivez ces étapes :

### Étape 1 : Vérifier la Connexion P2P

**Sur les DEUX machines** :

1. Login : `admin` / `admin123`
2. Settings → Section "Synchronisation P2P"
3. Vérifier :
   ```
   État du serveur P2P: ✓ En ligne
   Pairs connectés: 1 / 1  ← DOIT être 1/1
   ```

**Si "Pairs connectés: 0 / 1"** :
- Problème de connexion WebSocket
- Voir [P2P_CONNECTION_FIX.md](P2P_CONNECTION_FIX.md)

---

### Étape 2 : Vérifier les Logs de Synchronisation

**Sur MacBook** :
```bash
tail -100 ~/Library/Logs/POSPlus/main.log | grep "P2P:"
```

**Sur Windows** :
```powershell
Get-Content "$env:APPDATA\POSPlus\logs\main.log" -Tail 100 | Select-String "P2P:"
```

**Logs attendus lors de la connexion** :

```
P2P: Connected to peer POSPlus-XXXXXX
P2P: Requesting full sync from POS-XXXXXX-xxxxx
P2P: Full sync request sent to POS-XXXXXX-xxxxx
```

**Logs attendus lors de la réception** :

```
P2P: Received full-sync-request/sync from POS-XXXXXX-xxxxx
P2P: Handling full sync request from POS-XXXXXX-xxxxx
P2P: Local data - 10 products, 3 categories
P2P: Full sync response sent with 10 products and 3 categories
```

---

### Étape 3 : Forcer une Nouvelle Connexion

**Actions** :

1. **Fermer les DEUX applications**
2. **Sur MacBook - Lancer en premier** :
   ```bash
   npm run dev
   ```
3. **Attendre 5 secondes** (important!)
4. **Sur Windows - Lancer ensuite** :
   ```powershell
   npm run dev
   ```

**Pourquoi cet ordre ?**
- MacBook a les données (produits/catégories)
- Windows doit se connecter APRÈS pour demander la synchronisation
- Windows enverra `full-sync-request` au MacBook
- MacBook répondra avec les données

---

## 🔎 Scénarios de Debug

### Scénario 1 : Pas de "Requesting full sync" dans les Logs

**Symptôme** :
```
P2P: Connected to peer POSPlus-XXXXXX
← Manque : P2P: Requesting full sync
```

**Cause** : Le code ne s'exécute pas correctement

**Solution** :
```bash
# Vérifier que le build est à jour
git pull origin main
npm run build:electron

# Relancer
npm run dev
```

---

### Scénario 2 : "Requesting full sync" mais Pas de Réponse

**Symptôme** :
```
# Sur Windows
P2P: Requesting full sync from POS-MacBook-xxxxx
P2P: Full sync request sent to POS-MacBook-xxxxx

# Sur MacBook
← Rien ! Aucun log "Received full-sync-request"
```

**Cause** : Message WebSocket perdu ou non reçu

**Solution** :

1. Vérifier WebSocket ouvert :
   ```bash
   # Sur les 2 machines, dans les logs
   grep "Connected to peer" main.log
   ```

2. Tester l'envoi manuel :
   - Créer un produit sur MacBook
   - Vérifier s'il apparaît sur Windows
   - Si oui → WebSocket fonctionne, problème spécifique à full-sync
   - Si non → WebSocket ne fonctionne pas du tout

---

### Scénario 3 : Réponse Reçue mais Données Vides

**Symptôme** :
```
P2P: Received 0 categories and 0 products
P2P: Full sync completed - Created 0 categories and 0 products
```

**Cause** : MacBook n'a pas de données OU envoie des données vides

**Solution** :

1. **Sur MacBook**, vérifier nombre de produits :
   ```bash
   # Dans l'app : POS → compter les produits visibles
   ```

2. **Vérifier logs MacBook** :
   ```bash
   grep "Local data" ~/Library/Logs/POSPlus/main.log
   # Devrait afficher : P2P: Local data - X products, Y categories
   ```

3. **Si "Local data - 0 products"** :
   - MacBook n'a vraiment pas de données
   - Créer quelques produits manuellement
   - Redémarrer Windows pour redemander sync

---

### Scénario 4 : Données Reçues mais Non Créées

**Symptôme** :
```
P2P: Received 10 categories and 50 products
P2P: Starting category sync (10 items)
← Erreurs SQL ou aucun log "✓ Category synced"
```

**Cause** : Erreur lors de l'insertion en base de données

**Solution** :

1. **Vérifier erreurs SQL** :
   ```powershell
   Get-Content "$env:APPDATA\POSPlus\logs\main.log" -Tail 200 | Select-String "error|Error|ERROR"
   ```

2. **Erreur commune : "UNIQUE constraint failed"** :
   - Données déjà présentes avec même ID
   - Solution : Supprimer base Windows et recommencer
   ```powershell
   # Fermer l'app
   # Supprimer
   del "$env:APPDATA\POSPlus\posplus.db"
   # Relancer l'app
   npm run dev
   ```

---

## 🛠️ Tests de Validation

### Test 1 : Connexion Simple

```bash
# Sur MacBook
tail -f ~/Library/Logs/POSPlus/main.log | grep "P2P:"
```

```powershell
# Sur Windows (dans un autre terminal)
npm run dev
```

**Attendu dans logs MacBook** :
```
P2P: New connection from 192.168.x.x
P2P: Received full-sync-request/sync from POS-Windows-xxxxx
```

---

### Test 2 : Vérifier Nombre de Produits

**Sur MacBook** :
```sql
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM categories;
```

**Sur Windows (après sync)** :
```sql
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM categories;
```

**Résultat attendu** : Mêmes nombres !

---

### Test 3 : Resynchroniser

Si vous avez ajouté des produits sur MacBook APRÈS la première connexion :

**Sur Windows** :
1. Fermer l'application
2. Supprimer base de données :
   ```powershell
   del "$env:APPDATA\POSPlus\posplus.db"
   ```
3. Relancer :
   ```powershell
   npm run dev
   ```
4. La full sync devrait se refaire avec toutes les nouvelles données

---

## 📋 Checklist de Debug

### Avant de Contacter le Support

- [ ] ✅ Git pull effectué sur les DEUX machines
- [ ] ✅ npm run build:electron effectué sur les DEUX machines
- [ ] ✅ Les DEUX machines affichent "Pairs connectés: 1 / 1"
- [ ] ✅ Logs vérifiés sur les DEUX machines
- [ ] ✅ MacBook lancé EN PREMIER
- [ ] ✅ Windows lancé EN SECOND (après 5 sec)
- [ ] ✅ MacBook a effectivement des produits/catégories
- [ ] ✅ Base Windows supprimée et recréée

### Informations à Fournir

Si problème persiste, copier ces informations :

**MacBook - Logs P2P** :
```bash
tail -50 ~/Library/Logs/POSPlus/main.log | grep "P2P:"
```

**Windows - Logs P2P** :
```powershell
Get-Content "$env:APPDATA\POSPlus\logs\main.log" -Tail 50 | Select-String "P2P:"
```

**MacBook - Nombre de données** :
```
POS → compter produits visibles
```

**Settings → P2P - Screenshot des deux machines**

---

## 🔧 Solutions Rapides

### Problème : Rien ne se synchronise

**Solution 1 : Ordre de démarrage**
```bash
# 1. Fermer TOUT
# 2. MacBook : npm run dev
# 3. Attendre 5 secondes
# 4. Windows : npm run dev
```

**Solution 2 : Reset complet**
```powershell
# Sur Windows
del "$env:APPDATA\POSPlus\posplus.db"
npm run dev
```

**Solution 3 : Rebuild complet**
```bash
# Sur les DEUX machines
git pull origin main
rm -rf node_modules
npm install
npm run build
npm run dev
```

---

## 📊 Logs de Référence (Fonctionnement Normal)

### Windows (demandeur)
```
[16:30:00] P2P: Discovery started
[16:30:02] P2P: Discovered peer POSPlus-MacBook at 192.168.1.10:3030
[16:30:03] P2P: Attempting to connect to POSPlus-MacBook at 192.168.1.10:3030
[16:30:03] P2P: Connected to peer POSPlus-MacBook
[16:30:03] P2P: Requesting full sync from POS-MacBook-xxxxx
[16:30:03] P2P: Full sync request sent to POS-MacBook-xxxxx
[16:30:04] P2P: Received full-sync-response/sync from POS-MacBook-xxxxx
[16:30:04] P2P: Handling full sync response from POS-MacBook-xxxxx
[16:30:04] P2P: Received 10 categories and 50 products
[16:30:04] P2P: Starting category sync (10 items)
[16:30:04] P2P: ✓ Category synced: Boissons (ID: 1)
[16:30:04] P2P: ✓ Category synced: Snacks (ID: 2)
...
[16:30:05] P2P: Starting product sync (50 items)
[16:30:05] P2P: ✓ Product synced: Coca Cola 1L (ID: 1)
[16:30:05] P2P: ✓ Product synced: Chips Salées (ID: 2)
...
[16:30:06] P2P: ===== Full sync completed =====
[16:30:06] P2P: Created: 10 categories, 50 products
[16:30:06] P2P: Skipped (already exist): 0 categories, 0 products
```

### MacBook (répondeur)
```
[16:30:03] P2P: New connection from 192.168.1.20
[16:30:03] P2P: Received full-sync-request/sync from POS-Windows-xxxxx
[16:30:03] P2P: Handling full sync request from POS-Windows-xxxxx
[16:30:03] P2P: Local data - 50 products, 10 categories
[16:30:03] P2P: Full sync response sent with 50 products and 10 categories
```

---

**Date** : 2025-11-20
**Commit** : `79b7123`
**Status** : Logging amélioré pour diagnostic
