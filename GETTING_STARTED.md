# POSPlus - Guide de Démarrage

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- **Node.js** (version 18 ou supérieure)
- **npm** ou **yarn**
- **Windows 10/11** (pour le packaging final)

## 🚀 Installation

### 1. Cloner le projet

```bash
git clone <repository-url>
cd posplus
```

### 2. Installer les dépendances

```bash
npm install
```

## 💻 Développement

### Démarrer l'application en mode développement

```bash
npm run dev
```

Cette commande va :
- Démarrer le serveur de développement Webpack pour le renderer (port 3000)
- Compiler le processus principal Electron en mode watch
- Ouvrir les DevTools automatiquement

### Lancer l'application Electron

Dans un autre terminal :

```bash
npm start
```

## 🏗️ Build & Packaging

### Build de production

```bash
npm run build
```

Cette commande compile :
- Le processus principal dans `dist/main/`
- Le renderer dans `dist/renderer/`

### Créer un package Windows

```bash
npm run package
```

Cela créera un installateur Windows (`.exe`) dans le dossier `release/`.

### Package sans installateur (pour test)

```bash
npm run package:dir
```

## 🔐 Connexion par Défaut

Au premier lancement, utilisez :

- **Nom d'utilisateur**: `admin`
- **Mot de passe**: `admin123`

## 📁 Structure du Projet

```
posplus/
├── src/
│   ├── main/           # Processus principal Electron (Node.js)
│   ├── renderer/       # Application React
│   ├── preload/        # Script preload (bridge sécurisé)
│   └── shared/         # Code partagé (types, constantes)
├── dist/               # Fichiers compilés
├── release/            # Packages finaux (.exe)
└── resources/          # Ressources pour le build
```

## 🧪 Tests

### Lancer les tests

```bash
npm test
```

### Tests avec watch mode

```bash
npm run test:watch
```

### Coverage

```bash
npm run test:coverage
```

## 🔍 Linting & Type Checking

### ESLint

```bash
npm run lint
npm run lint:fix
```

### TypeScript Type Checking

```bash
npm run typecheck
```

## 🗄️ Base de Données

La base de données SQLite est créée automatiquement au premier lancement dans :

**Windows**: `%APPDATA%/posplus/data/posplus.db`

### Réinitialiser la base de données

```bash
npm run db:reset
```

### Exécuter les migrations

```bash
npm run migrate
```

## 🔧 Configuration

### Variables d'environnement

Copiez `.env.example` vers `.env` et configurez :

```bash
cp .env.example .env
```

### Fichier de configuration

Modifiez les paramètres dans :
- `package.json` (section "build" pour electron-builder)
- `webpack.main.config.js` et `webpack.renderer.config.js`

## 📦 Fonctionnalités Principales

### ✅ Implémentées dans l'architecture

1. **Authentication & Authorization**
   - Login/Logout
   - Sessions sécurisées
   - Gestion des rôles (Admin/Caissier)

2. **Base de Données**
   - SQLite avec migrations
   - Repositories pattern
   - Indexes optimisés

3. **IPC Type-Safe**
   - Contrats typés
   - Validation des données
   - Gestion d'erreurs

4. **UI Foundation**
   - React + TypeScript
   - Routing
   - Contexts (Auth, Cart)
   - Design system moderne

### 🚧 À Implémenter

1. **Écran POS Complet**
   - Interface de vente
   - Panier interactif
   - Paiement multi-méthodes

2. **Gestion Produits Complète**
   - CRUD produits
   - Import/Export CSV
   - Gestion du stock

3. **Imprimante Thermique**
   - Intégration ESC/POS
   - Templates de tickets
   - Ouverture tiroir-caisse

4. **Scanner Code-Barres**
   - Détection USB HID
   - Intégration en temps réel

5. **Rapports & Dashboard**
   - Graphiques
   - Export PDF/Excel
   - Z de caisse

6. **Auto-Update**
   - Vérification automatique
   - Téléchargement en arrière-plan
   - Installation au redémarrage

7. **Synchronisation Cloud** (Future)
   - API REST
   - Sync queue
   - Résolution de conflits

## 🎯 Prochaines Étapes

1. **Phase 1 - MVP Core**
   - Implémenter l'écran POS complet
   - Finaliser la gestion des produits
   - Ajouter les rapports basiques

2. **Phase 2 - Hardware**
   - Intégrer l'imprimante thermique
   - Implémenter le scanner USB HID
   - Tester le tiroir-caisse

3. **Phase 3 - Features Avancées**
   - Dashboard avec graphiques
   - Export avancés (PDF, Excel)
   - Gestion multi-utilisateurs

4. **Phase 4 - Cloud**
   - API backend
   - Synchronisation
   - Backup automatique

## 🐛 Debugging

### DevTools

En développement, les DevTools Chrome s'ouvrent automatiquement.

### Logs

Les logs sont stockés dans :
- **Windows**: `%APPDATA%/posplus/logs/`

Niveaux de logs :
- `posplus.log` - Tous les logs
- `error.log` - Erreurs uniquement

### Debug du Processus Principal

Ajoutez des points d'arrêt dans VS Code avec la configuration :

```json
{
  "type": "node",
  "request": "launch",
  "name": "Electron Main",
  "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
  "program": "${workspaceFolder}/dist/main/index.js"
}
```

## 📚 Documentation Technique

Pour plus de détails sur l'architecture :
- Voir `ARCHITECTURE.md` pour l'architecture complète
- Voir `README.md` pour une vue d'ensemble

## ❓ FAQ

### L'application ne démarre pas

1. Vérifiez que toutes les dépendances sont installées : `npm install`
2. Supprimez `node_modules` et `dist`, puis réinstallez
3. Vérifiez les logs dans le dossier `logs/`

### La base de données est corrompue

```bash
npm run db:reset
```

⚠️ Attention : Cela supprimera toutes les données !

### Erreur de build

1. Vérifiez que TypeScript compile sans erreur : `npm run typecheck`
2. Vérifiez ESLint : `npm run lint`
3. Nettoyez le dossier `dist/` et rebuilder

## 🤝 Contribution

Ce projet suit les principes :
- SOLID
- Clean Architecture
- Type Safety (TypeScript strict mode)
- Tests unitaires et d'intégration

## 📄 Licence

MIT License - Voir LICENSE file

---

**Version**: 1.0.0
**Dernière mise à jour**: 2025-11-15
**Statut**: Architecture Initiale Complète
