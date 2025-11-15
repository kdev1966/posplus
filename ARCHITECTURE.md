# POSPlus - Architecture Documentation

## 🏗️ Vue d'ensemble

POSPlus est une application POS (Point of Sale) desktop construite avec **Electron**, **React**, **TypeScript** et **SQLite**, suivant les principes **SOLID** et une architecture modulaire maximale.

## 📁 Structure du projet

```
posplus/
├── src/
│   ├── electron/                    # Backend Electron
│   │   ├── main.ts                  # Point d'entrée Electron
│   │   ├── preload.ts               # Bridge sécurisé IPC
│   │   ├── services/                # Services métier
│   │   │   ├── database/
│   │   │   │   ├── db.ts            # Instance SQLite
│   │   │   │   ├── migrations/      # Migrations SQL
│   │   │   │   └── repositories/    # Data Access Layer
│   │   │   │       ├── UserRepository.ts
│   │   │   │       ├── ProductRepository.ts
│   │   │   │       ├── TicketRepository.ts
│   │   │   │       ├── CategoryRepository.ts
│   │   │   │       ├── SessionRepository.ts
│   │   │   │       └── StockRepository.ts
│   │   │   ├── auth/
│   │   │   │   └── AuthService.ts
│   │   │   ├── ticket/
│   │   │   │   └── TicketService.ts
│   │   │   ├── product/
│   │   │   │   └── ProductService.ts
│   │   │   ├── stock/
│   │   │   │   └── StockService.ts
│   │   │   ├── printer/
│   │   │   │   └── PrinterService.ts
│   │   │   ├── sync/
│   │   │   │   ├── SyncService.ts
│   │   │   │   └── SyncProvider.ts
│   │   │   └── report/
│   │   │       └── ReportService.ts
│   │   ├── handlers/                # IPC Handlers
│   │   │   ├── authHandlers.ts
│   │   │   ├── userHandlers.ts
│   │   │   ├── productHandlers.ts
│   │   │   ├── ticketHandlers.ts
│   │   │   ├── sessionHandlers.ts
│   │   │   ├── printerHandlers.ts
│   │   │   └── syncHandlers.ts
│   │   └── utils/
│   │       ├── logger.ts
│   │       └── security.ts
│   │
│   ├── renderer/                    # Frontend React
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   ├── pages/               # Pages principales
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── POS.tsx
│   │   │   │   ├── Products.tsx
│   │   │   │   ├── Categories.tsx
│   │   │   │   ├── Users.tsx
│   │   │   │   ├── Stock.tsx
│   │   │   │   ├── History.tsx
│   │   │   │   └── Settings.tsx
│   │   │   ├── components/          # Composants réutilisables
│   │   │   │   ├── layout/
│   │   │   │   │   ├── Layout.tsx
│   │   │   │   │   ├── Sidebar.tsx
│   │   │   │   │   ├── Header.tsx
│   │   │   │   │   └── Footer.tsx
│   │   │   │   ├── ui/
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   ├── Input.tsx
│   │   │   │   │   ├── Modal.tsx
│   │   │   │   │   ├── Table.tsx
│   │   │   │   │   ├── Card.tsx
│   │   │   │   │   └── Badge.tsx
│   │   │   │   ├── pos/
│   │   │   │   │   ├── ProductGrid.tsx
│   │   │   │   │   ├── Cart.tsx
│   │   │   │   │   ├── PaymentModal.tsx
│   │   │   │   │   └── BarcodeScanner.tsx
│   │   │   │   └── forms/
│   │   │   │       ├── ProductForm.tsx
│   │   │   │       ├── CategoryForm.tsx
│   │   │   │       └── UserForm.tsx
│   │   │   ├── hooks/               # Custom hooks
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useProducts.ts
│   │   │   │   ├── useTickets.ts
│   │   │   │   ├── useSession.ts
│   │   │   │   └── useKeyboard.ts
│   │   │   ├── store/               # State management (Zustand)
│   │   │   │   ├── authStore.ts
│   │   │   │   ├── cartStore.ts
│   │   │   │   ├── productStore.ts
│   │   │   │   └── sessionStore.ts
│   │   │   ├── utils/
│   │   │   │   ├── formatters.ts
│   │   │   │   ├── validators.ts
│   │   │   │   └── helpers.ts
│   │   │   └── styles/
│   │   │       ├── index.css
│   │   │       └── globals.css
│   │   └── index.html
│   │
│   └── shared/                      # Code partagé
│       ├── types/
│       │   └── index.ts             # Types TypeScript communs
│       └── constants/
│           └── index.ts             # Constantes partagées
│
├── build/                           # Assets pour le build
│   ├── icon.ico
│   ├── icon.icns
│   └── icon.png
│
├── scripts/                         # Scripts utilitaires
│   ├── build.js
│   └── migrate.js
│
├── dist/                            # Build output
│   ├── electron/
│   └── renderer/
│
├── release/                         # Packages finaux
│
├── package.json
├── tsconfig.json
├── tsconfig.electron.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── jest.config.js
└── README.md
```

## 🔄 Flux de données

