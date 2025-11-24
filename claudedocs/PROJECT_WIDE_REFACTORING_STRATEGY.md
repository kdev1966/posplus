# Stratégie de Refactorisation Globale POS+

**Date**: 2025-11-24
**Objectif**: Appliquer SOLID & DRY à l'ensemble du projet de manière progressive et pragmatique

---

## 1. État Actuel du Projet (Audit Architectural)

### Architecture Actuelle (Monolithique)

```
src/main-process/
├── handlers/               # IPC Handlers (mélange présentation/logique)
├── services/
│   ├── database/
│   │   └── repositories/   # ❌ Repositories avec logique métier
│   ├── ticket/            # ⚠️ Services minces (juste des wrappers)
│   ├── printer/           # ⚠️ Service monolithique
│   ├── backup/            # ⚠️ Service monolithique
│   └── p2p/               # ⚠️ Service monolithique
└── utils/                 # 🤷 Helpers divers

src/renderer/
├── pages/                 # ❌ Logique métier dans les composants React
├── components/            # ⚠️ Composants couplés aux APIs
└── api/                   # ⚠️ Appels IPC dispersés
```

### Problèmes Identifiés (Pattern Répété)

#### 🔴 **Même problème dans TOUS les modules**

1. **ProductRepository** (même violation que TicketRepository)
```typescript
// ❌ Logique métier dans le repository
updateStock(id: number, newStock: number): boolean {
  const product = this.findById(id)
  if (!product) throw new Error('Product not found')

  // ❌ Validation métier
  if (newStock < 0) throw new Error('Stock cannot be negative')

  // ❌ Logique de mise à jour
  const stmt = this.db.prepare('UPDATE products SET stock = ? WHERE id = ?')
  return stmt.run(newStock, id).changes > 0
}
```

2. **SessionRepository** (même violation)
```typescript
// ❌ Calculs financiers dans le repository
close(sessionId: number, closingCash: number): Session {
  // ❌ Logique métier complexe
  const expectedCash = session.openingCash + completedResult.total_cash - refundedResult.total_refunded
  const difference = closingCash - expectedCash

  // ❌ Mise à jour directe
  updateStmt.run(closingCash, expectedCash, difference, sessionId)
}
```

3. **UserRepository** (même violation)
```typescript
// ❌ Hash de mot de passe dans le repository
create(data: CreateUserDTO): User {
  // ❌ Cryptographie dans le repository
  const hashedPassword = await bcrypt.hash(data.password, 10)

  // ❌ Validation métier
  if (this.findByUsername(data.username)) {
    throw new Error('Username already exists')
  }
}
```

#### 🔴 **Services inutiles (juste des proxies)**

```typescript
// TicketService.ts - Aucune valeur ajoutée
class TicketService {
  async createTicket(data: CreateTicketDTO): Promise<Ticket> {
    return TicketRepository.create(data)  // ❌ Juste un proxy
  }

  async cancelTicket(id: number, reason: string): Promise<boolean> {
    return TicketRepository.cancel(id, reason)  // ❌ Juste un proxy
  }
}
```

#### 🔴 **Logique métier dans les React Components**

```typescript
// History.tsx - Calculs dans le composant
const totalSales = filteredTickets.reduce((sum, ticket) => {
  if (ticket.status === 'completed' || ticket.status === 'partially_refunded') {
    return sum + ticket.totalAmount  // ❌ Logique métier dans UI
  }
  return sum
}, 0)
```

---

## 2. Vision Cible (Clean Architecture)

### Architecture Proposée (Layered + DDD)

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                         │
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │  IPC Handlers    │              │  React Pages     │        │
│  │  (Electron)      │              │  (Components)    │        │
│  └────────┬─────────┘              └────────┬─────────┘        │
└───────────┼──────────────────────────────────┼─────────────────┘
            │                                  │
┌───────────▼──────────────────────────────────▼─────────────────┐
│                    APPLICATION LAYER                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Use Cases (Orchestration)                              │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  • CreateTicketUseCase                                  │   │
│  │  • RefundTicketUseCase                                  │   │
│  │  • CloseSessionUseCase                                  │   │
│  │  • GenerateReportUseCase                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Application Services (Façades)                         │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  • TicketApplicationService                             │   │
│  │  • ProductApplicationService                            │   │
│  │  • SessionApplicationService                            │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────┬─────────────────────────────────────────────────────┘
            │
