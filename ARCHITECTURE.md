# POSPlus - Architecture Complète

## 📋 Vue d'ensemble

POSPlus est une application Point de Vente (POS) moderne construite avec Electron, React, TypeScript et SQLite. L'architecture suit les principes SOLID et utilise une séparation claire entre les couches.

## 🏗️ Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                     ELECTRON MAIN PROCESS                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Application Bootstrap                      │ │
│  │  • Window Management                                    │ │
│  │  • Auto-Update                                          │ │
│  │  • Security & Permissions                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ↕ IPC                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              IPC Handler Layer                          │ │
│  │  • Type-Safe Contracts                                  │ │
│  │  • Request/Response Validation                          │ │
│  │  • Error Handling                                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ↕                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Service Layer                              │ │
│  │  • ProductService                                       │ │
│  │  • SaleService                                          │ │
│  │  • UserService                                          │ │
│  │  • ReportService                                        │ │
│  │  • PrinterService (ESC/POS)                             │ │
│  │  • ScannerService (USB HID)                             │ │
│  │  • SyncService (Cloud)                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ↕                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Repository Layer                           │ │
│  │  • ProductRepository                                    │ │
│  │  • SaleRepository                                       │ │
│  │  • UserRepository                                       │ │
│  │  • Database Connection Pool                             │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ↕                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              SQLite Database                            │ │
│  │  • ACID Transactions                                    │ │
│  │  • Indexes & Optimization                               │ │
│  │  • Migration System                                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↕ IPC
┌─────────────────────────────────────────────────────────────┐
│                   ELECTRON RENDERER PROCESS                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              React Application                          │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │          UI Layer (Components)                   │  │ │
│  │  │  • POS Screen                                    │  │ │
│  │  │  • Product Management                            │  │ │
│  │  │  • Reports Dashboard                             │  │ │
│  │  │  • User Management                               │  │ │
│  │  │  • Settings                                      │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                         ↕                               │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │          State Management (Context/Hooks)        │  │ │
│  │  │  • AppContext                                    │  │ │
│  │  │  • AuthContext                                   │  │ │
│  │  │  • CartContext                                   │  │ │
│  │  │  • ProductContext                                │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                         ↕                               │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │          API Client (IPC Bridge)                 │  │ │
│  │  │  • Type-Safe API Calls                           │  │ │
│  │  │  • Error Handling                                │  │ │
│  │  │  • Loading States                                │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Structure du Projet

