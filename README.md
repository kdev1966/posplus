# POS+ (POSPlus)

Système de Point de Vente professionnel avec architecture offline-first, synchronisation P2P entre terminaux et support bilingue Français/Arabe.

## Fonctionnalités

- **Offline-First** - Fonctionne sans connexion internet, données stockées localement
- **Synchronisation P2P** - Synchronisation temps réel entre plusieurs terminaux
- **Bilingue** - Interface Français/Arabe avec support RTL
- **Gestion des produits** - Catalogue complet avec catégories, codes-barres et recherche full-text
- **Gestion du stock** - Suivi des mouvements, alertes de stock bas
- **Sessions de caisse** - Ouverture/fermeture avec statistiques
- **Rapports Z** - Résumés journaliers des ventes
- **Impression thermique** - Support EPSON/STAR avec tickets RTL
- **Affichage client** - Écran secondaire pour les clients
- **Import/Export Excel** - Pour produits et catégories
- **Sauvegarde/Restauration** - Backup de la base de données
- **Gestion des utilisateurs** - 3 rôles (Administrateur, Manager, Caissier)
- **Mode sombre** - Interface claire ou sombre

## Stack Technologique

| Catégorie | Technologies |
|-----------|-------------|
| Framework | Electron 29.4.6 |
| Frontend | React 18.2.0 |
| Langage | TypeScript 5.3.3 |
| Build | Vite 5.0.10 |
| State Management | Zustand 4.4.7 |
| Styling | Tailwind CSS 3.4.0 |
| Animations | Framer Motion |
| Base de données | SQLite (better-sqlite3) |
| P2P | WebSocket + Bonjour |
| Impression | node-thermal-printer |

## Prérequis

- Node.js 18+
- npm 9+
- Windows 10/11, macOS ou Linux
- (Optionnel) Imprimante thermique compatible EPSON/STAR

## Installation

```bash
# Cloner le repository
git clone <repository-url>
cd posplus

# Installer les dépendances
npm install

# Les modules natifs (better-sqlite3, usb, canvas) sont reconstruits automatiquement
```

## Scripts Disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance l'application en mode développement |
| `npm run build` | Compile le projet pour la production |
| `npm run package:win` | Crée l'installateur Windows (NSIS + Portable) |
| `npm run package:mac` | Crée le DMG pour macOS |
| `npm run package:linux` | Crée AppImage et .deb pour Linux |
| `npm test` | Lance les tests unitaires |
| `npm run test:coverage` | Lance les tests avec rapport de couverture |
| `npm run lint` | Vérifie le code avec ESLint |
| `npm run format` | Formate le code avec Prettier |

## Structure du Projet

```
posplus/
├── src/
│   ├── main-process/           # Processus principal Electron
│   │   ├── handlers/           # Gestionnaires IPC (15 handlers)
│   │   ├── services/           # Services métier
│   │   │   ├── auth/           # Authentification
│   │   │   ├── backup/         # Sauvegarde
│   │   │   ├── database/       # Base de données + repositories
│   │   │   │   ├── migrations/ # Migrations SQL (11 fichiers)
│   │   │   │   └── repositories/
│   │   │   ├── p2p/            # Synchronisation P2P
│   │   │   ├── printer/        # Impression thermique
│   │   │   └── sync/           # Synchronisation
│   │   ├── main.ts             # Point d'entrée Electron
│   │   └── preload.ts          # Script preload
│   │
│   ├── renderer/               # Interface React
│   │   ├── api/                # Couche d'abstraction API
│   │   ├── components/         # Composants React
│   │   │   ├── layout/         # Layout
│   │   │   ├── pos/            # Composants POS
│   │   │   ├── print/          # Aperçu impression
│   │   │   └── ui/             # Composants UI réutilisables
│   │   ├── pages/              # Pages (10 pages)
│   │   ├── store/              # Stores Zustand (9 stores)
│   │   ├── i18n/               # Traductions FR/AR
│   │   └── styles/             # Styles CSS/Tailwind
│   │
│   └── shared/                 # Code partagé
│       ├── constants/          # Constantes
│       └── types/              # Types TypeScript
│
├── build/                      # Ressources de build et icônes
├── scripts/                    # Scripts utilitaires
├── config/                     # Configuration
└── release/                    # Installateurs générés
```

## Pages de l'Application

| Page | Description |
|------|-------------|
| `/login` | Connexion utilisateur |
| `/dashboard` | Tableau de bord avec statistiques |
| `/pos` | Terminal de vente |
| `/products` | Gestion des produits |
| `/categories` | Gestion des catégories |
| `/stock` | Gestion du stock |
| `/history` | Historique des transactions |
| `/users` | Gestion des utilisateurs |
| `/settings` | Paramètres de l'application |
| `/customer` | Affichage client (écran secondaire) |

## Base de Données

SQLite avec les tables principales :

- `users`, `roles`, `permissions` - Gestion des accès
- `products`, `categories` - Catalogue produits
- `tickets`, `ticket_lines`, `payments` - Transactions
- `cash_sessions`, `z_reports` - Sessions et rapports
- `stock_logs` - Historique des mouvements de stock
- `settings` - Configuration

## Configuration Imprimante

L'application supporte les imprimantes thermiques via :
- **Windows** : Impression native via le spooler Windows
- **Autres OS** : node-thermal-printer (ports série/parallèle)

Configurez votre imprimante dans **Paramètres > Imprimante**.

## Synchronisation P2P

Les terminaux se découvrent automatiquement sur le réseau local via Bonjour/mDNS et synchronisent :
- Produits et catégories
- Stock
- Utilisateurs
- Transactions

Port WebSocket par défaut : `3030`

## Développement

```bash
# Mode développement avec hot-reload
npm run dev

# L'application s'ouvre automatiquement
# Vite dev server : http://localhost:5173
```

## Build Production

```bash
# Build complet
npm run build

# Créer l'installateur Windows
npm run package:win

# Les fichiers sont générés dans ./release/
```

## Tests

```bash
# Lancer les tests
npm test

# Mode watch
npm run test:watch

# Avec couverture
npm run test:coverage
```

## Licence

MIT

## Auteur

POS+ Team
