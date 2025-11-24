# Analyse et Refactorisation du Système de Remboursement

**Date**: 2025-11-24
**Objectif**: Améliorer l'architecture du système de remboursement en appliquant les principes SOLID et DRY

---

## 1. Analyse de l'Implémentation Actuelle

### Architecture Actuelle

```
TicketRepository (Data Layer)
├── cancel(id, reason, userId)        // Annulation complète
├── refund(id, reason, userId)        // Remboursement complet
└── partialRefund(id, lines, reason)  // Remboursement partiel

TicketService (Business Layer)
├── cancelTicket()
├── refundTicket()
└── partialRefundTicket()
```

### Code Dupliqué Identifié

#### 1. **Validation de Ticket** (DRY Violation)
```typescript
// Dans cancel()
const ticket = this.findById(id)
if (!ticket) throw new Error('Ticket not found')
if (ticket.status !== 'completed') throw new Error('...')

// Dans refund()
const ticket = this.findById(id)
if (!ticket) throw new Error('Ticket not found')
if (ticket.status !== 'completed') throw new Error('...')

// Dans partialRefund()
const ticket = this.findById(id)
if (!ticket) throw new Error('Ticket not found')
if (ticket.status !== 'completed' && ticket.status !== 'partially_refunded') throw new Error('...')
```

**Duplication**: 3x la même logique de récupération et validation

#### 2. **Restauration de Stock** (DRY Violation)
```typescript
// Dans cancel() - lignes 362-370
for (const line of ticket.lines) {
  StockRepository.adjust(
    line.productId,
    line.quantity,
    'return',
    userId || ticket.userId,
    ticket.ticketNumber,
    `Annulation ticket ${ticket.ticketNumber}: ${reason}`
  )
}

// Dans refund() - lignes 401-410
for (const line of ticket.lines) {
  StockRepository.adjust(
    line.productId,
    line.quantity,
    'return',
    userId || ticket.userId,
    ticket.ticketNumber,
    `Remboursement ticket ${ticket.ticketNumber}: ${reason}`
  )
}

// Dans partialRefund() - lignes 467-474
StockRepository.adjust(
  originalLine.productId,
  refundLine.quantity,
  'return',
  userId || ticket.userId,
  ticket.ticketNumber,
  `Remboursement partiel ticket ${ticket.ticketNumber}: ${reason}`
)
```

**Duplication**: 3x la même logique de restauration avec seulement le message qui change

#### 3. **Mise à Jour de Status** (DRY Violation)
```typescript
// Dans cancel()
const updateStmt = this.db.prepare('UPDATE tickets SET status = ?, notes = ? WHERE id = ?')
const result = updateStmt.run('cancelled', reason, id)

// Dans refund()
const updateStmt = this.db.prepare('UPDATE tickets SET status = ?, notes = ? WHERE id = ?')
const result = updateStmt.run('refunded', reason, id)

// Dans partialRefund()
const updateStmt = this.db.prepare(`
  UPDATE tickets SET subtotal = ?, total_amount = ?, status = ?, notes = ? WHERE id = ?
`)
const result = updateStmt.run(newSubtotal, newTotalAmount, newStatus, reason, id)
```

**Duplication**: Même pattern de mise à jour avec variations mineures

#### 4. **Gestion des Transactions** (DRY Violation)
```typescript
// Pattern répété 3 fois
const transaction = this.db.transaction(() => {
  try {
    // ... logique métier
  } catch (error) {
    log.error('TicketRepository.XXX transaction failed:', error)
    throw error
  }
})
return transaction()
```

---

## 2. Violations des Principes SOLID

### **S - Single Responsibility Principle** ❌ VIOLATION

**Problème**: `TicketRepository` a trop de responsabilités:
- Gestion des données (accès DB)
- Logique métier de remboursement
- Calculs de montants
- Validation des règles métier
- Orchestration de stock

```typescript
partialRefund(id: number, lines: PartialRefundLineDTO[], reason: string, userId?: number) {
  // ❌ Responsabilité 1: Validation métier
  if (ticket.status !== 'completed' && ticket.status !== 'partially_refunded') {
    throw new Error('...')
  }

  // ❌ Responsabilité 2: Calculs financiers
  const lineRefundAmount = (originalLine.totalAmount / originalLine.quantity) * refundLine.quantity
  totalRefundAmount += lineRefundAmount

  // ❌ Responsabilité 3: Orchestration de stock
  StockRepository.adjust(...)

  // ❌ Responsabilité 4: Mise à jour DB
  updateLineStmt.run(update.newQuantity, newTotalAmount, update.lineId)
}
```

