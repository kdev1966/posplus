# Instructions de Test P2P - Connexion Multi-Machines

## 🎯 Objectif
Tester la connexion P2P et la synchronisation entre votre MacBook et PC Windows.

## 📋 Prérequis
- ✅ MacBook et PC Windows sur le même réseau WiFi/LAN
- ✅ Port 3030 autorisé dans le pare-feu Windows
- ✅ Code à jour sur les deux machines (`git pull origin main`)
- ✅ Build effectué sur les deux machines (`npm run build:electron`)

---

## 🚀 Étape 1 : Démarrage des Applications

### Sur MacBook
```bash
cd ~/Desktop/ReactProjects/posplus
npm run dev
```

**Attendez** : 2 fenêtres s'ouvrent (Main + Customer Display)

### Sur PC Windows
```powershell
cd M:\Users\dell\OneDrive\Bureau\posplus
npm run dev
```

**Attendez** : 2 fenêtres s'ouvrent (Main + Customer Display)

---

## 🔍 Étape 2 : Vérifier la Découverte P2P

### Sur MacBook
1. **Login** : `admin` / `admin123`
2. **Aller dans** : Settings (Paramètres) → Section "Synchronisation P2P"
3. **Vérifier** :
   ```
   État du serveur P2P: ✓ En ligne

   Machines découvertes:
   - POSPlus-DESKTOP-XXXX (192.168.x.x) [En ligne]
   ```

### Sur PC Windows
1. **Login** : `admin` / `admin123`
2. **Aller dans** : Settings → Section "Synchronisation P2P"
3. **Vérifier** :
   ```
   État du serveur P2P: ✓ En ligne

   Machines découvertes:
   - POSPlus-MacBook (192.168.x.x) [En ligne]
   ```

---

## ✅ Étape 3 : Vérifier la Connexion WebSocket

### Ce Qui Doit Apparaître

**AVANT FIX** (❌) :
```
Synchronisation:
  Pairs connectés: 0 / 1  ❌ Pas de connexion
```

**APRÈS FIX** (✅) :
```
Synchronisation:
  Pairs connectés: 1 / 1  ✅ Connexion établie
```

### Si "Pairs connectés: 0 / 1"

**Vérifier les logs** (voir section Diagnostic ci-dessous)

---

## 🧪 Étape 4 : Test de Synchronisation

### Test 1 : Synchronisation Produit (MacBook → Windows)

**Sur MacBook** :
1. Aller dans **POS**
2. Cliquer sur **"Ajouter produit"**
3. Créer un produit :
   ```
   Nom: Coca Cola 1L
   Prix: 2.50
   Catégorie: Boissons
   Stock: 100
   ```
4. **Sauvegarder**

**Sur PC Windows** :
1. Aller dans **POS**
2. **Vérifier** : Le produit "Coca Cola 1L" devrait apparaître automatiquement
3. **Temps attendu** : < 2 secondes

**✅ Résultat Attendu** : Produit visible sur Windows sans refresh

---

### Test 2 : Synchronisation Stock (Windows → MacBook)

**Sur PC Windows** :
1. Dans **POS**, trouver "Coca Cola 1L"
2. Cliquer sur "Modifier stock"
3. Retirer **5 unités** (100 → 95)
4. **Sauvegarder**

**Sur MacBook** :
1. Dans **POS**, vérifier "Coca Cola 1L"
2. **Stock devrait afficher** : 95

**✅ Résultat Attendu** : Stock synchronisé instantanément

---

### Test 3 : Synchronisation Ticket (MacBook → Windows)

**Sur MacBook** :
1. Dans **POS**, créer une vente :
   - Ajouter "Coca Cola 1L" x 2
   - Paiement : Espèces 10€
   - **Valider**

**Sur PC Windows** :
1. Aller dans **Historique des ventes**
2. **Vérifier** : Le dernier ticket devrait apparaître

**✅ Résultat Attendu** : Ticket synchronisé avec tous les détails

---

## 🐛 Diagnostic en Cas de Problème

### Problème : "Pairs connectés: 0 / 1"

#### 1. Vérifier les Adresses IP

**Dans Settings → P2P**, vérifier le format d'adresse :