┌───────────▼─────────────────────────────────────────────────────┐
│                       DOMAIN LAYER                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Domain Entities (Business Objects)                     │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  • Ticket (aggregate root)                              │   │
│  │  • Product (aggregate root)                             │   │
│  │  • Session (aggregate root)                             │   │
│  │  • User (aggregate root)                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Domain Services (Business Logic)                       │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  • RefundService → Strategies, Calculator, Validator    │   │
│  │  • PricingService → Discount, Tax calculations          │   │
│  │  • StockService → Inventory management                  │   │
│  │  • AuthenticationService → Password, Permissions        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Value Objects (Immutable)                              │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  • Money, Quantity, TicketNumber, Email, Password       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Domain Events                                          │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  • TicketCreated, TicketRefunded, StockAdjusted         │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────┬─────────────────────────────────────────────────────┘
            │
┌───────────▼─────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Repositories (Data Access ONLY)                        │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  • ITicketRepository → TicketRepositorySQL              │   │
│  │  • IProductRepository → ProductRepositorySQL            │   │
│  │  • ISessionRepository → SessionRepositorySQL            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  External Services (I/O)                                │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  • PrinterService → Thermal printing                    │   │
│  │  • BackupService → File I/O                             │   │
│  │  • P2PService → Network sync                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Cross-Cutting Concerns                                 │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  • Logging, Caching, Transaction Management, Events     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Principes Appliqués Partout

#### ✅ **SOLID dans chaque module**

| Principe | Application |
|----------|-------------|
| **S** - Single Responsibility | Chaque classe = 1 responsabilité claire |
| **O** - Open/Closed | Stratégies, Plugins, Abstractions |
| **L** - Liskov Substitution | Interfaces cohérentes, substitution sûre |
| **I** - Interface Segregation | Interfaces spécifiques, pas gonflées |
| **D** - Dependency Inversion | Dépendances sur abstractions |

#### ✅ **DRY appliqué globalement**

- **Shared Validators** → Validation centralisée réutilisable
- **Shared Calculators** → Logique de calcul unique
- **Shared Value Objects** → Money, Quantity, etc.
- **Shared Domain Events** → Event bus unifié

---

## 3. Stratégie de Migration (12 Semaines)

### Phase 1: Fondations (Semaines 1-2)

#### Objectifs
- Créer l'architecture de base
- Définir les interfaces communes
- Mettre en place les value objects

#### Tâches
1. **Créer la structure de dossiers**
```
src/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── services/
│   ├── events/
│   └── interfaces/
├── application/
│   ├── use-cases/
│   └── services/
└── infrastructure/
    ├── repositories/
    ├── external-services/
    └── cross-cutting/
```

2. **Value Objects Communs**
```typescript
// domain/value-objects/Money.ts
export class Money {
  private constructor(
    private readonly amount: number,
    private readonly currency: string = 'DT'
  ) {
    if (amount < 0) throw new DomainError('Amount cannot be negative')
  }

  static create(amount: number): Money {
    return new Money(amount)
  }

  add(other: Money): Money {
    return new Money(this.amount + other.amount)
  }

  subtract(other: Money): Money {
    return new Money(this.amount - other.amount)
  }

  multiply(factor: number): Money {
    return new Money(this.amount * factor)
  }

  getValue(): number {
    return this.amount
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency
  }
}

// domain/value-objects/Quantity.ts
export class Quantity {
  private constructor(private readonly value: number) {
    if (value < 0) throw new DomainError('Quantity cannot be negative')
  }

  static create(value: number): Quantity {
    return new Quantity(value)
  }

  increment(amount: number = 1): Quantity {
    return new Quantity(this.value + amount)
  }

  decrement(amount: number = 1): Quantity {
    const newValue = this.value - amount
    if (newValue < 0) throw new DomainError('Insufficient quantity')
    return new Quantity(newValue)
  }

  getValue(): number {
    return this.value
  }

  isZero(): boolean {
    return this.value === 0
  }
}
```

