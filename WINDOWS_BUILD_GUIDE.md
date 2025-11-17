# Guide de Build POSPlus pour Windows 10

## Prérequis

1. **Node.js** (v18 ou supérieur)
   - Télécharger depuis: https://nodejs.org/
   - Recommandé: Node.js 20 LTS

2. **Visual Studio Build Tools** (pour compiler les modules natifs)
   - Télécharger depuis: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - Ou installer via npm: `npm install -g windows-build-tools`

3. **Python** (v3.x)
   - Généralement installé avec Visual Studio Build Tools

## Instructions de Build

### Option 1: Script PowerShell (Recommandé)

1. Ouvrir PowerShell en tant qu'Administrateur
2. Naviguer vers le dossier du projet:
   ```powershell
   cd C:\chemin\vers\posplus
   ```

3. Exécuter le script:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   .\build-windows.ps1
   ```

### Option 2: Manuel

1. **Installer les dépendances**
   ```cmd
   npm install
   ```

2. **Build de l'application**
   ```cmd
   npm run build
   ```

3. **Créer le package Windows**
   ```cmd
   npm run package:win
   ```

## Résultat

Après le build, vous trouverez:
- **release/POSPlus Portable.exe** - Application portable (recommandé pour POS)
- **release/win-unpacked/** - Application non-packagée

## Déploiement sur POS Windows 10

### Option A: Application Portable (Recommandé)

1. Copier `POSPlus Portable.exe` sur une clé USB
2. Transférer sur le POS Windows 10
3. Exécuter directement (pas d'installation requise)
4. L'application stocke ses données dans `%APPDATA%/posplus/`

### Option B: Installation NSIS

Si vous préférez un installateur:
1. Modifier `package.json`:
   ```json
   "win": {
     "target": [
       {
         "target": "nsis",
         "arch": ["x64"]
       }
     ]
   }
   ```

2. Rebuild:
   ```cmd
   npm run package:win
   ```

## Configuration pour POS

### Optimisations recommandées

1. **Démarrage automatique**
   - Ajouter un raccourci dans `shell:startup`

2. **Mode Kiosque**
   - Configurer le mode plein écran dans `src/main-process/main.ts`:
   ```javascript
   mainWindow = new BrowserWindow({
     fullscreen: true,
     kiosk: true,
     // ...
   })
   ```

3. **Base de données**
   - Les données sont stockées dans `%APPDATA%/posplus/database.sqlite`
   - Sauvegarder ce fichier régulièrement

## Dépannage

### Erreur "better-sqlite3 not found"
```cmd
npm rebuild better-sqlite3
```

### Erreur de compilation
```cmd
npm install -g windows-build-tools
npm rebuild
```

### Permissions
Exécuter PowerShell/CMD en tant qu'Administrateur

## Support

Pour toute assistance:
- Email: support@posplus.app
- Documentation: https://docs.posplus.app
