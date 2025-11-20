# POSPlus - Guide de Configuration Complet

Ce guide détaille la configuration complète de l'environnement de développement POSPlus pour macOS et Windows, ainsi que les procédures de build et déploiement.

## Table des Matières

1. [Prérequis](#prérequis)
2. [Configuration macOS](#configuration-macos)
3. [Configuration Windows](#configuration-windows)
4. [Développement](#développement)
5. [Build et Packaging](#build-et-packaging)
6. [Tests](#tests)
7. [Déploiement](#déploiement)
8. [Résolution de Problèmes](#résolution-de-problèmes)

---

## Prérequis

### Matériel Minimum
- **macOS**: macOS 10.15+ (Catalina ou supérieur)
- **Windows**: Windows 10/11 x64
- **RAM**: 8 Go minimum (16 Go recommandé)
- **Stockage**: 10 Go d'espace libre

### Logiciels Requis
- Node.js 18.x ou 20.x LTS
- npm 9.x ou supérieur
- Git 2.x
- Visual Studio Code (recommandé)

---

## Configuration macOS

### Installation Automatique

```bash
# Cloner le projet
git clone https://github.com/kdev1966/posplus.git
cd posplus

# Exécuter le script d'installation
chmod +x scripts/setup-mac.sh
./scripts/setup-mac.sh
```

### Installation Manuelle

#### 1. Installer Homebrew
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### 2. Installer Node.js
```bash
brew install node@20
```

#### 3. Installer les dépendances natives
```bash
# Pour canvas (génération de graphiques)
brew install cairo pango libpng jpeg giflib librsvg pixman

# Pour USB support (imprimantes thermiques)
brew install libusb

# Pour node-gyp
brew install python@3.11 pkg-config
```

#### 4. Installer les dépendances du projet
```bash
cd posplus
npm install
npm run postinstall
```

#### 5. Configurer VSCode
Installez ces extensions :
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin
- GitLens

### Vérification
```bash
# Vérifier la compilation TypeScript
npx tsc --noEmit

# Tester le build
npm run build:electron
```

---

## Configuration Windows

### Installation Automatique

```powershell
# Ouvrir PowerShell en tant qu'Administrateur
# Naviguer vers le projet
cd C:\path\to\posplus

# Exécuter le script d'installation
.\scripts\setup-windows.ps1
```

### Installation Manuelle

#### 1. Installer Chocolatey
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

#### 2. Installer les outils de développement
```powershell
choco install nodejs-lts -y
choco install git -y
choco install python311 -y
choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive --norestart" -y
```

#### 3. Configurer npm pour Windows
```powershell
npm config set msvs_version 2022
npm config set python python
```

#### 4. Installer les dépendances
```powershell
cd C:\path\to\posplus
npm install
npm run postinstall
```

### Important pour Windows

**Éviter les symlinks** :
- Windows a des restrictions sur les symlinks
- Le projet est configuré pour ne pas utiliser de symlinks

**Cache npm** :
```powershell
# Nettoyer le cache si nécessaire
npm cache clean --force
```

---

## Développement

### Démarrage Rapide

```bash
# Mode développement avec hot reload
npm run dev
```

Cela démarre :
- Vite Dev Server sur http://localhost:5173
- Electron avec DevTools activé
- Hot reload pour React/TypeScript

### Scripts Disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarre le serveur de développement |
| `npm run build` | Compile pour production |
| `npm run test` | Exécute les tests unitaires |
| `npm run lint` | Vérifie le code avec ESLint |
| `npm run format` | Formate le code avec Prettier |
| `npm run package:mac` | Crée l'installateur macOS |
| `npm run package:win` | Crée l'installateur Windows |

### Développement Parallèle Mac + Windows VM

Pour développer sur Mac tout en testant sur une VM Windows :

```bash
# Sur macOS
./scripts/dev-parallel.sh
```

Configuration de la VM Windows :
1. Partager le dossier du projet via réseau ou dossier partagé
2. Sur Windows VM : `npm run dev`
3. Utiliser des ports différents si nécessaire (modifier VITE_PORT)

### Structure du Code

```
posplus/
├── src/
│   ├── main-process/          # Code Electron (Node.js)
│   │   ├── handlers/          # IPC handlers
│   │   ├── services/          # Services métier
│   │   │   ├── auth/          # Authentification
│   │   │   ├── database/      # SQLite + repositories
│   │   │   ├── printer/       # Impression thermique
│   │   │   └── sync/          # Synchronisation
│   │   ├── main.ts            # Point d'entrée Electron
│   │   └── preload.ts         # Bridge sécurisé
│   │
│   ├── renderer/              # Interface React
│   │   ├── components/        # Composants réutilisables
│   │   ├── pages/             # Pages de l'application
│   │   ├── store/             # États Zustand
│   │   ├── styles/            # CSS Tailwind
│   │   └── App.tsx            # Composant racine
│   │
│   └── shared/                # Types et constantes partagés
│
├── scripts/                   # Scripts d'automatisation
├── build/                     # Ressources de build (icônes)
├── assets/                    # Assets statiques
└── dist/                      # Code compilé (généré)
```

### Thème Sombre/Clair

Le système de thème est maintenant intégré :

```tsx
// Utilisation du store de thème
import { useThemeStore } from './store/themeStore'

const MyComponent = () => {
  const { theme, setTheme, toggleTheme } = useThemeStore()

  return (
    <div className="bg-white dark:bg-gray-900">
      {/* Le composant adapte automatiquement ses couleurs */}
    </div>
  )
}
```

Options de thème :
- **light** : Thème clair
- **dark** : Thème sombre
- **system** : Suit les préférences système

---

## Build et Packaging

### Build pour macOS

```bash
# Build complet + installateur DMG
npm run package:mac
```

Résultat dans `release/`:
- `POSPlus-1.0.0.dmg` - Installateur macOS

### Build pour Windows

#### Méthode 1 : Script automatisé

```powershell
# Sur Windows
.\scripts\build-windows.ps1
```

Options :
- `-Clean` : Nettoie avant le build
- `-Portable` : Crée uniquement la version portable
- `-NSIS` : Crée uniquement l'installateur NSIS
- `-Both` : Crée les deux versions (défaut)

#### Méthode 2 : Commandes npm

```powershell
npm run build
npm run package:win
```

Résultat dans `release/`:
- `POSPlus Setup 1.0.0.exe` - Installateur NSIS
- `POSPlus-Portable-1.0.0.exe` - Version portable

### Configuration NSIS

Le fichier `package.json` contient la configuration optimisée :

```json
{
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "perMachine": false,
    "allowElevation": true,
    "runAfterFinish": true
  }
}
```

### Désactivation du Code Signing

Pour le développement, le code signing est désactivé :

```json
{
  "win": {
    "signingHashAlgorithms": [],
    "signDlls": false
  }
}
```

Pour activer le code signing en production :
1. Obtenir un certificat EV Code Signing
2. Configurer les variables d'environnement :
   ```
   CSC_LINK=path/to/certificate.p12
   CSC_KEY_PASSWORD=your_password
   ```

---

## Tests

### Exécuter les Tests Unitaires

```bash
npm run test
```

### Test du Build

```bash
./scripts/test-build.sh
```

Ce script vérifie :
- Structure des fichiers compilés
- Migrations SQLite
- Compilation TypeScript
- Modules natifs
- Assets et icônes

### Tests Manuels Recommandés

1. **Authentification**
   - Login avec admin/admin123
   - Vérifier les permissions

2. **Session de Caisse**
   - Ouvrir/fermer une session
   - Vérifier le fond de caisse

3. **Vente**
   - Ajouter des produits au panier
   - Processus de paiement
   - Impression de ticket

4. **Thème**
   - Basculer entre les thèmes
   - Vérifier la persistance

---

## Déploiement

### Distribution Windows

1. **Préparation**
   ```powershell
   # Nettoyer
   .\scripts\build-windows.ps1 -Clean

   # Build
   .\scripts\build-windows.ps1
   ```

2. **Fichiers à distribuer**
   - `release/POSPlus Setup 1.0.0.exe`
   - `LICENSE`
   - `README.md`

3. **Instructions client**
   - Double-cliquer sur l'installateur
   - Suivre les étapes
   - L'application démarre automatiquement

### Distribution macOS

1. **Build**
   ```bash
   npm run package:mac
   ```

2. **Fichiers à distribuer**
   - `release/POSPlus-1.0.0.dmg`

3. **Instructions utilisateur**
   - Ouvrir le DMG
   - Glisser POSPlus vers Applications
   - Lancer depuis Launchpad

---

## Résolution de Problèmes

### Problème : `better-sqlite3` ne compile pas

**macOS** :
```bash
xcode-select --install
npm run postinstall
```

**Windows** :
```powershell
npm config set msvs_version 2022
npm run postinstall
```

### Problème : Erreur de permissions sur macOS

```bash
sudo chown -R $(whoami) /usr/local/lib/node_modules
sudo chown -R $(whoami) ~/.npm
```

### Problème : Port 5173 déjà utilisé

```bash
# macOS/Linux
lsof -i :5173 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Problème : Hot reload ne fonctionne pas

1. Vérifier que Vite est démarré
2. Vérifier le fichier `vite.config.ts`
3. Redémarrer avec `npm run dev`

### Problème : Icônes manquantes dans le build

Créer les fichiers dans `build/`:
- `icon.ico` (Windows) - 256x256 minimum
- `icon.icns` (macOS) - Multi-résolution
- `icon.png` (Linux) - 512x512 recommandé

### Problème : Erreur "Cannot find module"

```bash
# Nettoyer et réinstaller
rm -rf node_modules package-lock.json
npm install
npm run postinstall
```

### Problème : Base de données corrompue

```bash
# Supprimer la base de données (données perdues!)
rm posplus.db*

# Relancer l'application (recréera la DB)
npm run dev
```

---

## Notes Importantes

### Sécurité

- Ne jamais commiter `.env` avec des secrets
- Les credentials par défaut doivent être changés en production
- Le code signing est requis pour la distribution publique

### Performance

- Utiliser `npm run build` pour la production
- Le mode développement est plus lent
- Minimiser les re-renders React

### Compatibilité

- Testé sur macOS 10.15+
- Testé sur Windows 10/11 x64
- Node.js 18.x et 20.x supportés

---

## Support

Pour toute question ou problème :
1. Consulter ce guide
2. Vérifier les logs (`npm run dev`)
3. Ouvrir une issue sur GitHub

---

*Guide créé le 2024 - POSPlus Team*