3. **Interfaces Communes**
```typescript
// domain/interfaces/IRepository.ts
export interface IRepository<T, ID> {
  findById(id: ID): Promise<T | null>
  findAll(): Promise<T[]>
  save(entity: T): Promise<T>
  delete(id: ID): Promise<void>
}

// domain/interfaces/IUseCase.ts
export interface IUseCase<Input, Output> {
  execute(input: Input): Promise<Output>
}

// infrastructure/interfaces/ITransactionManager.ts
export interface ITransactionManager {
  runInTransaction<T>(work: () => Promise<T>): Promise<T>
}
```

### Phase 2: Module Ticket (Semaines 3-4)

#### Migration complète du module Ticket
- ✅ Refactoriser selon l'analyse du remboursement
- ✅ Extraire la logique métier du repository
- ✅ Créer les use cases: CreateTicket, RefundTicket, CancelTicket
- ✅ Tests unitaires complets

#### Structure cible
```
domain/
├── entities/
│   └── Ticket.ts              # Aggregate root avec méthodes métier
├── services/
│   ├── RefundService.ts       # Logique de remboursement
│   └── TicketValidator.ts     # Validation
└── value-objects/
    └── TicketNumber.ts        # Value object immutable

application/
└── use-cases/
    ├── CreateTicketUseCase.ts
    ├── RefundTicketUseCase.ts
    └── CancelTicketUseCase.ts

infrastructure/
└── repositories/
    └── TicketRepositorySQL.ts # Data access ONLY
```

### Phase 3: Module Product (Semaines 5-6)

#### Migration du module Product
- ✅ Créer ProductEntity avec logique métier
- ✅ Extraire StockService (gestion inventaire)
- ✅ Créer PricingService (calculs prix/discount)
- ✅ Use cases: CreateProduct, UpdateStock, ApplyDiscount

#### Structure cible
```
domain/
├── entities/
│   └── Product.ts             # Aggregate root
├── services/
│   ├── StockService.ts        # Gestion stock + logs
│   └── PricingService.ts      # Calculs prix
└── value-objects/
    ├── SKU.ts                 # Stock Keeping Unit
    └── Price.ts               # Value object prix

application/
└── use-cases/
    ├── CreateProductUseCase.ts
    ├── UpdateStockUseCase.ts
    └── AdjustPriceUseCase.ts
```

### Phase 4: Module Session (Semaines 7-8)

#### Migration du module Session
- ✅ Créer SessionEntity avec règles métier
- ✅ Extraire CashCalculationService
- ✅ Use cases: OpenSession, CloseSession, GenerateZReport

### Phase 5: Module User/Auth (Semaines 9-10)

#### Migration du module User
- ✅ Créer UserEntity
- ✅ Extraire AuthenticationService (hash, validation)
- ✅ Extraire AuthorizationService (permissions)
- ✅ Value objects: Email, Password (hashed)

### Phase 6: Services Externes (Semaines 11-12)

#### Migration Printer, Backup, P2P
- ✅ Interfaces abstraites pour chaque service
- ✅ Implémentations concrètes isolées
- ✅ Tests d'intégration

---

## 4. Ordre de Priorité des Modules

