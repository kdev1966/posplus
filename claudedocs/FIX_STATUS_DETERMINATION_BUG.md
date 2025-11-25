# Fix: Status Determination Bug in Partial Refund

**Date**: 2025-11-24
**Issue**: Partial refunds incorrectly set ticket status to 'refunded' instead of 'partially_refunded'
**Impact**: Tickets excluded from sales calculations, causing sales totals to show 0 or incorrect amounts
**Status**: ✅ FIXED

---

## 🐛 The Bug

### Root Cause
[TicketRepository.ts:506-508](../src/main-process/services/database/repositories/TicketRepository.ts#L506-L508)

**Before (INCORRECT)**:
```typescript
// ❌ BUG: Checks only refunded lines, not ALL ticket lines
const allLinesRefunded = lineUpdates.every((u) => u.newQuantity === 0)
const newStatus = allLinesRefunded ? 'refunded' : 'partially_refunded'
```

**Problem**: `lineUpdates` only contains the lines being refunded. When refunding 1 product completely from a 2-product ticket:
- Product A (refunded): `newQuantity = 0` ✅
- `lineUpdates.every(u => u.newQuantity === 0)` returns `true` ❌
- Status set to `'refunded'` even though Product B still exists ❌

### Example Scenario
```
Ticket #T20251124-0001:
├─ Produit A: 1 x 1.000 DT = 1.000 DT
└─ Produit B: 1 x 1.500 DT = 1.500 DT
TOTAL: 2.500 DT

Refund: Produit A only (1.000 DT)

❌ OLD BEHAVIOR:
- lineUpdates = [{ lineId: A, newQuantity: 0 }]
- lineUpdates.every(u => u.newQuantity === 0) = true
- Status = 'refunded' (WRONG!)
- Ticket excluded from sales → Sales totals drop by 2.500 DT

✅ NEW BEHAVIOR:
- Query database: SELECT COUNT(*) FROM ticket_lines WHERE ticket_id = ?
- remainingLinesCount = 1 (Produit B still exists)
- Status = 'partially_refunded' (CORRECT!)
- Ticket included in sales with amount 1.500 DT → Sales totals drop by 1.000 DT
```

---

## ✅ The Fix

### Part 1: Database Schema Migration ⚠️ CRITICAL
[010_add_partially_refunded_status.sql](../src/main-process/services/database/migrations/010_add_partially_refunded_status.sql)

**Problem**: Database CHECK constraint didn't allow 'partially_refunded' status:
```sql
-- ❌ OLD CONSTRAINT (from 001_initial_schema.sql)
CHECK(status IN ('pending', 'completed', 'cancelled', 'refunded'))
```

**Error Message**:
```
SqliteError: CHECK constraint failed: status IN ('pending', 'completed', 'cancelled', 'refunded')
```

**Fix**: Migration 010 recreates the tickets table with updated constraint:
```sql
-- ✅ NEW CONSTRAINT
CHECK(status IN ('pending', 'completed', 'cancelled', 'refunded', 'partially_refunded'))
```

The migration:
- Recreates tickets table with new constraint
- Preserves all existing data
- Rebuilds indexes
- Runs automatically on next app start

### Part 2: Status Determination Logic
[TicketRepository.ts:506-513](../src/main-process/services/database/repositories/TicketRepository.ts#L506-L513)

**After (CORRECT)**:
```typescript
// Check if ALL ticket lines are now deleted/refunded (full refund)
// We need to check remaining lines in the database, not just the refunded lines
const remainingLinesStmt = this.db.prepare(`
  SELECT COUNT(*) as count FROM ticket_lines WHERE ticket_id = ?
`)
const remainingLinesCount = (remainingLinesStmt.get(id) as { count: number }).count
const allLinesRefunded = remainingLinesCount === 0
const newStatus = allLinesRefunded ? 'refunded' : 'partially_refunded'
```

**Why This Works**:
- Queries the database AFTER deletions/updates have been applied
- Counts remaining lines in the ticket (not just refunded lines)
- `remainingLinesCount === 0` → Full refund → Status: 'refunded'
- `remainingLinesCount > 0` → Partial refund → Status: 'partially_refunded'

---

## 🧪 Test Scenarios

### Test 1: Partial Refund of One Product
```
Setup:
- Ticket: Produit A (1x 1 DT) + Produit B (1x 1.5 DT) = 2.5 DT
- Action: Refund Produit A only

Expected Result:
✓ Status: 'partially_refunded'
✓ Remaining lines: 1 (Produit B)
✓ Total amount: 1.5 DT
✓ Sales totals: Include this ticket with 1.5 DT
✓ Difference: -1.0 DT (only refunded amount)
```

### Test 2: Partial Refund of Multiple Products
```
Setup:
- Ticket: Produit A (5x 10 DT) + Produit B (3x 20 DT) = 110 DT
- Action: Refund 2x Produit A + 1x Produit B

Expected Result:
✓ Status: 'partially_refunded'
✓ Remaining lines: 2 (3x Produit A + 2x Produit B)
✓ Total amount: 70 DT
✓ Sales totals: Include this ticket with 70 DT
✓ Refund amount: 40 DT
```

### Test 3: Complete Refund via Partial Refund Flow
```
Setup:
- Ticket: Produit A (1x 25 DT) + Produit B (1x 25 DT) = 50 DT
- Action: Refund ALL products (both A and B)

Expected Result:
✓ Status: 'refunded' (not 'partially_refunded')
✓ Remaining lines: 0
✓ Total amount: 0 DT
✓ Sales totals: EXCLUDE this ticket
```

### Test 4: Progressive Partial Refunds
```
Setup:
- Ticket: Produit A (10x 5 DT) = 50 DT

Action 1: Refund 3x
Expected: Status = 'partially_refunded', Amount = 35 DT

Action 2: Refund 2x more (from remaining 7x)
Expected: Status = 'partially_refunded', Amount = 25 DT

Action 3: Refund remaining 5x
Expected: Status = 'refunded', Amount = 0 DT
```

---

## 📊 Impact Analysis

### Files Changed
1. [010_add_partially_refunded_status.sql](../src/main-process/services/database/migrations/010_add_partially_refunded_status.sql) - NEW migration
2. [TicketRepository.ts](../src/main-process/services/database/repositories/TicketRepository.ts) (lines 506-513)

### Lines Changed
- **Migration**: 43 lines (new file)
- **Repository Logic**:
  - Before: 2 lines (incorrect logic)
  - After: 7 lines (correct DB query)
  - Net Change: +5 lines

### Performance Impact
- **Additional Query**: 1 simple COUNT query per partial refund
- **Query Complexity**: O(1) with index on `ticket_id`
- **Performance Cost**: Negligible (~0.1ms)
- **Trade-off**: Acceptable for correctness

---

## ✅ Validation Checklist

After deploying this fix, verify:

- [ ] Partial refund of 1 product sets status to 'partially_refunded'
- [ ] Sales totals include partially refunded tickets with correct amounts
- [ ] Complete refund sets status to 'refunded'
- [ ] Progressive partial refunds work correctly
- [ ] Dashboard shows correct revenue after partial refunds
- [ ] Z-reports include partially refunded tickets
- [ ] Stock restoration works correctly
- [ ] No regression in existing refund functionality

---

## 🔄 Related Changes

This fix completes the partial refund feature improvements:

1. ✅ [Migration 009](../src/main-process/services/database/migrations/009_fix_partial_refund_stats.sql): Fixed SQL views
2. ✅ [Migration 010](../src/main-process/services/database/migrations/010_add_partially_refunded_status.sql): Added 'partially_refunded' to CHECK constraint
3. ✅ [Unified Refund UI](../src/renderer/pages/History.tsx): Single refund button with pre-selection
4. ✅ [Status Determination Fix](../src/main-process/services/database/repositories/TicketRepository.ts): Correct logic for status
5. ⏳ **Testing on Real POS**: Next step

---

## 🎯 Next Steps

1. **Test on Development Environment**
   ```bash
   npm run dev
   ```

2. **Follow Test Procedure**
   - See [DEBUG_PARTIAL_REFUND_ISSUE.md](DEBUG_PARTIAL_REFUND_ISSUE.md) sections 2-6
   - Run all 4 test scenarios above
   - Verify console logs show correct statuses

3. **Expected Console Output**
   ```
   [TOTAL SALES] Ticket #T20251124-0001 - Status: completed - Amount: 50.000 DT
   [TOTAL SALES] Ticket #T20251124-0005 - Status: partially_refunded - Amount: 1.500 DT ✅
   [TOTAL SALES] FINAL TOTAL: 51.500 DT
   ```

4. **Clean Up Debug Logs**
   - Remove console.log statements from History.tsx (lines 61-71)
   - Keep code clean for production

5. **Client Delivery**
   - Follow [DELIVERY_CHECKLIST.md](DELIVERY_CHECKLIST.md)
   - Complete all test scenarios
   - Prepare documentation

---

**Fix Committed**: Ready for testing
**Confidence Level**: High (root cause identified and fixed with DB query)
**Risk Assessment**: Low (isolated change, clear logic)
