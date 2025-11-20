# Guide de Test P2P - POSPlus

## 🎯 Objectif

Tester la synchronisation P2P (Peer-to-Peer) entre 2 instances de POSPlus sur le même réseau local.

---

## 📋 Prérequis

### Matériel
- 2 ordinateurs sur le même réseau WiFi/LAN
  - **POS 1**: Bureau/Desktop
  - **POS 2**: Laptop/Portable

### Logiciels
- Node.js installé sur les 2 machines
- POSPlus cloné sur les 2 machines

---

## 🔧 Configuration Initiale

### Sur POS 1 (Desktop)

```bash
cd /chemin/vers/posplus

# Installer les dépendances
npm install

# Build le projet
npm run build
```

Vérifier que la config est créée automatiquement dans:
- **Dev**: `~/.config/Electron/pos-config.json` (Linux/Mac) ou `%APPDATA%/Electron/pos-config.json` (Windows)
- **Prod**: `~/.config/POSPlus/pos-config.json`

### Sur POS 2 (Laptop)

Répéter les mêmes étapes sur la deuxième machine.

---

## 🚀 Lancement des 2 Instances

### Terminal 1 (POS 1 - Desktop)

```bash
npm run dev
```

**Vérifier dans les logs**:
```
P2P: Configuration loaded: POS-xxxxxxxx
P2P: Starting services...
P2P: Server started on port 3030
P2P: Advertising as POSPlus-[hostname] on port 3030
P2P: Discovery started
```

### Terminal 2 (POS 2 - Laptop)

```bash
npm run dev
```

**Vérifier dans les logs**:
```
P2P: Configuration loaded: POS-yyyyyyyy
P2P: Starting services...
P2P: Server started on port 3030
P2P: Advertising as POSPlus-[hostname] on port 3030
P2P: Discovery started
P2P: Discovered peer POSPlus-[POS1] at 192.168.x.x:3030
P2P: New peer discovered: POSPlus-[POS1]
P2P: Connected to peer POSPlus-[POS1]
P2P: Services started successfully
```

### Sur POS 1, vous devriez voir:

```
P2P: Discovered peer POSPlus-[POS2] at 192.168.x.x:3030
P2P: New connection from ::ffff:192.168.x.x
P2P: Connected to peer POSPlus-[POS2]
```

---

## ✅ Tests de Découverte

### Test 1: Vérifier la Découverte Automatique

**Objectif**: Les 2 POS doivent se découvrir automatiquement

**Procédure**:
1. Lancer POS 1
2. Attendre 5 secondes
3. Lancer POS 2
4. Attendre 5 secondes

**Résultat attendu**:
- POS 1 logs: `P2P: Discovered peer POSPlus-[POS2]`
- POS 2 logs: `P2P: Discovered peer POSPlus-[POS1]`
- POS 1 logs: `P2P: Connected to peer POSPlus-[POS2]`
- POS 2 logs: `P2P: Connected to peer POSPlus-[POS1]`

**Status**: ✅ / ❌

---

### Test 2: Vérifier le Statut P2P dans l'UI

**Procédure**:
1. Sur POS 1: Ouvrir l'application
2. Se connecter (admin/admin123)
3. Observer le coin inférieur gauche de la sidebar

**Résultat attendu**:
- Indicateur vert avec texte: "1 pair(s) connecté(s)"

**Status**: ✅ / ❌

---

## 🔄 Tests de Synchronisation

### Test 3: Synchronisation des Ventes (À implémenter - Phase 2)

**Objectif**: Une vente sur POS 1 doit apparaître sur POS 2

**Procédure**:
1. Sur POS 1: Créer une vente
   - Aller dans POS
   - Ajouter produit: "Café" x 2
   - Finaliser paiement (Cash: 10 DT)
2. Sur POS 2: Vérifier historique des ventes
   - Aller dans Tickets
   - Chercher la vente créée

**Résultat attendu**:
- POS 1 logs: `P2P: Broadcast ticket/create to 1 peer(s)`
- POS 2 logs: `P2P: Received ticket/create from POS-xxxxxxxx`
- POS 2 logs: `P2P: Synced new ticket TK-...`
- La vente apparaît dans l'historique de POS 2