```
┌─────────────────────────────────────────────────────────────┐
│                         RENDERER                            │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────────┐  │
│  │  React   │───▶│  Zustand │───▶│  window.api (IPC)    │  │
│  │  Pages   │    │  Stores  │    │                      │  │
│  └──────────┘    └──────────┘    └──────────────────────┘  │
└──────────────────────────────│──────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   PRELOAD (Bridge)  │
                    │  Context Isolation  │
                    └──────────┬──────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                         MAIN PROCESS                        │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ IPC Handlers │───▶│   Services   │───▶│ Repositories │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                │            │
│                                      ┌─────────▼─────────┐  │
│                                      │   SQLite DB       │  │
│                                      └───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Sécurité Electron

### Configuration de sécurité

- **Context Isolation**: `true` - Isole le contexte du preload
- **Node Integration**: `false` - Désactive Node.js dans le renderer
- **Sandbox**: `true` - Active le sandbox pour le renderer
- **webSecurity**: `true` - Active les politiques de sécurité web
- **allowRunningInsecureContent**: `false`

### Communication IPC sécurisée

Le fichier `preload.ts` expose uniquement les méthodes autorisées via `contextBridge`, sans exposer directement les modules Node.js.

## 📊 Base de données SQLite

### Tables principales

1. **users** - Utilisateurs du système
2. **roles** - Rôles et permissions
3. **permissions** - Permissions granulaires
4. **products** - Catalogue produits
5. **categories** - Catégories produits
6. **tickets** - Tickets de vente
7. **ticket_lines** - Lignes de ticket
8. **payments** - Paiements
9. **cash_sessions** - Sessions de caisse
10. **stock_logs** - Historique des mouvements de stock
11. **z_reports** - Rapports de fin de journée

### Pattern Repository

Chaque entité possède son propre Repository qui encapsule toute la logique d'accès aux données :

```typescript
class ProductRepository {
  findAll(): Product[]
  findById(id: number): Product | null
  findByBarcode(barcode: string): Product | null
  create(data: CreateProductDTO): Product
  update(data: UpdateProductDTO): Product
  delete(id: number): boolean
}
```

## 🎨 UI/UX Design System

### Style

- **Glassmorphism** : Effet de verre avec backdrop-blur
- **Neon accents** : Couleurs néon (blue, purple, pink, green)
- **Dark mode first** : Interface sombre par défaut
- **Animations subtiles** : Transitions fluides

### Composants UI

Tous les composants suivent le pattern :
- Props typées avec TypeScript
- Variants Tailwind
- Accessibilité (ARIA)
- Responsive

## ⚙️ Services métier

### Architecture en couches

```
Handlers (IPC) → Services (Business Logic) → Repositories (Data Access) → Database
```

### Services principaux

1. **AuthService** - Authentification et autorisation
2. **TicketService** - Gestion des ventes
3. **ProductService** - Gestion produits
4. **StockService** - Gestion des stocks
5. **PrinterService** - Impression ESC/POS
6. **SyncService** - Synchronisation cloud
7. **ReportService** - Génération de rapports

## 🖨️ Impression ESC/POS

### Fonctionnalités

- Détection automatique des imprimantes USB
- Commandes ESC/POS natives
- Ouverture tiroir-caisse
- Templates de ticket personnalisables
- Support multi-imprimantes

## 📡 Synchronisation Cloud

### Architecture modulaire

```typescript
interface SyncProvider {
  authenticate(): Promise<boolean>
  upload(data: any): Promise<boolean>
  download(): Promise<any>
  getStatus(): Promise<SyncStatus>
}
```

Préparé pour intégration future avec backend NestJS.

## 🧪 Tests

### Stratégie de test

- **Unit tests**: Services et repositories
- **Integration tests**: IPC handlers
- **E2E tests**: Critical user paths
- **Coverage**: > 70%

### Outils

- Jest pour les tests
- ts-jest pour TypeScript
- Mocks pour SQLite

## 📦 Build & Packaging

### Electron Builder

- **Windows**: NSIS installer (.exe)
- **macOS**: DMG
- **Linux**: AppImage, deb

### Auto-update

Utilise `electron-updater` pour les mises à jour automatiques.

### CI/CD

Scripts prêts pour GitHub Actions ou GitLab CI.

## 🚀 Principe SOLID appliqué

- **S**ingle Responsibility: Chaque classe/module a une seule responsabilité
- **O**pen/Closed: Extensible sans modification (interfaces, providers)
- **L**iskov Substitution: Les interfaces sont respectées
- **I**nterface Segregation: Interfaces spécifiques et ciblées
- **D**ependency Inversion: Dépendances via interfaces/abstractions

## 📝 Conventions de code

- **Naming**: PascalCase pour classes, camelCase pour fonctions/variables
- **Files**: Un composant/classe par fichier
- **Exports**: Named exports préférés
- **Types**: Toujours typer les paramètres et retours
- **Comments**: JSDoc pour les fonctions publiques

## 🔧 Configuration développement

### Prérequis

- Node.js >= 18
- npm >= 9

### Installation

```bash
npm install
```

### Développement

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Tests

```bash
npm test
```

### Package

```bash
npm run package:win
```

---

**Version**: 1.0.0
**Dernière mise à jour**: 2025-11-15