### **O - Open/Closed Principle** ❌ VIOLATION

**Problème**: Pour ajouter un nouveau type de remboursement (ex: remboursement avec frais), il faut modifier `TicketRepository`.

```typescript
// Impossible d'étendre sans modifier le code existant
// Pas de stratégie pattern, pas d'abstraction
```

### **L - Liskov Substitution Principle** ⚠️ ATTENTION

**Problème Potentiel**: Si on veut créer une version de `TicketRepository` avec des règles métier différentes, on ne peut pas substituer facilement.

### **I - Interface Segregation Principle** ❌ VIOLATION

**Problème**: `TicketRepository` expose trop de méthodes. Les clients doivent dépendre d'une interface gonflée:
- Certains clients n'ont besoin que de `cancel()`
- D'autres seulement de `refund()`
- Tous dépendent de l'interface complète

### **D - Dependency Inversion Principle** ❌ VIOLATION

**Problème**: `TicketRepository` dépend directement de `StockRepository` (implémentation concrète), pas d'une abstraction.

```typescript
// ❌ Dépendance directe sur l'implémentation
StockRepository.adjust(...)

// ✅ Devrait dépendre d'une interface
interface IStockService {
  restoreStock(line: TicketLine, reason: string): void
}
```

---

## 3. Problèmes de Maintenabilité

### 3.1 **Logique Métier dans le Repository**
❌ Le repository contient des règles métier complexes qui devraient être dans un service:
- Validation des quantités de remboursement
- Calculs de montants proportionnels
- Détermination du nouveau statut

### 3.2 **Calculs Répétés**
❌ Le calcul du prix unitaire est répété plusieurs fois:
```typescript
// Ligne 454
const lineRefundAmount = (originalLine.totalAmount / originalLine.quantity) * refundLine.quantity

// Ligne 497
const newTotalAmount = (originalLine.totalAmount / originalLine.quantity) * update.newQuantity
```

### 3.3 **Couplage Fort**
❌ `TicketRepository` est couplé à:
- `StockRepository` (restauration de stock)
- Structure de la DB (requêtes SQL inline)
- Logs (electron-log)
- Logique métier

### 3.4 **Testabilité Limitée**
❌ Difficile de tester unitairement:
- Transactions imbriquées
- Dépendances directes
- Pas d'injection de dépendances
- Logique métier mélangée avec accès DB

### 3.5 **Manque de Traçabilité**
⚠️ Les remboursements ne créent pas d'enregistrements de traçabilité dédiés:
- Pas de table `refunds` pour historiser
- Informations stockées seulement dans `notes`
- Difficile de générer des rapports de remboursement

---

## 4. Proposition d'Architecture Refactorisée

### 4.1 **Séparation des Responsabilités (SRP)**

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│                    (IPC Handlers)                           │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Application Layer                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  RefundOrchestrator (Façade Pattern)                 │  │
│  │  - orchestrateFullRefund()                           │  │
│  │  - orchestratePartialRefund()                        │  │
│  │  - orchestrateCancellation()                         │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    Domain Layer                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ RefundStrategy   │  │ RefundCalculator │                │
│  │ (Strategy)       │  │ (Service)        │                │
│  ├──────────────────┤  ├──────────────────┤                │
│  │ FullRefund       │  │ - calculateUnit  │                │
│  │ PartialRefund    │  │ - calculateTotal │                │
│  │ Cancellation     │  │ - applyDiscount  │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ RefundValidator  │  │ RefundAuditor    │                │
│  │ (Service)        │  │ (Service)        │                │
│  ├──────────────────┤  ├──────────────────┤                │
│  │ - validateStatus │  │ - logRefund      │                │
│  │ - validateQty    │  │ - trackHistory   │                │
│  │ - validateAuth   │  │ - generateReport │                │
│  └──────────────────┘  └──────────────────┘                │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                Infrastructure Layer                         │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ TicketRepository │  │ RefundRepository │                │
│  │ (Data Access)    │  │ (Data Access)    │                │
│  ├──────────────────┤  ├──────────────────┤                │
│  │ - findById()     │  │ - create()       │                │
│  │ - updateStatus() │  │ - findByTicket() │                │
│  │ - updateTotals() │  │ - findByDate()   │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ StockService     │  │ TransactionMgr   │                │
│  │ (Interface)      │  │ (Unit of Work)   │                │
│  ├──────────────────┤  ├──────────────────┤                │
│  │ - restoreStock() │  │ - beginTx()      │                │
│  │ - adjustStock()  │  │ - commit()       │                │
│  └──────────────────┘  │ - rollback()     │                │
│                        └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 **Design Patterns à Appliquer**