```
posplus/
├── src/
│   ├── main/                           # Electron Main Process
│   │   ├── index.ts                    # Entry point
│   │   ├── app.ts                      # Application bootstrap
│   │   ├── window/                     # Window management
│   │   │   ├── main-window.ts
│   │   │   └── window-state.ts
│   │   ├── ipc/                        # IPC Handlers
│   │   │   ├── index.ts
│   │   │   ├── handlers/
│   │   │   │   ├── product.handler.ts
│   │   │   │   ├── sale.handler.ts
│   │   │   │   ├── user.handler.ts
│   │   │   │   ├── report.handler.ts
│   │   │   │   ├── printer.handler.ts
│   │   │   │   └── scanner.handler.ts
│   │   │   └── contracts/              # IPC Type Contracts
│   │   │       ├── product.contract.ts
│   │   │       ├── sale.contract.ts
│   │   │       └── ...
│   │   ├── services/                   # Business Logic
│   │   │   ├── product.service.ts
│   │   │   ├── sale.service.ts
│   │   │   ├── user.service.ts
│   │   │   ├── report.service.ts
│   │   │   ├── printer.service.ts      # ESC/POS
│   │   │   ├── scanner.service.ts      # USB HID
│   │   │   ├── cash-drawer.service.ts
│   │   │   └── sync.service.ts         # Cloud sync
│   │   ├── repositories/               # Data Access
│   │   │   ├── base.repository.ts
│   │   │   ├── product.repository.ts
│   │   │   ├── sale.repository.ts
│   │   │   ├── user.repository.ts
│   │   │   └── ...
│   │   ├── database/                   # Database Layer
│   │   │   ├── connection.ts
│   │   │   ├── migrations/
│   │   │   │   ├── 001_initial_schema.ts
│   │   │   │   ├── 002_add_indexes.ts
│   │   │   │   └── migration-runner.ts
│   │   │   └── schema.sql
│   │   ├── hardware/                   # Hardware Integration
│   │   │   ├── printer/
│   │   │   │   ├── escpos-adapter.ts
│   │   │   │   └── receipt-template.ts
│   │   │   ├── scanner/
│   │   │   │   └── usb-hid-scanner.ts
│   │   │   └── cash-drawer/
│   │   │       └── drawer-controller.ts
│   │   ├── utils/                      # Utilities
│   │   │   ├── logger.ts
│   │   │   ├── error-handler.ts
│   │   │   └── validators.ts
│   │   └── auto-update/                # Auto-Update
│   │       └── updater.ts
│   │
│   ├── renderer/                       # React Application
│   │   ├── index.tsx                   # Entry point
│   │   ├── App.tsx                     # Root component
│   │   ├── styles/                     # Global styles
│   │   │   ├── global.css
│   │   │   ├── theme.css
│   │   │   └── animations.css
│   │   ├── components/                 # React Components
│   │   │   ├── common/                 # Shared components
│   │   │   │   ├── Button/
│   │   │   │   ├── Input/
│   │   │   │   ├── Modal/
│   │   │   │   ├── Table/
│   │   │   │   ├── Card/
│   │   │   │   └── ...
│   │   │   ├── layout/                 # Layout components
│   │   │   │   ├── Sidebar/
│   │   │   │   ├── Header/
│   │   │   │   ├── Layout/
│   │   │   │   └── ...
│   │   │   └── features/               # Feature components
│   │   │       ├── pos/
│   │   │       ├── products/
│   │   │       ├── reports/
│   │   │       ├── users/
│   │   │       └── settings/
│   │   ├── pages/                      # Page components
│   │   │   ├── POSScreen/
│   │   │   ├── ProductsPage/
│   │   │   ├── ReportsPage/
│   │   │   ├── UsersPage/
│   │   │   ├── SettingsPage/
│   │   │   └── LoginPage/
│   │   ├── contexts/                   # React Context
│   │   │   ├── AppContext.tsx
│   │   │   ├── AuthContext.tsx
│   │   │   ├── CartContext.tsx
│   │   │   └── ProductContext.tsx
│   │   ├── hooks/                      # Custom hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useCart.ts
│   │   │   ├── useProducts.ts
│   │   │   └── useScanner.ts
│   │   ├── api/                        # IPC Client
│   │   │   ├── client.ts               # Base IPC client
│   │   │   ├── product.api.ts
│   │   │   ├── sale.api.ts
│   │   │   └── ...
│   │   └── utils/                      # Renderer utilities
│   │       ├── formatters.ts
│   │       └── validators.ts
│   │
│   ├── shared/                         # Shared code (Main + Renderer)
│   │   ├── types/                      # TypeScript types
│   │   │   ├── models/
│   │   │   │   ├── product.types.ts
│   │   │   │   ├── sale.types.ts
│   │   │   │   ├── user.types.ts
│   │   │   │   └── ...
│   │   │   ├── dtos/                   # Data Transfer Objects
│   │   │   │   ├── product.dto.ts
│   │   │   │   └── ...
│   │   │   └── enums/
│   │   │       ├── user-role.enum.ts
│   │   │       ├── payment-method.enum.ts
│   │   │       └── ...
│   │   └── constants/
│   │       └── app.constants.ts
│   │
│   └── preload/                        # Preload scripts
│       └── index.ts                    # Contextbridge API
│
├── public/                             # Static assets
│   ├── icons/
│   └── images/
│
├── resources/                          # Build resources
│   ├── icon.ico
│   └── installer.nsh
│
├── migrations/                         # Database migrations
├── scripts/                            # Build scripts
│   ├── build.js
│   └── package.js
│
├── electron-builder.yml                # Electron builder config
├── package.json
├── tsconfig.json
├── tsconfig.main.json
├── tsconfig.renderer.json
├── webpack.config.js
└── .env.example
```

## 🗄️ Schéma de Base de Données SQLite

### Tables Principales

#### **users**
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'cashier')),
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
```

#### **categories**
```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  icon TEXT,
  parent_id TEXT,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES categories(id)
);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_active ON categories(is_active);
```

#### **products**
```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT UNIQUE,
  barcode TEXT UNIQUE,
  category_id TEXT,
  price_ht REAL NOT NULL,
  tax_rate REAL NOT NULL DEFAULT 0.20,
  price_ttc REAL NOT NULL,
  cost_price REAL,
  stock_quantity INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'unit',
  image_url TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_name ON products(name);
