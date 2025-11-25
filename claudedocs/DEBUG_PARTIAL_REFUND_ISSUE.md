# Debug: Problème Ventes Totales après Remboursement Partiel

**Date**: 2025-11-24
**Problème rapporté**: Après remboursement partiel d'un seul produit, les "Ventes totales" dans l'historique déduisent le montant TOTAL du ticket au lieu du montant du produit remboursé.

---

## 🔴 Scénario du Problème

### Données de Test
```
Ticket #T20251124-0001:
├─ Produit A: 1 x 1.000 DT = 1.000 DT
└─ Produit B: 1 x 1.500 DT = 1.500 DT
TOTAL: 2.500 DT
```

### Actions
1. Créer le ticket ci-dessus
2. Faire un remboursement partiel: **Rembourser uniquement Produit A (1.000 DT)**

### Comportement Attendu ✅
```
Ventes totales AVANT remboursement: 100.000 DT (exemple)
Ventes totales APRÈS remboursement: 99.000 DT (100 - 1 DT remboursé)

Différence: -1.000 DT ✅ CORRECT
```

### Comportement Observé ❌
```
Ventes totales AVANT remboursement: 100.000 DT
Ventes totales APRÈS remboursement: 97.500 DT (100 - 2.5 DT)

Différence: -2.500 DT ❌ INCORRECT (déduit tout le ticket au lieu du produit remboursé)
```

---

## 🔍 Logs de Diagnostic Ajoutés

J'ai ajouté des `console.log()` dans le calcul des ventes totales pour identifier exactement ce qui se passe:

```typescript
// src/renderer/pages/History.tsx (lignes 61-71)
const totalSales = filteredTickets.reduce((sum, ticket) => {
  if (ticket.status === 'completed' || ticket.status === 'partially_refunded') {
    console.log(`[TOTAL SALES] Ticket #${ticket.ticketNumber} - Status: ${ticket.status} - Amount: ${ticket.totalAmount} DT`)
    return sum + ticket.totalAmount
  }
  if (ticket.status === 'refunded' || ticket.status === 'cancelled') {
    console.log(`[TOTAL SALES] Ticket #${ticket.ticketNumber} - Status: ${ticket.status} - EXCLUDED`)
  }
  return sum
}, 0)
console.log(`[TOTAL SALES] FINAL TOTAL: ${totalSales} DT`)
```

---

## 🧪 Procédure de Test

### Étape 1: Préparer l'environnement
```bash
# 1. Lancer l'application en mode dev
npm run dev

# 2. Ouvrir la console développeur (F12 ou Cmd+Option+I)
```

### Étape 2: Noter les ventes totales AVANT
```
1. Aller dans "Historique des Ventes"
2. Noter le montant affiché dans "Ventes totales: XXX DT"
3. Exemple: "Ventes totales: 100.000 DT"
```

### Étape 3: Créer un ticket de test
```
1. Aller dans "Ventes"
2. Créer un nouveau ticket:
   - Produit A: Quantité = 1, Prix = 1.000 DT
   - Produit B: Quantité = 1, Prix = 1.500 DT
   - TOTAL = 2.500 DT
3. Payer en cash et valider
4. Noter le numéro du ticket (ex: T20251124-0005)
```

### Étape 4: Vérifier les ventes totales intermédiaires
```
1. Retourner dans "Historique des Ventes"
2. Vérifier les logs dans la console
3. Vérifier "Ventes totales" affiché
4. Devrait être: Ancien total + 2.500 DT
5. Exemple: "Ventes totales: 102.500 DT" ✅
```

### Étape 5: Faire le remboursement partiel
```
1. Trouver le ticket créé (T20251124-0005)
2. Cliquer sur "Rembourser"
3. Modal s'ouvre avec:
   ☑ Produit A - Qty: 1 (coché)
   ☑ Produit B - Qty: 1 (coché)

4. **DÉCOCHER** Produit B (ou mettre quantité à 0)
5. Garder seulement:
   ☑ Produit A - Qty: 1 (1.000 DT à rembourser)

6. Entrer motif: "Test remboursement partiel"
7. Cliquer "Confirmer"
```

### Étape 6: Analyser les logs
```
1. Regarder la console développeur
2. Chercher les logs "[TOTAL SALES]"

LOGS ATTENDUS:
[TOTAL SALES] Ticket #T20251124-0001 - Status: completed - Amount: 50.000 DT
[TOTAL SALES] Ticket #T20251124-0002 - Status: completed - Amount: 30.000 DT
[TOTAL SALES] Ticket #T20251124-0005 - Status: partially_refunded - Amount: 1.500 DT ✅
[TOTAL SALES] FINAL TOTAL: 81.500 DT

LOGS POSSIBLEMENT INCORRECTS:
[TOTAL SALES] Ticket #T20251124-0005 - Status: partially_refunded - Amount: 2.500 DT ❌
OU
[TOTAL SALES] Ticket #T20251124-0005 - Status: refunded - EXCLUDED ❌
```

### Étape 7: Vérifier les ventes totales APRÈS
```
Calcul attendu:
- Avant: 102.500 DT
- Remboursé: 1.000 DT
- Après: 101.500 DT ✅