**Status**: ⏳ À implémenter

---

### Test 4: Synchronisation des Stocks (À implémenter - Phase 2)

**Objectif**: Modification de stock sur POS 1 visible sur POS 2

**Procédure**:
1. Noter le stock initial du produit "Café" sur les 2 POS
2. Sur POS 1: Vendre 5 unités de "Café"
3. Sur POS 2: Vérifier le stock du produit "Café"

**Résultat attendu**:
- Stock initial: 100 unités
- Après vente sur POS 1: 95 unités
- Sur POS 2: Le stock affiche aussi 95 unités

**Status**: ⏳ À implémenter

---

### Test 5: Synchronisation des Produits (À implémenter - Phase 2)

**Objectif**: Nouveau produit créé sur POS 2 visible sur POS 1

**Procédure**:
1. Sur POS 2: Créer nouveau produit
   - Nom: "Jus d'Orange"
   - Prix: 4.50 DT
   - Stock: 50
   - Catégorie: Boissons
2. Sur POS 1: Aller dans liste des produits
3. Chercher "Jus d'Orange"

**Résultat attendu**:
- POS 2 logs: `P2P: Broadcast product/create to 1 peer(s)`
- POS 1 logs: `P2P: Received product/create from POS-yyyyyyyy`
- POS 1 logs: `P2P: Synced new product Jus d'Orange`
- Le produit apparaît dans la liste de POS 1

**Status**: ⏳ À implémenter

---

## 🔌 Tests de Reconnexion

### Test 6: Déconnexion/Reconnexion Réseau

**Objectif**: Reconnexion automatique après perte de réseau

**Procédure**:
1. Les 2 POS sont connectés
2. Sur POS 2: Désactiver WiFi
3. Attendre 10 secondes
4. Sur POS 2: Réactiver WiFi
5. Attendre 10 secondes

**Résultat attendu**:
- Après désactivation WiFi:
  - POS 1 logs: `P2P: Connection closed from ::ffff:192.168.x.x`
  - POS 1 logs: `P2P: Peer POSPlus-[POS2] went offline`
  - UI POS 1: "0 pair(s) connecté(s)"

- Après réactivation WiFi:
  - POS 2 logs: `P2P: Discovered peer POSPlus-[POS1]`
  - POS 2 logs: `P2P: Connected to peer POSPlus-[POS1]`
  - UI POS 1: "1 pair(s) connecté(s)"
  - UI POS 2: "1 pair(s) connecté(s)"

**Status**: ✅ / ❌

---

### Test 7: Redémarrage d'un POS

**Objectif**: Reconnexion automatique après redémarrage

**Procédure**:
1. Les 2 POS sont connectés
2. Fermer POS 2 (Ctrl+C dans terminal)
3. Attendre 5 secondes
4. Relancer POS 2: `npm run dev`
5. Attendre 10 secondes

**Résultat attendu**:
- Après fermeture:
  - POS 1 logs: `P2P: Peer POSPlus-[POS2] went offline`
  - UI POS 1: "0 pair(s) connecté(s)"

- Après relance:
  - POS 2 logs: `P2P: Discovered peer POSPlus-[POS1]`
  - POS 2 logs: `P2P: Connected to peer POSPlus-[POS1]`
  - UI POS 1: "1 pair(s) connecté(s)"
  - UI POS 2: "1 pair(s) connecté(s)"

**Status**: ✅ / ❌

---

## 🛠️ Tests de Configuration

### Test 8: Vérifier la Configuration Auto-générée

**Procédure**:
1. Lancer POSPlus pour la première fois
2. Vérifier que `pos-config.json` est créé

**Emplacement**:
- **Development (Electron)**:
  - Windows: `%APPDATA%\Electron\pos-config.json`
  - Mac: `~/Library/Application Support/Electron/pos-config.json`
  - Linux: `~/.config/Electron/pos-config.json`

- **Production (POSPlus)**:
  - Windows: `%APPDATA%\POSPlus\pos-config.json`
  - Mac: `~/Library/Application Support/POSPlus/pos-config.json`
  - Linux: `~/.config/POSPlus/pos-config.json`