```

#### **sales**
```sql
CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  sale_number TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  customer_name TEXT,
  subtotal_ht REAL NOT NULL,
  total_tax REAL NOT NULL,
  total_ttc REAL NOT NULL,
  discount_amount REAL DEFAULT 0,
  discount_percentage REAL DEFAULT 0,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  synced INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_sales_number ON sales(sale_number);
CREATE INDEX idx_sales_user ON sales(user_id);
CREATE INDEX idx_sales_date ON sales(created_at);
CREATE INDEX idx_sales_payment_method ON sales(payment_method);
CREATE INDEX idx_sales_synced ON sales(synced);
```

#### **sale_items**
```sql
CREATE TABLE sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price_ht REAL NOT NULL,
  tax_rate REAL NOT NULL,
  unit_price_ttc REAL NOT NULL,
  subtotal_ht REAL NOT NULL,
  subtotal_ttc REAL NOT NULL,
  discount_amount REAL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);
```

#### **cash_movements**
```sql
CREATE TABLE cash_movements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('opening', 'closing', 'deposit', 'withdrawal')),
  amount REAL NOT NULL,
  balance_before REAL NOT NULL,
  balance_after REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_cash_movements_user ON cash_movements(user_id);
CREATE INDEX idx_cash_movements_type ON cash_movements(type);
CREATE INDEX idx_cash_movements_date ON cash_movements(created_at);
```

#### **stock_movements**
```sql
CREATE TABLE stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('in', 'out', 'adjustment', 'sale', 'return')),
  quantity REAL NOT NULL,
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  reference TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_user ON stock_movements(user_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(type);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at);
```

#### **sessions**
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
```

#### **sync_queue**
```sql
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('create', 'update', 'delete')),
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL,
  synced_at TEXT
);
CREATE INDEX idx_sync_queue_status ON sync_queue(status);
CREATE INDEX idx_sync_queue_entity ON sync_queue(entity_type, entity_id);
```

## 🔄 Système IPC (Inter-Process Communication)

### Architecture IPC

L'IPC utilise un système de contrats typés pour garantir la sécurité des types entre le processus principal et le renderer.

```typescript
// Exemple de contrat IPC
interface IPCContract<TRequest, TResponse> {
  channel: string;
  request: TRequest;
  response: TResponse;
}

// Contrats produits
export const ProductContracts = {
  GetAll: {
    channel: 'product:getAll',
    request: { filters?: ProductFilters },
    response: Product[]
  },
  GetById: {
    channel: 'product:getById',
    request: { id: string },
    response: Product | null
  },
  Create: {
    channel: 'product:create',
    request: CreateProductDTO,
    response: Product
  },
  // ...
};
```

### Flux IPC

```
Renderer → Preload → Main Process → Service → Repository → SQLite
                                                              ↓
Renderer ← Preload ← Main Process ← Service ← Repository ← Result
```

## 🎨 Design System & UI

### Thème de Couleurs

```css
:root {
  /* Neon Colors */
  --neon-blue: #00f3ff;
  --neon-purple: #b967ff;
  --neon-pink: #ff006e;
  --neon-green: #00ff9f;

  /* Dark Background */
  --bg-primary: #0a0e27;
  --bg-secondary: #151932;
  --bg-tertiary: #1e2442;

  /* Glassmorphism */
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-blur: blur(10px);

  /* Text */
  --text-primary: #ffffff;
  --text-secondary: #a0aec0;
  --text-muted: #718096;
}
```

### Composants UI Principaux

- **Button**: Primary, Secondary, Danger, Ghost
- **Input**: Text, Number, Search, Barcode
- **Card**: Glassmorphism effect
- **Modal**: Overlay with backdrop blur
- **Table**: Sortable, filterable, paginated
- **Chart**: Line, Bar, Pie (recharts)
- **Toast**: Notifications
- **Loading**: Spinners, skeletons

## 🔐 Sécurité

### Authentification

- Hash des mots de passe avec `bcrypt`
- Sessions basées sur tokens (JWT-like)
- Expiration automatique des sessions
- Verrouillage automatique après inactivité

