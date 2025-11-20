# Synchronisation Initiale Complète P2P (Full Sync)

## 🎯 Objectif

Synchroniser automatiquement toutes les données existantes (produits, catégories) d'une machine vers une autre lors de la première connexion P2P.

## 📋 Problème Résolu

**Avant** :
- MacBook a 50 produits et 10 catégories
- PC Windows connecté en P2P mais base de données vide
- Seulement les **nouvelles** modifications sont synchronisées
- ❌ Les données existantes ne sont pas partagées

**Après** :
- MacBook a 50 produits et 10 catégories
- PC Windows se connecte en P2P
- ✅ **Full sync automatique** : PC Windows reçoit immédiatement les 50 produits et 10 catégories
- ✅ Toutes les modifications futures synchronisées en temps réel

---

## 🔄 Comment Ça Fonctionne

### Déclenchement Automatique

La synchronisation complète se déclenche **automatiquement** quand :
1. Une nouvelle machine se connecte via P2P
2. La connexion WebSocket est établie avec succès
3. Le callback `requestFullSync(peerId)` est appelé

### Flux de Synchronisation

```
PC Windows (vide)                          MacBook (avec données)
      |                                           |
      |-------- 1. Connexion WebSocket --------->|
      |                                           |
      |<------- 2. Connected (ws.open) ----------|
      |                                           |
      |-------- 3. full-sync-request ----------->|
      |          { type: 'full-sync-request' }    |
      |                                           |
      |                        4. Récupère toutes les données
      |                           - ProductRepository.findAll()
      |                           - CategoryRepository.findAll()
      |                                           |
      |<------- 5. full-sync-response -----------|
      |          {                                |
      |            products: [50 items],          |
      |            categories: [10 items]         |
      |          }                                |
      |                                           |
  6. Applique les données                        |
     - Vérifie si existe déjà                    |
     - Crée si manquant                          |
     - Préserve les IDs                          |
      |                                           |
      |-------- 7. Sync terminée ✅              |
```

---

## 💻 Implémentation Technique

### 1. Messages P2P Étendus

**Type SyncMessage** :
```typescript
export interface SyncMessage {
  id: string
  type: 'ticket' | 'product' | 'stock' | 'customer' | 'user' | 'payment'
       | 'full-sync-request'   // ← Nouveau
       | 'full-sync-response'  // ← Nouveau
  action: 'create' | 'update' | 'delete' | 'sync'  // ← 'sync' ajouté
  data: any
  timestamp: string
  sourcePos: string
}
```

### 2. requestFullSync() - Demande de Synchronisation

```typescript
private requestFullSync(peerId: string): void {
  const message: SyncMessage = {
    id: uuidv4(),
    type: 'full-sync-request',
    action: 'sync',
    data: { requestedBy: this.getPosId() },
    timestamp: new Date().toISOString(),
    sourcePos: this.getPosId(),
  }

  const ws = this.connections.get(peerId)
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message))
  }
}
```