#### **1. Strategy Pattern** (Open/Closed)
```typescript
interface IRefundStrategy {
  canRefund(ticket: Ticket): boolean
  calculateRefundAmount(ticket: Ticket, data: any): number
  determineNewStatus(ticket: Ticket, data: any): TicketStatus
  getAuditMessage(ticket: Ticket, data: any): string
}

class FullRefundStrategy implements IRefundStrategy {
  canRefund(ticket: Ticket): boolean {
    return ticket.status === 'completed'
  }

  calculateRefundAmount(ticket: Ticket): number {
    return ticket.totalAmount
  }

  determineNewStatus(): TicketStatus {
    return 'refunded'
  }

  getAuditMessage(ticket: Ticket, reason: string): string {
    return `Remboursement complet: ${reason}`
  }
}

class PartialRefundStrategy implements IRefundStrategy {
  canRefund(ticket: Ticket): boolean {
    return ticket.status === 'completed' || ticket.status === 'partially_refunded'
  }

  calculateRefundAmount(ticket: Ticket, lines: PartialRefundLineDTO[]): number {
    return lines.reduce((total, refundLine) => {
      const line = ticket.lines.find(l => l.id === refundLine.lineId)!
      return total + (line.totalAmount / line.quantity) * refundLine.quantity
    }, 0)
  }

  determineNewStatus(ticket: Ticket, lines: PartialRefundLineDTO[]): TicketStatus {
    const allRefunded = lines.every(rl => {
      const line = ticket.lines.find(l => l.id === rl.lineId)!
      return rl.quantity === line.quantity
    })
    return allRefunded ? 'refunded' : 'partially_refunded'
  }

  getAuditMessage(ticket: Ticket, reason: string): string {
    return `Remboursement partiel: ${reason}`
  }
}
```

#### **2. Façade Pattern** (Simplification)
```typescript
class RefundOrchestrator {
  constructor(
    private validator: RefundValidator,
    private calculator: RefundCalculator,
    private ticketRepo: ITicketRepository,
    private refundRepo: IRefundRepository,
    private stockService: IStockService,
    private auditor: RefundAuditor,
    private txManager: ITransactionManager
  ) {}

  async executeRefund(
    ticketId: number,
    strategy: IRefundStrategy,
    data: RefundData,
    userId: number
  ): Promise<RefundResult> {
    return this.txManager.runInTransaction(async () => {
      // 1. Load & Validate
      const ticket = await this.ticketRepo.findById(ticketId)
      this.validator.validate(ticket, strategy, data)

      // 2. Calculate
      const refundAmount = this.calculator.calculate(ticket, strategy, data)

      // 3. Restore Stock
      await this.stockService.restoreStock(ticket, data, userId)

      // 4. Update Ticket
      const newStatus = strategy.determineNewStatus(ticket, data)
      await this.ticketRepo.updateAfterRefund(ticketId, refundAmount, newStatus)

      // 5. Audit Trail
      const refund = await this.refundRepo.create({
        ticketId,
        amount: refundAmount,
        type: strategy.constructor.name,
        userId,
        data
      })

      await this.auditor.logRefund(ticket, refund, strategy)

      return { success: true, refund, ticket }
    })
  }
}
```

#### **3. Repository Pattern** (Séparation des préoccupations)
```typescript
// ✅ Repository ne contient QUE l'accès aux données
interface ITicketRepository {
  findById(id: number): Promise<Ticket | null>
  updateStatus(id: number, status: TicketStatus, notes: string): Promise<void>
  updateTotals(id: number, subtotal: number, total: number): Promise<void>
  updateLine(lineId: number, quantity: number, amount: number): Promise<void>
  deleteLine(lineId: number): Promise<void>
}

// ✅ Nouvelle table pour tracer les remboursements
interface IRefundRepository {
  create(data: CreateRefundDTO): Promise<Refund>
  findByTicket(ticketId: number): Promise<Refund[]>
  findByDateRange(start: Date, end: Date): Promise<Refund[]>
  getTotalRefundedAmount(ticketId: number): Promise<number>
}
```

