# Guide de Build et Test Windows

## 🎯 Objectif
Builder et tester l'application POSPlus sur PC Windows avant le déploiement sur le POS.

## 📋 Prérequis sur PC Windows

### 1. Logiciels Nécessaires

#### Node.js et npm
```powershell
# Vérifier l'installation
node --version  # Doit être >= 18.x
npm --version   # Doit être >= 9.x
```

**Si non installé** : Télécharger depuis https://nodejs.org/ (LTS version)

#### Git
```powershell
# Vérifier l'installation
git --version
```

**Si non installé** : Télécharger depuis https://git-scm.com/download/win

#### Python (pour node-gyp)
```powershell
# Vérifier l'installation
python --version  # Doit être >= 3.x
```

**Si non installé** : Télécharger depuis https://www.python.org/downloads/

#### Visual Studio Build Tools
**Nécessaire pour compiler les modules natifs (better-sqlite3, canvas, usb)**

**Option 1** : Installer Visual Studio Community 2022
- Télécharger : https://visualstudio.microsoft.com/fr/downloads/
- Cocher : "Développement Desktop avec C++"

**Option 2** : Build Tools uniquement
```powershell
# En tant qu'administrateur
npm install --global windows-build-tools
```

## 📥 Étape 1 : Cloner le Projet

### Sur PC Windows

```powershell
# Ouvrir PowerShell ou CMD
cd C:\Users\VotreNom\Desktop

# Cloner le repository
git clone https://github.com/kdev1966/posplus.git

# Entrer dans le dossier
cd posplus
```

## 📦 Étape 2 : Installer les Dépendances

```powershell
# Installer toutes les dépendances
npm install

# Cela va prendre 5-10 minutes
# Les modules natifs (better-sqlite3, canvas, usb) seront compilés
```

### ⚠️ Erreurs Communes

#### Erreur : "Python not found"
```powershell
npm config set python "C:\Python\python.exe"
```

#### Erreur : "MSBuild not found"
```powershell
# Installer Visual Studio Build Tools
# Puis redémarrer le terminal
```

#### Erreur : "node-gyp"
```powershell
npm install --global node-gyp
npm install --global windows-build-tools
```

## 🔨 Étape 3 : Builder l'Application

### Build Complet (Renderer + Main)

```powershell
# Build de l'application complète
npm run build
```

**Durée** : 2-3 minutes

**Résultat attendu** :
```
✓ dist/renderer/index.html
✓ dist/renderer/assets/index-*.js
✓ dist/main/main-process/main.js
✓ All migrations copied
```

### Build Uniquement Electron (plus rapide)

```powershell
# Si vous avez déjà fait le build complet
npm run build:electron
```

## 📦 Étape 4 : Packager pour Windows

### Package Standard (sans installation)

```powershell
npm run package:win
```

**Durée** : 5-10 minutes

**Résultat** : Dossier `dist/` avec l'application portable

### Package Installateur (Setup.exe)

Pour créer un installateur, le fichier `electron-builder.yml` est déjà configuré :

```powershell
npm run package:win
```

**Résultat attendu** :
```
dist/
├── win-unpacked/          # Version portable
│   └── POSPlus.exe
└── POSPlus Setup 1.0.0.exe  # Installateur
```

## 🧪 Étape 5 : Tester l'Application

### Option A : Mode Développement (Recommandé pour tests)

```powershell
# Lancer en mode dev avec hot reload
npm run dev
```

**Ce qui s'ouvre** :
- Fenêtre principale : Interface POS
- Fenêtre client : Customer Display (800x900, à droite)

**Tests à effectuer** :
1. ✅ Login : `admin` / `admin123`
2. ✅ Vérifier dashboard
3. ✅ Aller dans POS → Ajouter produits
4. ✅ Vérifier Customer Display se met à jour
5. ✅ Aller dans Settings → Section P2P
6. ✅ Vérifier statut P2P

### Option B : Application Packagée

```powershell
# Lancer l'executable
cd dist\win-unpacked
.\POSPlus.exe
```

## 🔍 Étape 6 : Vérifier les Services P2P

### Dans l'Application

1. **Login** avec `admin` / `admin123`

2. **Aller dans Settings** (Paramètres)

3. **Section "Synchronisation P2P"** :
   ```
   État du serveur P2P: ✓ En ligne
   Pairs connectés: 0 / 0
   Nom du POS: POSPlus-DESKTOP-XXXXXX
   ```

4. **Vérifier la configuration** :
   ```
   C:\Users\VotreNom\AppData\Roaming\POSPlus\pos-config.json
   ```

### Configuration P2P Attendue

```json
{
  "posId": "POS-xxxxxxxx",
  "posName": "POSPlus-DESKTOP-XXXXXX",
  "posType": "desktop",
  "p2p": {
    "enabled": true,
    "port": 3030,
    "discoveryEnabled": true,
    "autoSync": true,
    "reconnectInterval": 5000
  }
}
```