### Critères de Priorisation
1. **Impact métier** (modules critiques d'abord)
2. **Complexité** (modules simples pour pratiquer)
3. **Dépendances** (modules sans dépendances d'abord)

### Ordre Recommandé

```
1️⃣ Value Objects (base commune)           → Semaines 1-2
2️⃣ Ticket + Refund (impact fort)          → Semaines 3-4
3️⃣ Product + Stock (dépendance de Ticket) → Semaines 5-6
4️⃣ Session + ZReport (dépendance Ticket)  → Semaines 7-8
5️⃣ User + Auth (indépendant)              → Semaines 9-10
6️⃣ Printer + Backup + P2P (I/O)           → Semaines 11-12
```

---

## 5. Patterns & Pratiques Communes

### Patterns à Utiliser Partout

#### 1. **Repository Pattern** (Tous les modules)
```typescript
// Interface dans domain/
export interface IProductRepository {
  findById(id: number): Promise<Product | null>
  findBySKU(sku: string): Promise<Product | null>
  findAll(): Promise<Product[]>
  save(product: Product): Promise<Product>
  delete(id: number): Promise<void>
}

// Implémentation dans infrastructure/
export class ProductRepositorySQL implements IProductRepository {
  // Data access ONLY, NO business logic
}
```

#### 2. **Use Case Pattern** (Tous les modules)
```typescript
// Chaque action métier = 1 use case
export class CreateProductUseCase implements IUseCase<CreateProductInput, Product> {
  constructor(
    private productRepo: IProductRepository,
    private validator: ProductValidator,
    private eventBus: IEventBus
  ) {}

  async execute(input: CreateProductInput): Promise<Product> {
    // 1. Validate
    this.validator.validateCreate(input)

    // 2. Create entity
    const product = Product.create(input)

    // 3. Persist
    await this.productRepo.save(product)

    // 4. Emit event
    await this.eventBus.publish(new ProductCreatedEvent(product))

    return product
  }
}
```

#### 3. **Strategy Pattern** (Logique variable)
```typescript
// Pour discount, pricing, tax, etc.
interface IPricingStrategy {
  calculate(basePrice: Money, context: PricingContext): Money
}

class RegularPricing implements IPricingStrategy {
  calculate(basePrice: Money): Money {
    return basePrice
  }
}

class DiscountPricing implements IPricingStrategy {
  constructor(private discountPercent: number) {}

  calculate(basePrice: Money): Money {
    return basePrice.multiply(1 - this.discountPercent / 100)
  }
}
```

#### 4. **Façade Pattern** (Simplification)
```typescript
// Application service = façade
export class TicketApplicationService {
  constructor(
    private createUseCase: CreateTicketUseCase,
    private refundUseCase: RefundTicketUseCase,
    private cancelUseCase: CancelTicketUseCase
  ) {}

  async createTicket(input: CreateTicketInput): Promise<Ticket> {
    return this.createUseCase.execute(input)
  }

  async refundTicket(input: RefundTicketInput): Promise<Refund> {
    return this.refundUseCase.execute(input)
  }
}
```

#### 5. **Domain Events** (Découplage)
```typescript
// Event
export class ProductStockAdjusted extends DomainEvent {
  constructor(
    public readonly productId: number,
    public readonly previousStock: number,
    public readonly newStock: number,
    public readonly reason: string
  ) {
    super()
  }
}

// Event handler
export class LogStockChangeHandler implements IEventHandler<ProductStockAdjusted> {
  async handle(event: ProductStockAdjusted): Promise<void> {
    await StockLogRepository.create({
      productId: event.productId,
      previousStock: event.previousStock,
      newStock: event.newStock,
      reason: event.reason
    })
  }
}
```

---

## 6. Standards de Code (Tous les Modules)

### Règles de Nommage

```typescript
// ✅ Entities
export class Product { }           // PascalCase, singular
export class Ticket { }

// ✅ Value Objects
export class Money { }             // PascalCase, noun
export class Quantity { }

// ✅ Services
export class RefundService { }     // PascalCase, ends with Service
export class PricingService { }

// ✅ Use Cases
export class CreateTicketUseCase { }   // PascalCase, Verb + Noun + UseCase
export class RefundTicketUseCase { }

// ✅ Repositories
export interface ITicketRepository { } // I prefix for interfaces
export class TicketRepositorySQL { }   // Implementation with suffix

// ✅ Events
export class TicketCreated extends DomainEvent { } // PascalCase, past tense
export class ProductStockAdjusted extends DomainEvent { }
```

### Structure de Fichier Standard

```typescript
// 1. Imports
import { DomainError } from '@domain/errors'
import { Money } from '@domain/value-objects'

// 2. Types & Interfaces
interface CreateTicketInput {
  userId: number
  lines: TicketLineInput[]
}

// 3. Class avec:
export class CreateTicketUseCase {
  // 3.1 Constructor avec DI
  constructor(
    private ticketRepo: ITicketRepository,
    private validator: TicketValidator,
    private eventBus: IEventBus
  ) {}

  // 3.2 Public methods (business logic)
  async execute(input: CreateTicketInput): Promise<Ticket> {
    // Logic here
  }

  // 3.3 Private helper methods
  private validateInput(input: CreateTicketInput): void {
    // Validation
  }
}
```

### Tests Standard (Tous les Modules)

```typescript
// Chaque classe = 1 fichier de test
describe('CreateTicketUseCase', () => {
  let useCase: CreateTicketUseCase
  let mockRepo: jest.Mocked<ITicketRepository>
  let mockValidator: jest.Mocked<TicketValidator>

  beforeEach(() => {
    mockRepo = createMockRepo()
    mockValidator = createMockValidator()
    useCase = new CreateTicketUseCase(mockRepo, mockValidator, mockEventBus)
  })

  describe('execute', () => {
    it('should create ticket successfully', async () => {
      // Arrange
      const input = createTestInput()
      mockValidator.validate.mockReturnValue(true)

      // Act
      const result = await useCase.execute(input)

      // Assert
      expect(result).toBeDefined()
      expect(mockRepo.save).toHaveBeenCalledTimes(1)
    })

    it('should throw error when validation fails', async () => {
      // Arrange
      mockValidator.validate.mockImplementation(() => {
        throw new ValidationError('Invalid input')
      })

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(ValidationError)
    })
  })
})
```

---

## 7. Avantages de l'Approche Globale

### ✅ **Cohérence Architecturale**
- Même patterns partout
- Navigation facile dans le code
- Onboarding rapide nouveaux développeurs

### ✅ **Réutilisabilité Maximale**
- Value Objects partagés (Money, Quantity)
- Services partagés (Validation, Calculation)
- Infrastructure partagée (Transaction, Logging, Events)

### ✅ **Testabilité Excellente**
- Injection de dépendances partout
- Mocks faciles avec interfaces
- Tests unitaires rapides (pas de DB)

### ✅ **Maintenabilité Long Terme**
- Code propre et lisible
- Responsabilités claires
- Modifications localisées (pas d'effets de bord)

### ✅ **Extensibilité**
- Nouveaux modules suivent le même pattern
- Nouvelles features = nouveaux use cases
- Pas de modification du code existant (Open/Closed)

---

## 8. Risques & Mitigations

### ⚠️ **Risque 1: Refactorisation trop longue**
**Mitigation**: Migration progressive module par module, livraisons incrémentales

### ⚠️ **Risque 2: Régression fonctionnelle**
**Mitigation**: Tests de régression complets avant/après chaque module

### ⚠️ **Risque 3: Over-engineering**
**Mitigation**: Pragmatisme, ne pas créer d'abstractions inutiles

### ⚠️ **Risque 4: Résistance de l'équipe**
**Mitigation**: Formation, documentation, pair programming

---

## 9. Métriques de Succès

### KPIs à Mesurer

| Métrique | Avant | Cible |
|----------|-------|-------|
| Complexité Cyclomatique moyenne | 15+ | < 5 |
| Lignes de code par fichier | 500+ | < 200 |
| Couverture de tests | 30% | 80%+ |
| Couplage (dépendances directes) | 5+ | < 3 |
| Duplication de code | 20% | < 5% |
| Temps moyen pour ajouter une feature | 3-5 jours | 1-2 jours |
| Bugs en production (post-refactoring) | Baseline | -50% |

---

## 10. Conclusion

### Recommandation Finale

✅ **OUI, appliquer SOLID/DRY à TOUT le projet**

**Pourquoi?**
1. Architecture cohérente et professionnelle
2. Dette technique éliminée (pas juste déplacée)
3. Maintenabilité à long terme
4. Productivité accrue après la migration
5. Qualité et fiabilité améliorées

**Comment?**
- Migration progressive (12 semaines)
- Module par module avec validation
- Tests de régression systématiques
- Formation continue de l'équipe

**ROI Estimé**
- **Court terme** (3 mois): -20% productivité (apprentissage)
- **Moyen terme** (6 mois): +30% productivité (moins de bugs)
- **Long terme** (1 an+): +50% productivité (architecture solide)

---

## Prochaines Étapes

1. **Validation** de cette stratégie avec l'équipe
2. **Priorisation** des modules selon le business
3. **Formation** sur Clean Architecture et SOLID
4. **Démarrage** Phase 1 (Semaines 1-2)
5. **Revues** hebdomadaires pour ajuster le plan

**Question**: Voulez-vous que je commence par créer la structure de base (Phase 1) ou préférez-vous d'abord valider cette approche globale?