#### **4. Value Objects** (Immutabilité & Validations)
```typescript
class RefundAmount {
  private constructor(private readonly value: number) {
    if (value < 0) throw new Error('Refund amount cannot be negative')
  }

  static create(amount: number): RefundAmount {
    return new RefundAmount(amount)
  }

  getValue(): number {
    return this.value
  }

  add(other: RefundAmount): RefundAmount {
    return new RefundAmount(this.value + other.value)
  }
}

class TicketLineQuantity {
  private constructor(private readonly value: number) {
    if (value <= 0) throw new Error('Quantity must be positive')
  }

  static create(qty: number): TicketLineQuantity {
    return new TicketLineQuantity(qty)
  }

  subtract(other: TicketLineQuantity): TicketLineQuantity {
    const result = this.value - other.value
    if (result < 0) throw new Error('Cannot refund more than available')
    return new TicketLineQuantity(result)
  }

  isZero(): boolean {
    return this.value === 0
  }
}
```

#### **5. Unit of Work Pattern** (Transaction Management)
```typescript
interface ITransactionManager {
  runInTransaction<T>(work: () => Promise<T>): Promise<T>
}

class SQLiteTransactionManager implements ITransactionManager {
  constructor(private db: Database) {}

  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    const transaction = this.db.transaction(() => {
      try {
        return work()
      } catch (error) {
        log.error('Transaction failed:', error)
        throw error
      }
    })

    return transaction()
  }
}
```

---

## 5. Avantages de la Refactorisation

### ✅ **Single Responsibility**
- `TicketRepository` → Accès DB uniquement
- `RefundValidator` → Validation des règles métier
- `RefundCalculator` → Calculs financiers
- `StockService` → Gestion du stock
- `RefundAuditor` → Traçabilité

### ✅ **Open/Closed**
- Nouveaux types de remboursement = Nouvelle stratégie (pas de modification du code existant)
- Exemple: `RefundWithFeeStrategy`, `PartialRefundWithCreditNoteStrategy`

### ✅ **Liskov Substitution**
- Toutes les stratégies implémentent `IRefundStrategy`
- Peuvent être substituées sans casser le code

### ✅ **Interface Segregation**
- Interfaces spécifiques: `ITicketRepository`, `IRefundRepository`, `IStockService`
- Clients ne dépendent que de ce dont ils ont besoin

### ✅ **Dependency Inversion**
- Dépendances sur des abstractions (`ITicketRepository`), pas des implémentations
- Facilite les tests (mocks/stubs)

### ✅ **DRY (Don't Repeat Yourself)**
- Validation centralisée dans `RefundValidator`
- Calculs centralisés dans `RefundCalculator`
- Restauration stock centralisée dans `StockService`
- Pas de code dupliqué

### ✅ **Testabilité**
```typescript
// Mock facile avec interfaces
const mockTicketRepo: ITicketRepository = {
  findById: jest.fn(),
  updateStatus: jest.fn(),
  // ...
}

// Test unitaire isolé
it('should calculate partial refund correctly', () => {
  const calculator = new RefundCalculator()
  const strategy = new PartialRefundStrategy()
  const ticket = createTestTicket()
  const lines = [{ lineId: 1, quantity: 2 }]

  const result = calculator.calculate(ticket, strategy, lines)

  expect(result).toBe(20.0)
})
```

### ✅ **Maintenabilité**
- Code organisé en couches claires
- Responsabilités bien définies
- Facile d'ajouter de nouvelles fonctionnalités
- Facile de débugger (une classe = une responsabilité)

### ✅ **Traçabilité Améliorée**
- Nouvelle table `refunds` pour historiser
- Rapports de remboursement faciles à générer
- Audit trail complet

---

## 6. Migration Progressive (Stratégie d'Implémentation)

### Phase 1: Extraction des Services (Semaine 1)
1. Créer `RefundCalculator` et extraire les calculs
2. Créer `RefundValidator` et extraire les validations
3. Créer `StockService` interface et wrapper autour de `StockRepository`
4. Tests unitaires pour chaque service

### Phase 2: Pattern Strategy (Semaine 2)
1. Créer interface `IRefundStrategy`
2. Implémenter `FullRefundStrategy`
3. Implémenter `PartialRefundStrategy`
4. Implémenter `CancellationStrategy`
5. Tests pour chaque stratégie

### Phase 3: Façade & Orchestration (Semaine 3)
1. Créer `RefundOrchestrator` (façade)
2. Migrer `cancel()` vers orchestrator
3. Migrer `refund()` vers orchestrator
4. Migrer `partialRefund()` vers orchestrator
5. Tests d'intégration

### Phase 4: Repository Refactoring (Semaine 4)
1. Créer `IRefundRepository` et migration DB
2. Extraire logique métier de `TicketRepository`
3. Simplifier `TicketRepository` (data access only)
4. Créer `TransactionManager`
5. Tests de régression complets

