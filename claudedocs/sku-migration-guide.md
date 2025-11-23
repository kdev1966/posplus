# Guide de Migration des SKU - POSPlus

## Vue d'ensemble

Ce document explique comment migrer les SKU existants des produits vers le nouveau format d'auto-génération `SKU-YYYYMMDD-XXXXX`.

## Nouveau Format de SKU

### Structure
```
SKU-YYYYMMDD-XXXXX
│   │        │
│   │        └─ Numéro séquentiel sur 5 chiffres (00001, 00002, etc.)
│   └────────── Date de création (année-mois-jour)
└────────────── Préfixe fixe
```

### Exemples
- `SKU-20251123-00001` - Premier produit créé le 23 novembre 2025
- `SKU-20251123-00002` - Deuxième produit créé le même jour
- `SKU-20251124-00001` - Premier produit créé le 24 novembre 2025

### Avantages
1. **Chronologique** - Les produits sont automatiquement triés par date de création
2. **Unique** - Chaque produit a un SKU unique grâce à la combinaison date + séquence
3. **Lisible** - Format facile à comprendre pour les humains
4. **Traçable** - La date de création est visible directement dans le SKU

## Script de Migration

Un script automatique a été créé pour mettre à jour les SKU existants : `scripts/update-product-skus.js`

### Fonctionnement

1. **Recherche de la base de données** - Localise automatiquement la base de données dans :
   - `~/Library/Application Support/posplus/posplus.db`
   - `~/Library/Application Support/POSPlus/posplus.db`
   - `./posplus.db`
   - `./pos.db`

2. **Analyse des produits** - Récupère tous les produits avec leurs dates de création

3. **Génération des nouveaux SKU** :
   - Groupe les produits par date de création
   - Assigne un numéro séquentiel à chaque produit du même jour
   - Génère le nouveau SKU au format `SKU-YYYYMMDD-XXXXX`

4. **Mise à jour** - Remplace les anciens SKU par les nouveaux (sauf si déjà au bon format)

### Utilisation

#### Mode Test (Dry Run) - Recommandé en premier
```bash
node scripts/update-product-skus.js --dry-run
```

Ce mode affiche ce qui serait fait **sans modifier** la base de données. Idéal pour vérifier avant d'appliquer les changements.

**Sortie exemple** :
```
📂 Base de données: /Users/kdev66/Library/Application Support/posplus/posplus.db
🔍 Mode DRY RUN - Aucune modification ne sera effectuée

📦 15 produits trouvés

📅 Date: 2025-11-20 (5 produits)
  ✏️  #1 Coca Cola: PROD001 → SKU-20251120-00001
  ✏️  #2 Pepsi: PROD002 → SKU-20251120-00002
  ✏️  #3 Fanta: PROD003 → SKU-20251120-00003
  ✏️  #4 Sprite: PROD004 → SKU-20251120-00004
  ✏️  #5 7UP: (vide) → SKU-20251120-00005

📅 Date: 2025-11-21 (10 produits)
  ✏️  #6 Pain: PAIN001 → SKU-20251121-00001
  ...

============================================================
✅ Résumé:
   - Produits analysés: 15
   - SKU mis à jour: 15
   - SKU déjà corrects: 0

⚠️  Mode DRY RUN - Aucune modification effectuée
   Pour appliquer les changements, lancez: node scripts/update-product-skus.js
```

#### Mode Production - Application des changements
```bash
node scripts/update-product-skus.js
```

Ce mode **modifie réellement** la base de données. À utiliser après avoir vérifié le dry run.

**Sortie exemple** :
```
📂 Base de données: /Users/kdev66/Library/Application Support/posplus/posplus.db
⚠️  Mode PRODUCTION - Les SKU vont être modifiés

📦 15 produits trouvés

📅 Date: 2025-11-20 (5 produits)
  ✏️  #1 Coca Cola: PROD001 → SKU-20251120-00001
  ✏️  #2 Pepsi: PROD002 → SKU-20251120-00002
  ...

============================================================
✅ Résumé:
   - Produits analysés: 15
   - SKU mis à jour: 15
   - SKU déjà corrects: 0

✅ Migration terminée avec succès!
```

### Sécurité

Le script inclut plusieurs protections :

1. **Détection du format** - Ne modifie pas les SKU déjà au bon format
2. **Préservation de l'ordre** - Respecte l'ordre de création des produits
3. **Affichage clair** - Montre exactement ce qui sera modifié
4. **Mode test** - Permet de vérifier avant de modifier