**Contenu attendu**:
```json
{
  "posId": "POS-xxxxxxxx",
  "posName": "POSPlus-[hostname]",
  "posType": "desktop",
  "p2p": {
    "enabled": true,
    "port": 3030,
    "discoveryEnabled": true,
    "autoSync": true,
    "reconnectInterval": 5000
  },
  "createdAt": "2025-11-20T..."
}
```

**Status**: ✅ / ❌

---

## 🐛 Dépannage

### Problème: Les POS ne se découvrent pas

**Vérifications**:
1. Les 2 POS sont sur le même réseau WiFi/LAN
2. Le port 3030 n'est pas bloqué par le firewall
3. Les logs montrent "P2P: Server started on port 3030"

**Solutions**:
```bash
# Windows: Autoriser port 3030
netsh advfirewall firewall add rule name="POSPlus P2P" dir=in action=allow protocol=TCP localport=3030

# Mac/Linux: Vérifier firewall
sudo ufw allow 3030/tcp  # Linux
# Mac: Aller dans Préférences Système > Sécurité > Firewall
```

---

### Problème: "EADDRINUSE: address already in use :::3030"

**Cause**: Un autre processus utilise le port 3030

**Solutions**:
```bash
# Trouver le processus qui utilise le port 3030
# Windows
netstat -ano | findstr :3030

# Mac/Linux
lsof -i :3030

# Tuer le processus
# Windows
taskkill /PID <PID> /F

# Mac/Linux
kill -9 <PID>
```

---

### Problème: "Cannot find module 'ws'" ou "Cannot find module 'bonjour-service'"

**Cause**: Dépendances P2P non installées

**Solution**:
```bash
npm install ws bonjour-service uuid
npm install --save-dev @types/ws @types/uuid
```

---

## 📊 Résultats des Tests

| Test | Description | Status | Notes |
|------|-------------|--------|-------|
| 1 | Découverte automatique | ⏳ | À tester |
| 2 | Statut P2P dans UI | ⏳ | À tester |
| 3 | Sync ventes | ⏳ | Phase 2 |
| 4 | Sync stocks | ⏳ | Phase 2 |
| 5 | Sync produits | ⏳ | Phase 2 |
| 6 | Reconnexion réseau | ⏳ | À tester |
| 7 | Redémarrage POS | ⏳ | À tester |
| 8 | Config auto | ⏳ | À tester |

---

## 📝 Notes de Test

### Session du [Date]

**Testeur**: [Nom]

**Configuration**:
- POS 1: [OS, IP]
- POS 2: [OS, IP]
- Réseau: [WiFi/LAN]

**Observations**:
- [Notes libres]

**Problèmes rencontrés**:
- [Liste des problèmes]

**Actions correctives**:
- [Actions entreprises]

---

## ✅ Phase 1 - Checklist de Validation

- [ ] Les dépendances P2P sont installées (ws, bonjour-service, uuid)
- [ ] Le serveur WebSocket démarre sur le port 3030
- [ ] Le service de découverte mDNS s'annonce correctement
- [ ] Les 2 POS se découvrent automatiquement
- [ ] Les 2 POS se connectent via WebSocket
- [ ] Le statut P2P est visible dans l'UI
- [ ] La reconnexion automatique fonctionne
- [ ] La configuration est auto-générée correctement
- [ ] Les logs P2P sont clairs et informatifs

---

## 🚀 Prochaines Étapes

Une fois la Phase 1 validée, passer à:

### Phase 2: Synchronisation des Données
- Intégrer P2P avec TicketRepository
- Intégrer P2P avec ProductRepository
- Intégrer P2P avec CustomerRepository
- Tester sync ventes, stocks, produits

### Phase 3: Interface Utilisateur
- Créer composant P2PStatus
- Créer section P2P dans Settings
- Ajouter indicateur de synchronisation
- Afficher liste des pairs connectés

---

**Document créé**: 2025-11-20
**Version**: 1.0 - Phase 1
**Auteur**: Claude Code