### Phase 5: Cleanup & Documentation (Semaine 5)
1. Supprimer ancien code
2. Documentation API
3. Mise à jour des tests
4. Revue de code finale

---

## 7. Exemple de Code Refactorisé

### Avant (Actuel)
```typescript
partialRefund(id: number, lines: PartialRefundLineDTO[], reason: string): boolean {
  const transaction = this.db.transaction(() => {
    const ticket = this.findById(id)
    if (!ticket) throw new Error('Ticket not found')
    if (ticket.status !== 'completed' && ticket.status !== 'partially_refunded') {
      throw new Error('Only completed or partially refunded tickets can be refunded')
    }

    let totalRefundAmount = 0
    const lineUpdates: Array<{ lineId: number; newQuantity: number; refundAmount: number }> = []

    for (const refundLine of linesToRefund) {
      const originalLine = ticket.lines.find((l) => l.id === refundLine.lineId)
      if (!originalLine) throw new Error(`Line ${refundLine.lineId} not found`)
      if (refundLine.quantity <= 0 || refundLine.quantity > originalLine.quantity) {
        throw new Error(`Invalid refund quantity`)
      }

      const lineRefundAmount = (originalLine.totalAmount / originalLine.quantity) * refundLine.quantity
      totalRefundAmount += lineRefundAmount

      const newQuantity = originalLine.quantity - refundLine.quantity
      lineUpdates.push({ lineId: refundLine.lineId, newQuantity, refundAmount: lineRefundAmount })

      StockRepository.adjust(
        originalLine.productId,
        refundLine.quantity,
        'return',
        userId || ticket.userId,
        ticket.ticketNumber,
        `Remboursement partiel: ${reason}`
      )
    }

    // ... 50 more lines of mixed responsibilities
  })
  return transaction()
}
```

### Après (Refactorisé)
```typescript
// Dans RefundOrchestrator
async executePartialRefund(
  ticketId: number,
  lines: PartialRefundLineDTO[],
  reason: string,
  userId: number
): Promise<RefundResult> {
  const strategy = new PartialRefundStrategy()
  return this.executeRefund(ticketId, strategy, { lines, reason }, userId)
}

// Logique réutilisable et testable
async executeRefund(
  ticketId: number,
  strategy: IRefundStrategy,
  data: RefundData,
  userId: number
): Promise<RefundResult> {
  return this.txManager.runInTransaction(async () => {
    // Chaque étape est claire, testable et réutilisable
    const ticket = await this.loadAndValidate(ticketId, strategy, data)
    const refundAmount = this.calculator.calculate(ticket, strategy, data)
    await this.stockService.restore(ticket, data, userId)
    await this.updateTicket(ticketId, refundAmount, strategy, data)
    const refund = await this.createRefundRecord(ticketId, refundAmount, data, userId)
    await this.auditor.log(ticket, refund, strategy)

    return { success: true, refund, ticket }
  })
}
```

---

## 8. Métriques de Qualité

### Avant Refactorisation
- **Complexité Cyclomatique**: 15+ (très élevé)
- **Lignes de code par méthode**: 100+ (trop long)
- **Couplage**: 5+ dépendances directes (fort)
- **Cohésion**: Faible (responsabilités mélangées)
- **Testabilité**: Difficile (dépendances hardcodées)

### Après Refactorisation
- **Complexité Cyclomatique**: 3-5 (acceptable)
- **Lignes de code par méthode**: 10-20 (optimal)
- **Couplage**: 2-3 dépendances sur abstractions (faible)
- **Cohésion**: Forte (une classe = une responsabilité)
- **Testabilité**: Excellente (injection de dépendances)

---

## 9. Conclusion

La refactorisation proposée transforme un code monolithique difficile à maintenir en une architecture modulaire, testable et extensible. En appliquant SOLID et DRY:

✅ **Code plus propre**: Chaque classe a une responsabilité unique
✅ **Code réutilisable**: Pas de duplication, composants réutilisables
✅ **Code extensible**: Nouveaux types de remboursement sans modification
✅ **Code testable**: Injection de dépendances, mocks faciles
✅ **Code maintenable**: Architecture claire, facile à comprendre

**Impact Business**:
- Moins de bugs (code plus simple)
- Développement plus rapide de nouvelles fonctionnalités
- Meilleure traçabilité (table refunds dédiée)
- Facilité d'audit et de reporting

**Effort Estimé**: 4-5 semaines avec approche progressive
**ROI**: Élevé (code maintenable sur le long terme)