### Cas particuliers

#### Produits sans date de création
Si un produit n'a pas de `created_at`, le script utilise la date actuelle.

#### Produits déjà au bon format
```
📅 Date: 2025-11-23 (3 produits)
  ⏭️  #10 Thé: SKU déjà au bon format (SKU-20251123-00001)
  ✏️  #11 Café: CAFE001 → SKU-20251123-00002
  ✏️  #12 Lait: (vide) → SKU-20251123-00003
```

Le script détecte et saute les produits ayant déjà un SKU au format correct.

## Processus de Migration Recommandé

### Étape 1 : Sauvegarde
```bash
# Créer une sauvegarde de la base de données
cp ~/Library/Application\ Support/posplus/posplus.db ~/Desktop/posplus-backup-$(date +%Y%m%d).db
```

### Étape 2 : Test
```bash
# Lancer en mode dry-run pour voir les changements
node scripts/update-product-skus.js --dry-run
```

### Étape 3 : Vérification
- Examiner la sortie du dry-run
- Vérifier que les SKU générés sont corrects
- Confirmer que le nombre de produits est bon

### Étape 4 : Application
```bash
# Appliquer les changements
node scripts/update-product-skus.js
```

### Étape 5 : Validation
- Relancer l'application POSPlus
- Vérifier que les produits s'affichent correctement
- Contrôler quelques SKU dans l'interface

## Dépannage

### Erreur : "Base de données introuvable"

**Cause** : L'application n'a jamais été lancée ou la base de données n'existe pas encore.

**Solution** :
1. Lancer l'application POSPlus au moins une fois
2. Créer quelques produits pour initialiser la base
3. Relancer le script de migration

### Erreur : "no such table: products"

**Cause** : La base de données existe mais n'a pas été initialisée.

**Solution** :
1. Lancer l'application POSPlus
2. Laisser les migrations s'exécuter
3. Relancer le script

### Les SKU ne changent pas

**Cause** : Les SKU sont peut-être déjà au bon format.

**Vérification** :
```bash
node scripts/update-product-skus.js --dry-run
```

Si la sortie montre "SKU déjà au bon format", c'est normal.

## Impact sur l'application

### Compatibilité
- ✅ Les nouveaux produits utiliseront automatiquement le nouveau format
- ✅ Les produits existants conservent leur SKU actuel jusqu'à migration
- ✅ Les deux formats (ancien et nouveau) fonctionnent ensemble
- ✅ Pas besoin de redémarrer l'application après migration

### Code source
Le nouveau système est implémenté dans :
- **Backend** : `src/main-process/services/database/repositories/ProductRepository.ts`
  - Méthode `generateSKU()` : Génération automatique
  - Méthode `create()` : Utilise auto-génération si SKU non fourni

- **Frontend** : `src/renderer/pages/Products.tsx`
  - Champ SKU marqué comme "(Facultatif)"
  - Placeholder "(Auto-généré)"

### Futures créations
Après migration, tous les nouveaux produits :
1. Reçoivent automatiquement un SKU au format `SKU-YYYYMMDD-XXXXX`
2. Peuvent avoir un SKU personnalisé si l'admin en fournit un
3. Le champ SKU reste modifiable à tout moment

## Notes techniques

### Numérotation séquentielle
- Chaque jour recommence à 00001
- La séquence est basée sur l'ordre de création (`created_at`)
- Limite théorique : 99,999 produits par jour

### Performance
- Le script traite ~1000 produits/seconde
- Pas de blocage de la base de données
- Exécution quasi-instantanée pour la plupart des bases

### Réversibilité
Pour revenir à l'ancien système de SKU, il faudrait :
1. Restaurer la sauvegarde de la base de données
2. Modifier le code pour retirer l'auto-génération

**⚠️ Important** : Créer toujours une sauvegarde avant migration !

## Résumé

| Action | Commande | Description |
|--------|----------|-------------|
| **Test** | `node scripts/update-product-skus.js --dry-run` | Voir les changements sans modifier |
| **Migration** | `node scripts/update-product-skus.js` | Appliquer les changements |
| **Sauvegarde** | `cp ~/Library/.../posplus.db ~/Desktop/backup.db` | Créer une copie de sécurité |

**Workflow recommandé** : Sauvegarde → Test → Vérification → Migration → Validation