**Appelé automatiquement** dans [SyncService.ts:82](../src/main-process/services/p2p/SyncService.ts#L82) :
```typescript
ws.on('open', () => {
  log.info(`P2P: Connected to peer ${peer.name}`)
  this.connections.set(peer.id, ws)

  // Envoyer message de synchronisation initiale
  this.requestFullSync(peer.id)  // ← Automatique !
})
```

### 3. handleFullSyncRequest() - Réponse avec Données

```typescript
private handleFullSyncRequest(message: SyncMessage): void {
  // Récupérer TOUTES les données locales
  const ProductRepository = require('../database/repositories/ProductRepository').default
  const CategoryRepository = require('../database/repositories/CategoryRepository').default

  const products = ProductRepository.findAll()      // Tous les produits
  const categories = CategoryRepository.findAll()   // Toutes les catégories

  // Envoyer au demandeur
  const responseMessage: SyncMessage = {
    id: uuidv4(),
    type: 'full-sync-response',
    action: 'sync',
    data: {
      products,
      categories,
      syncedAt: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
    sourcePos: this.getPosId(),
  }

  // Envoyer via WebSocket
  ws.send(JSON.stringify(responseMessage))
}
```

### 4. handleFullSyncResponse() - Application des Données

```typescript
private handleFullSyncResponse(message: SyncMessage): void {
  const { products, categories } = message.data

  // 1. Synchroniser les catégories AVANT les produits (foreign key)
  for (const category of categories) {
    const existing = CategoryRepository.findById(category.id)
    if (!existing) {
      CategoryRepository.createFromSync(category)  // Préserve l'ID
    }
  }

  // 2. Synchroniser les produits
  for (const product of products) {
    const existing = ProductRepository.findById(product.id)
    if (!existing) {
      ProductRepository.createFromSync(product)  // Préserve l'ID
    }
  }
}
```

### 5. CategoryRepository.createFromSync() - Nouveau

```typescript
createFromSync(categoryData: any): Category {
  const stmt = this.db.prepare(`
    INSERT INTO categories (id, name, description, parent_id, is_active, display_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    categoryData.id,              // ← Préserve l'ID exact
    categoryData.name,
    categoryData.description || null,
    categoryData.parentId || null,
    categoryData.isActive ? 1 : 0,
    categoryData.displayOrder || 0,
    categoryData.createdAt,
    categoryData.updatedAt
  )

  return this.findById(categoryData.id)
}
```

**Différence avec `create()` normal** :
- `create()` : Auto-increment ID (nouveau produit local)
- `createFromSync()` : **Préserve l'ID** de la machine source (synchronisation)

---

## 🧪 Test de la Fonctionnalité

### Scénario de Test

**Configuration initiale** :
- **MacBook** : 50 produits, 10 catégories
- **PC Windows** : Base de données vide

### Étapes

1. **Sur MacBook** :
   ```bash
   npm run dev
   # Login: admin / admin123
   ```

2. **Sur PC Windows** :
   ```powershell
   # Récupérer le code
   git pull origin main
   npm run build:electron

   # Lancer
   npm run dev
   # Login: admin / admin123
   ```

3. **Vérifier Connexion P2P** :
   - MacBook : Settings → P2P → "Pairs connectés: 1 / 1" ✅
   - Windows : Settings → P2P → "Pairs connectés: 1 / 1" ✅

4. **Vérifier Synchronisation** :
   - Windows : Aller dans **POS**
   - **Résultat attendu** : Les 50 produits et 10 catégories du MacBook apparaissent ! ✅

### Logs Attendus

**Sur Windows (demandeur)** :
```
P2P: Connected to peer POSPlus-MacBook
P2P: Requesting full sync from POS-MacBook-xxxxx
P2P: Full sync request sent to POS-MacBook-xxxxx
P2P: Received full-sync-response/sync from POS-MacBook-xxxxx
P2P: Handling full sync response from POS-MacBook-xxxxx
P2P: Category synced: Boissons (ID: 1)
P2P: Category synced: Snacks (ID: 2)
...
P2P: Product synced: Coca Cola 1L (ID: 1)
P2P: Product synced: Chips Salées (ID: 2)
...
P2P: Full sync completed - Created 10 categories and 50 products
```

**Sur MacBook (répondeur)** :
```
P2P: New connection from 192.168.1.20
P2P: Received full-sync-request/sync from POS-Windows-xxxxx
P2P: Handling full sync request from POS-Windows-xxxxx
P2P: Full sync response sent with 50 products and 10 categories
```

---

## 🔍 Vérification dans l'Application

### Sur PC Windows (après sync)

1. **POS** :
   - Voir tous les produits du MacBook
   - Organisés par catégories
   - Prix, stock, descriptions identiques

2. **Gestion Produits** :
   - Liste complète des produits
   - Filtres par catégorie fonctionnels

3. **Dashboard** :
   - Statistiques cohérentes
   - Données synchronisées

---

## ⚙️ Configuration et Personnalisation

### Désactiver Full Sync (si besoin)

Commenter dans [SyncService.ts:85](../src/main-process/services/p2p/SyncService.ts#L85) :
```typescript
ws.on('open', () => {
  log.info(`P2P: Connected to peer ${peer.name}`)
  this.connections.set(peer.id, ws)

  // this.requestFullSync(peer.id)  // ← Désactivé
})
```

### Ajouter Plus de Types de Données

Pour synchroniser d'autres entités (clients, utilisateurs, etc.) :

1. **Modifier `handleFullSyncRequest()`** :
   ```typescript
   const customers = CustomerRepository.findAll()
   const users = UserRepository.findAll()

   data: {
     products,
     categories,
     customers,    // ← Ajouté
     users,        // ← Ajouté
   }
   ```

2. **Modifier `handleFullSyncResponse()`** :
   ```typescript
   const { products, categories, customers, users } = message.data

   // Synchroniser customers
   for (const customer of customers) {
     if (!CustomerRepository.findById(customer.id)) {
       CustomerRepository.createFromSync(customer)
     }
   }
   ```

3. **Ajouter `createFromSync()` aux repositories** si manquant

---

## 🐛 Troubleshooting

### Problème : "Pas de synchronisation"

**Vérifier** :
1. Connexion P2P établie : "Pairs connectés: 1 / 1"
2. Logs contiennent "Requesting full sync"
3. Pas d'erreur dans logs

**Solution** :
```bash
# Vérifier logs
tail -f ~/Library/Logs/POSPlus/main.log | grep "full sync"
```

### Problème : "Données partiellement synchronisées"

**Causes possibles** :
- Erreur SQL (foreign key constraint)
- Catégories synchronisées après produits

**Solution** :
L'ordre est important ! Catégories **AVANT** produits (ligne 363-378 dans SyncService.ts)

### Problème : "IDs dupliqués"

**Cause** :
La machine avait déjà créé des données avec les mêmes IDs

**Solution** :
```sql
-- Supprimer base locale avant sync
DELETE FROM products;
DELETE FROM categories;
```

Ou démarrer avec base vide sur la nouvelle machine.

---

## 📊 Performance

### Temps de Synchronisation

| Données | Temps Attendu |
|---------|---------------|
| 10 catégories + 50 produits | < 1 seconde |
| 50 catégories + 500 produits | < 5 secondes |
| 100 catégories + 1000 produits | < 10 secondes |

### Optimisations Possibles

Si performance insuffisante :

1. **Batch Inserts** :
   ```typescript
   // Au lieu de boucles individuelles
   const stmt = this.db.prepare('INSERT INTO...')
   const insertMany = this.db.transaction((items) => {
     for (const item of items) stmt.run(item)
   })
   insertMany(products)
   ```

2. **Compression** :
   ```typescript
   import zlib from 'zlib'

   // Compresser avant envoi
   const compressed = zlib.gzipSync(JSON.stringify(data))
   ws.send(compressed)
   ```

---

## ✅ Résumé

### Fonctionnalités Implémentées

- ✅ Synchronisation automatique lors de connexion
- ✅ Transfert complet produits + catégories
- ✅ Préservation des IDs (cohérence multi-machines)
- ✅ Vérification anti-doublons
- ✅ Logging détaillé pour debug
- ✅ Ordre correct (catégories avant produits)

### Fichiers Modifiés

| Fichier | Modifications |
|---------|---------------|
| [SyncService.ts](../src/main-process/services/p2p/SyncService.ts) | Type étendu, 3 nouvelles méthodes |
| [CategoryRepository.ts](../src/main-process/services/database/repositories/CategoryRepository.ts) | Méthode `createFromSync()` |

### Prochaines Étapes

1. ✅ Tester sur Windows PC
2. ⏳ Synchroniser d'autres entités (clients, sessions)
3. ⏳ Ajouter synchronisation différentielle (timestamp-based)
4. ⏳ Implémenter résolution de conflits

---

**Date** : 2025-11-20
**Commit** : À créer
**Phase** : Phase 2 - Test PC Windows
**Status** : ✅ Implémenté, prêt pour test
