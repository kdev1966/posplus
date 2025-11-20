# Fix P2P Connection - IPv4/IPv6 Handling

## 🐛 Problème Identifié

### Symptômes
- mDNS discovery fonctionne : Les machines se voient dans "Machines découvertes"
- Mais WebSocket ne connecte pas : "Aucun pair connecté" (0 connected peers)

### Cause Racine

**PeerDiscovery retournait des adresses IPv6 par défaut** :
```typescript
// AVANT (❌)
address: service.addresses?.[0] || service.host
// Retournait souvent: fe80::1234:5678:90ab:cdef
```

**WebSocket en Node.js a des problèmes avec IPv6 brut** :
- `ws://fe80::xxxx:3030` → Erreur de parsing/connexion
- IPv6 nécessite brackets : `ws://[fe80::xxxx]:3030`
- IPv4 est plus simple et plus fiable : `ws://192.168.1.10:3030`

## ✅ Solution Implémentée

### 1. PeerDiscovery - Préférer IPv4

**Fichier** : `src/main-process/services/p2p/PeerDiscovery.ts`

**Changement** : Filtrer les adresses pour préférer IPv4
```typescript
// APRÈS (✅)
let address = service.host
if (service.addresses && service.addresses.length > 0) {
  // Find first IPv4 address (no colons)
  const ipv4 = service.addresses.find((addr: string) => !addr.includes(':'))
  address = ipv4 || service.addresses[0]
}
```

**Logique** :
1. Scanner toutes les adresses disponibles
2. Chercher une adresse IPv4 (pas de ":")
3. Fallback sur première adresse si pas d'IPv4

### 2. SyncService - Gérer IPv6 avec Brackets

**Fichier** : `src/main-process/services/p2p/SyncService.ts`

**Changement** : Formatter correctement les adresses IPv6
```typescript
// Format address for WebSocket (handle IPv6 with brackets)
let address = peer.address
if (address.includes(':') && !address.startsWith('[')) {
  // IPv6 address - add brackets
  address = `[${address}]`
}

log.info(`P2P: Attempting to connect to ${peer.name} at ${address}:${peer.port}`)
const ws = new WebSocket(`ws://${address}:${peer.port}`)
```

**Logique** :
1. Détecter si IPv6 (contient ":")
2. Ajouter brackets si nécessaire : `[fe80::xxxx]`
3. Logger tentative de connexion pour debug
4. Créer WebSocket avec adresse correctement formatée

## 🎯 Résultats Attendus

### Avant Fix
```
Machines découvertes:
  - POSPlus-DESKTOP-ABC (fe80::1234:5678) ❌ Visible mais non connecté

Synchronisation:
  État: ✓ En ligne
  Pairs connectés: 0 / 1  ❌
```

### Après Fix
```
Machines découvertes:
  - POSPlus-DESKTOP-ABC (192.168.1.10) ✅ Adresse IPv4

Synchronisation:
  État: ✓ En ligne
  Pairs connectés: 1 / 1  ✅
```

### Logs Attendus
```
P2P: Discovered peer POSPlus-DESKTOP-ABC at 192.168.1.10:3030
P2P: Attempting to connect to POSPlus-DESKTOP-ABC at 192.168.1.10:3030
P2P: Connected to peer POSPlus-DESKTOP-ABC
```

## 🧪 Tests à Effectuer

### Sur MacBook
```bash
# 1. Rebuild
npm run build:electron

# 2. Lancer
npm run dev

# 3. Vérifier logs
# Devrait voir: "Attempting to connect" puis "Connected to peer"
```

### Sur PC Windows
```powershell
# 1. Pull les changements
git pull origin main

# 2. Rebuild
npm run build:electron

# 3. Lancer
npm run dev

# 4. Vérifier dans Settings → P2P
# Devrait voir: "Pairs connectés: 1 / 1"
```

### Test Synchronisation
```
1. MacBook → Créer produit "Coca 1L"
2. PC Windows → Vérifier produit apparaît dans POS
3. PC Windows → Modifier stock -5
4. MacBook → Vérifier stock mis à jour
```

## 🔍 Diagnostic si Problème Persiste

### Vérifier Adresses Découvertes
```typescript
// Dans PeerDiscovery, après ligne 76
log.info(`P2P: All addresses for ${peer.name}: ${JSON.stringify(service.addresses)}`)
```

### Vérifier Erreurs WebSocket
```typescript
// Dans SyncService, après ligne 78
ws.on('error', (error) => {
  log.error(`P2P: WebSocket error details:`, error)
  log.error(`P2P: Failed address was: ${address}:${peer.port}`)
})
```

### Firewall
```bash
# MacBook
sudo lsof -i :3030

# Windows
netstat -ano | findstr :3030
```

## 📚 Références Techniques

### WebSocket Address Format
- IPv4: `ws://192.168.1.10:3030` ✅
- IPv6 avec brackets: `ws://[fe80::1234]:3030` ✅
- IPv6 sans brackets: `ws://fe80::1234:3030` ❌ Erreur

### mDNS/Bonjour Addresses
- `service.addresses` : Array de toutes les IP (IPv4 + IPv6)
- `service.host` : Hostname (.local)
- `service.port` : Port annoncé (3030)

### Node.js WebSocket Library
- Librairie: `ws` (npm package)
- IPv6 support: Nécessite brackets explicites
- Documentation: https://github.com/websockets/ws

## ✅ Commit Info

**Commit** : À créer
**Date** : 2025-11-20
**Fichiers Modifiés** :
- `src/main-process/services/p2p/PeerDiscovery.ts`
- `src/main-process/services/p2p/SyncService.ts`

**Message de Commit** :
```
fix: P2P WebSocket connection with IPv4/IPv6 handling

- PeerDiscovery now prefers IPv4 addresses for better WebSocket compatibility
- SyncService properly formats IPv6 addresses with brackets when needed
- Added connection attempt logging for easier debugging

Fixes issue where machines discovered via mDNS couldn't establish WebSocket connections.
```

## 🎉 Prochaines Étapes

Une fois la connexion établie :
1. ✅ Vérifier "Pairs connectés: 1 / 1" sur les deux machines
2. ✅ Tester synchronisation produits
3. ✅ Tester synchronisation tickets
4. ✅ Tester synchronisation stock
5. ✅ Passer à Phase 3 : Installation POS principal

---

**Status** : ✅ Fix implémenté, en attente de test
**Phase** : Phase 2 - Test PC Windows
**Priorité** : 🔴 CRITICAL - Bloquant pour déploiement