Si vous voyez:
- Après: 100.000 DT ❌ (a déduit 2.500 DT au lieu de 1.000 DT)
```

---

## 🐛 Causes Possibles

### Hypothèse 1: `totalAmount` pas mis à jour dans la DB
```
Le ticket dans la base de données a toujours:
total_amount = 2.500 DT (ancien montant)

Au lieu de:
total_amount = 1.500 DT (après remboursement de 1 DT)
```

**Vérification**: Regarder le log `[TOTAL SALES]` pour le ticket remboursé.
- Si Amount = 2.500 DT → Problème backend (DB pas mise à jour)
- Si Amount = 1.500 DT → Problème ailleurs

### Hypothèse 2: Ticket exclu du calcul
```
Le ticket avec status = 'partially_refunded' est EXCLU du calcul
```

**Vérification**: Regarder si le log `[TOTAL SALES]` apparaît pour le ticket remboursé.
- Si log présent avec bon montant → OK
- Si log absent → Ticket exclu (problème de filtre)

### Hypothèse 3: Données en cache non rafraîchies
```
loadHistory() ne recharge pas les données fraîches depuis la DB
```

**Vérification**: Après le remboursement, faire F5 (refresh page) et vérifier si le problème persiste.
- Si F5 corrige le problème → Problème de cache/refresh
- Si F5 ne corrige pas → Problème DB ou backend

### Hypothèse 4: Vue SQL exclut les tickets partiels
```
La vue v_daily_sales utilisée pour le dashboard exclut 'partially_refunded'
```

**Note**: On a déjà corrigé la vue SQL dans la migration 009, mais peut-être que l'historique n'utilise pas la vue?

---

## 🔧 Corrections Possibles

### Si Hypothèse 1 (DB pas mise à jour)
**Problème**: Le `UPDATE tickets SET total_amount = ?` ne fonctionne pas.

**Fix**: Vérifier dans `TicketRepository.partialRefund()` que la mise à jour est bien exécutée.

```typescript
// Vérifier lignes 510-515
const updateStmt = this.db.prepare(`
  UPDATE tickets
  SET subtotal = ?, total_amount = ?, status = ?, notes = ?
  WHERE id = ?
`)
const result = updateStmt.run(newSubtotal, newTotalAmount, newStatus, reason, id)
console.log('[DEBUG] Ticket updated:', result.changes, 'row(s)')  // Ajouter ce log
```

### Si Hypothèse 2 (Ticket exclu)
**Problème**: Le `if (ticket.status === 'completed' || ticket.status === 'partially_refunded')` ne match pas.

**Fix**: Vérifier que le statut est bien `'partially_refunded'` et pas autre chose.

```typescript
// Ajouter un log pour tous les tickets
console.log('[ALL TICKETS]', tickets.map(t => ({
  number: t.ticketNumber,
  status: t.status,
  amount: t.totalAmount
})))
```

### Si Hypothèse 3 (Cache)
**Problème**: `getAllTickets()` retourne des données en cache.

**Fix**: Forcer le reload complet.

```typescript
// Dans confirmRefund(), ajouter un petit délai
if (success) {
  alert(t('ticketRefundSuccess'))
  setIsRefundModalOpen(false)
  setTicketToRefund(null)
  setRefundReason('')
  setSelectedLines({})
  setTimeout(() => loadHistory(), 500)  // Délai pour laisser DB se mettre à jour
}
```

### Si Hypothèse 4 (Vue SQL)
**Problème**: L'historique utilise une vue SQL non mise à jour.

**Fix**: Vérifier que `getAllTickets()` ne passe pas par une vue SQL.

---

## 📋 Rapport de Test à Fournir

Après avoir suivi la procédure de test, fournir ces informations:

```
=== RAPPORT DE TEST ===

1. Ventes totales AVANT remboursement: _______ DT
2. Ticket créé: #_______
   - Produit A: 1 x 1.000 DT
   - Produit B: 1 x 1.500 DT
   - TOTAL: 2.500 DT

3. Ventes totales APRÈS création ticket: _______ DT

4. Remboursement effectué: Produit A uniquement (1.000 DT)

5. Logs console (copier-coller les logs [TOTAL SALES]):
   [Coller ici]

6. Ventes totales APRÈS remboursement: _______ DT

7. Différence observée: _______ DT

8. Comportement:
   [ ] ✅ CORRECT: Différence = -1.000 DT
   [ ] ❌ INCORRECT: Différence = -2.500 DT
   [ ] ❌ AUTRE: Différence = _______ DT

9. Après F5 (refresh page):
   [ ] Problème persiste
   [ ] Problème corrigé
   [ ] Autre: ______________
```

---

## 🎯 Prochaines Étapes

1. **Lancer l'application** avec `npm run dev`
2. **Suivre la procédure de test** ci-dessus
3. **Copier les logs** de la console
4. **Fournir le rapport de test** avec tous les détails
5. **Je pourrai alors identifier** la cause exacte et proposer le fix approprié

---

**Note**: Les logs ajoutés sont temporaires pour le diagnostic. Une fois le problème identifié et corrigé, on les supprimera pour garder le code propre.