✅ **Bon** : `192.168.1.10` (IPv4)
❌ **Mauvais** : `fe80::1234:5678:90ab:cdef` (IPv6 sans fix)

Si vous voyez IPv6, le fix n'est pas appliqué. Faire :
```bash
git pull origin main
npm run build:electron
```

#### 2. Vérifier les Logs

**Sur MacBook** :
```bash
tail -f ~/Library/Logs/POSPlus/main.log | grep "P2P:"
```

**Sur Windows** :
```powershell
Get-Content "$env:APPDATA\POSPlus\logs\main.log" -Tail 20 | Select-String "P2P:"
```

**Logs attendus** :
```
P2P: Discovered peer POSPlus-DESKTOP-ABC at 192.168.1.10:3030
P2P: Attempting to connect to POSPlus-DESKTOP-ABC at 192.168.1.10:3030
P2P: Connected to peer POSPlus-DESKTOP-ABC
```

**Si erreur WebSocket** :
```
P2P: Connection error with POSPlus-DESKTOP-ABC: Error: connect ECONNREFUSED
```
→ Vérifier pare-feu Windows (voir ci-dessous)

#### 3. Vérifier Pare-feu Windows

```powershell
# Autoriser port 3030
New-NetFirewallRule -DisplayName "POSPlus P2P" -Direction Inbound -Protocol TCP -LocalPort 3030 -Action Allow

# Vérifier port actif
netstat -ano | findstr :3030
```

**Résultat attendu** :
```
TCP    0.0.0.0:3030           0.0.0.0:0              LISTENING       12345
```

#### 4. Vérifier Réseau

**Les 2 machines doivent être sur le même réseau** :

**MacBook** :
```bash
ifconfig | grep "inet "
```

**Windows** :
```powershell
ipconfig | findstr "IPv4"
```

**Vérifier** : Les deux adresses sont dans le même sous-réseau
- ✅ Bon : `192.168.1.10` et `192.168.1.20`
- ❌ Mauvais : `192.168.1.10` et `10.0.0.5`

---

## 📊 Résultats de Test - Checklist

### Découverte P2P
- [ ] MacBook voit PC Windows dans "Machines découvertes"
- [ ] PC Windows voit MacBook dans "Machines découvertes"
- [ ] Adresses affichées sont IPv4 (192.168.x.x)

### Connexion WebSocket
- [ ] MacBook : "Pairs connectés: 1 / 1"
- [ ] PC Windows : "Pairs connectés: 1 / 1"
- [ ] Logs montrent "Connected to peer"

### Synchronisation Produits
- [ ] Produit créé sur MacBook apparaît sur Windows
- [ ] Latence < 2 secondes
- [ ] Toutes les données correctes (nom, prix, stock)

### Synchronisation Stock
- [ ] Modification stock sur Windows synchronisée vers MacBook
- [ ] Latence < 2 secondes
- [ ] Quantité exacte

### Synchronisation Tickets
- [ ] Vente sur MacBook apparaît dans historique Windows
- [ ] Tous les détails présents (produits, montants, paiement)
- [ ] Latence < 5 secondes

---

## ✅ Si Tous les Tests Passent

**🎉 Félicitations !** La Phase 2 est terminée.

### Prochaines Étapes

**Phase 3** : Installation POS Principal
- Installer application sur POS Windows réel
- Configurer imprimante thermique
- Configurer écran client externe
- Tester en mode standalone

**Phase 4** : Installation PC Portable Gérant
- Installer sur laptop
- Tester synchronisation 3 machines (MacBook + POS + Laptop)

Voir [DEPLOYMENT_ROADMAP.md](DEPLOYMENT_ROADMAP.md) pour la suite.

---

## 📞 Support

En cas de problème persistant :

1. **Vérifier** : [P2P_CONNECTION_FIX.md](P2P_CONNECTION_FIX.md)
2. **Logs** : Partager les logs de `main.log` (les 50 dernières lignes)
3. **Network** : Confirmer même sous-réseau
4. **Pare-feu** : Confirmer port 3030 autorisé

---

**Date** : 2025-11-20
**Version** : Après commit `b02090c`
**Phase** : Phase 2 - Test PC Windows