### Permissions

```typescript
enum Permission {
  // Produits
  VIEW_PRODUCTS = 'view:products',
  CREATE_PRODUCTS = 'create:products',
  EDIT_PRODUCTS = 'edit:products',
  DELETE_PRODUCTS = 'delete:products',

  // Ventes
  CREATE_SALES = 'create:sales',
  VIEW_SALES = 'view:sales',
  REFUND_SALES = 'refund:sales',

  // Rapports
  VIEW_REPORTS = 'view:reports',
  EXPORT_REPORTS = 'export:reports',

  // Utilisateurs (Admin only)
  MANAGE_USERS = 'manage:users',

  // Paramètres
  MANAGE_SETTINGS = 'manage:settings',
}

const RolePermissions = {
  admin: [...all permissions],
  cashier: [
    Permission.VIEW_PRODUCTS,
    Permission.CREATE_SALES,
    Permission.VIEW_SALES,
  ]
};
```

### Contexte de Sécurité Electron

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- Content Security Policy (CSP)
- Validation de toutes les entrées IPC

## 📦 Build & Packaging

### Configuration Electron Builder

```yaml
appId: com.posplus.app
productName: POSPlus
directories:
  output: dist
  buildResources: resources

win:
  target:
    - nsis
  icon: resources/icon.ico

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true

publish:
  provider: generic
  url: https://updates.posplus.com
```

### Auto-Update

Utilisation d'`electron-updater` pour les mises à jour automatiques:

1. Vérification au démarrage
2. Téléchargement en arrière-plan
3. Installation au redémarrage
4. Signature des packages (optionnel)

## 🔌 Intégrations Matérielles

### Imprimante Thermique (ESC/POS)

- Librairie: `escpos` ou `node-thermal-printer`
- Connexions: USB, Network, Serial
- Templates de tickets personnalisables
- Support logo, code-barres, QR codes

### Scanner de Code-Barres (USB HID)

- Détection automatique des scanners USB HID
- Support multi-scanners
- Événements en temps réel
- Validation des codes-barres

### Tiroir-Caisse

- Commande ESC/POS standard (0x1B 0x70)
- Déclenchement sur vente validée
- Log des ouvertures

## 🔄 Synchronisation Cloud (Futur)

### Architecture de Sync

```
SQLite Local ←→ Sync Service ←→ REST API ←→ PostgreSQL Cloud
```

### Stratégie

- **Sync Queue**: File d'attente locale des opérations
- **Conflict Resolution**: Last-write-wins ou Custom
- **Offline-First**: L'app fonctionne sans connexion
- **Delta Sync**: Synchronisation incrémentale
- **Retry Logic**: Tentatives automatiques en cas d'échec

## 📊 Rapports & Analytics

### Types de Rapports

1. **Z de Caisse**: Rapport de fin de journée
2. **Ventes par Période**: Jour, semaine, mois
3. **Produits Populaires**: Best-sellers
4. **Performance Caissier**: Ventes par utilisateur
5. **Mouvements de Stock**: Entrées/sorties
6. **Analyse de Rentabilité**: Marges, profits

### Export

- PDF (pdfmake)
- Excel (xlsx)
- CSV

## 🧪 Tests

### Stratégie de Tests

- **Unit Tests**: Services, repositories (Jest)
- **Integration Tests**: IPC handlers, database
- **E2E Tests**: Spectron ou Playwright
- **Coverage**: Minimum 80%

## 📈 Performance

### Optimisations

- **Database**: Indexes, prepared statements, connection pooling
- **React**: Code splitting, lazy loading, memoization
- **Electron**: Preload optimization, worker threads
- **Build**: Minification, tree shaking

### Métriques

- Temps de démarrage < 3s
- Vente complète < 1s
- Recherche produit < 100ms
- Impression ticket < 2s

## 🚀 Déploiement

### Pipeline

1. **Build**: Compilation TypeScript + Webpack
2. **Test**: Lancement des tests automatiques
3. **Package**: Création de l'installateur Windows
4. **Sign**: Signature du code (optionnel)
5. **Publish**: Upload vers serveur de mises à jour
6. **Release**: Création de release notes

---

**Version**: 1.0.0
**Dernière mise à jour**: 2025-11-15
**Statut**: Architecture Initiale