## 🔥 Étape 7 : Tester le Pare-feu

### Autoriser le Port P2P (3030)

```powershell
# En tant qu'administrateur
New-NetFirewallRule -DisplayName "POSPlus P2P" -Direction Inbound -Protocol TCP -LocalPort 3030 -Action Allow
```

### Vérifier le Port

```powershell
# Vérifier que l'application écoute sur le port 3030
netstat -ano | findstr :3030
```

**Résultat attendu** :
```
TCP    0.0.0.0:3030    0.0.0.0:0    LISTENING    12345
```

## 📊 Checklist de Test

### Tests Fonctionnels de Base
- [ ] ✅ Application démarre sans erreurs
- [ ] ✅ Login fonctionne (admin/admin123)
- [ ] ✅ Dashboard s'affiche
- [ ] ✅ Création de produits
- [ ] ✅ Création de tickets
- [ ] ✅ Gestion du stock
- [ ] ✅ Historique des ventes

### Tests Écran Client
- [ ] ✅ Customer Display s'ouvre en mode fenêtré (dev)
- [ ] ✅ Ajout produit au panier → apparaît sur écran client
- [ ] ✅ Paiement → animation de remerciement
- [ ] ✅ Changement de langue se répercute

### Tests P2P
- [ ] ✅ Serveur P2P démarre (port 3030)
- [ ] ✅ Configuration auto-générée
- [ ] ✅ Section P2P visible dans Settings
- [ ] ✅ Statut "En ligne" affiché
- [ ] ✅ Aucune erreur dans les logs

### Tests Base de Données
- [ ] ✅ Base de données créée dans AppData
- [ ] ✅ Migrations appliquées (6/6)
- [ ] ✅ Admin user créé par défaut
- [ ] ✅ Données persistées entre redémarrages

## 📁 Emplacements des Fichiers Windows

### Données Application
```
C:\Users\VotreNom\AppData\Roaming\POSPlus\
├── posplus.db              # Base de données SQLite
├── pos-config.json         # Configuration P2P
└── logs\                   # Logs de l'application
```

### Logs
```powershell
# Voir les logs
type "C:\Users\VotreNom\AppData\Roaming\POSPlus\logs\main.log"
```

### Backups
```
C:\Users\VotreNom\Documents\POSPlus\Backups\
```

## 🐛 Dépannage

### Problème : "better-sqlite3" ne compile pas

```powershell
# Réinstaller avec rebuild
npm rebuild better-sqlite3 --build-from-source
```

### Problème : "canvas" ne compile pas

```powershell
# Installer GTK2
# Télécharger: https://github.com/Automattic/node-canvas/wiki/Installation:-Windows
```

### Problème : Application ne démarre pas

```powershell
# Nettoyer et rebuild
rm -r node_modules
rm package-lock.json
npm install
npm run build
```

### Problème : Port 3030 déjà utilisé

```powershell
# Trouver le processus
netstat -ano | findstr :3030

# Tuer le processus (remplacer PID)
taskkill /F /PID 12345
```

### Problème : Base de données corrompue

```powershell
# Supprimer et relancer (les migrations recréeront tout)
del "C:\Users\VotreNom\AppData\Roaming\POSPlus\posplus.db"
```

## 📝 Logs à Vérifier

### Logs de Démarrage P2P (Bons Signes)
```
P2P: Configuration loaded: POS-xxxxxxxx
P2P: Starting services...
P2P: Server started on port 3030
P2P: Advertising as POSPlus-DESKTOP-XXXXXX on port 3030
P2P: Discovery started
P2P: Services started successfully
```

### Logs de Démarrage Application
```
Running in DEVELOPMENT mode (ou PRODUCTION)
Database initialized successfully
Migrations completed (6/6)
Main window created
Customer window created
Customer window ready to show
```

## 🎯 Étape Suivante : Test Multi-Machines

Une fois que tout fonctionne sur votre PC Windows :

1. **Installer sur le POS** (même procédure)
2. **Connecter les 2 machines au même réseau**
3. **Vérifier découverte P2P** :
   - PC Windows devrait voir le POS
   - POS devrait voir le PC Windows
4. **Tester synchronisation** :
   - Créer produit sur PC → apparaît sur POS
   - Créer ticket sur POS → apparaît sur PC

## 📞 Support

En cas de problème :
1. Vérifier les logs dans AppData
2. Vérifier le pare-feu Windows
3. Vérifier que le port 3030 est libre
4. Partager les messages d'erreur

## ✅ Résultat Attendu

Si tout fonctionne :
- ✅ Application démarre en ~4 secondes
- ✅ 2 fenêtres ouvertes (Main + Customer)
- ✅ P2P services actifs
- ✅ Configuration auto-créée
- ✅ Aucune erreur critique

**Vous êtes prêt pour le déploiement sur le POS !** 🚀
