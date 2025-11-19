# Guide de Build Windows pour POSPlus

## ✅ Prérequis (Déjà installés)
- ✅ Node.js 24.11.1
- ✅ npm 11.6.2
- ✅ Repo cloné sur PC Windows
- ✅ VS Code ouvert

---

## 📋 Étapes de Build

### Étape 1 : Installation des dépendances

Ouvrez le terminal dans VS Code (Ctrl + `) et exécutez :

```bash
npm install
```

**⏱️ Durée estimée** : 3-5 minutes (première fois)

**Note importante** : Le script `postinstall` va automatiquement rebuilder les modules natifs (`better-sqlite3`, `usb`, `canvas`) pour Windows. Des messages d'avertissement peuvent apparaître, c'est normal.

---

### Étape 2 : Vérification de l'icône Windows

Vérifiez que le fichier `build/icon.ico` existe :

```bash
dir build\icon.ico
```

Si le fichier n'existe pas, vous devrez créer une icône Windows (.ico) ou utiliser une icône par défaut.

---

### Étape 3 : Build de l'application

```bash
npm run package:win
```

**⏱️ Durée estimée** : 5-10 minutes

**Ce que cette commande fait** :
1. Compile le code TypeScript (frontend + backend)
2. Build avec Vite
3. Copie les migrations SQL
4. Package avec electron-builder
5. Crée l'installateur NSIS (.exe) et la version portable

---

### Étape 4 : Localiser les fichiers générés

Une fois le build terminé, vos fichiers seront dans :

```
release/
├── POSPlus Setup 1.0.0.exe          ← Installateur NSIS
├── POSPlus-Portable-1.0.0.exe       ← Version portable
└── win-unpacked/                    ← Version non packagée (pour tests)
```

---

## 🎯 Résultats Attendus

### Installateur NSIS (`POSPlus Setup 1.0.0.exe`)
- **Taille** : ~150-200 MB
- **Type** : Installation classique Windows
- **Fonctionnalités** :
  - ✅ Choix du dossier d'installation
  - ✅ Raccourci bureau
  - ✅ Raccourci menu démarrer
  - ✅ Programme de désinstallation
  - ⚠️ **Avertissement Windows** : "Éditeur inconnu" (normal sans certificat)

### Version Portable (`POSPlus-Portable-1.0.0.exe`)
- **Taille** : ~150-200 MB
- **Type** : Exécutable standalone
- **Avantage** : Pas d'installation requise
- **Utilisation** : Double-clic pour lancer

---

## ⚙️ Configuration Actuelle

Votre `package.json` est déjà configuré pour :

```json
{
  "win": {
    "target": "nsis + portable",
    "arch": "x64 seulement",
    "signing": "Désactivé (pas de certificat)"
  },
  "nsis": {
    "oneClick": false,              // Installation personnalisable
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "runAfterFinish": true          // Lance l'app après installation
  }
}
```

---

## 🚀 Auto-Update (Optionnel)

L'application inclut déjà `electron-updater`, mais il est **désactivé par défaut**.

### Pour activer les auto-updates :

1. **Héberger les releases** sur GitHub Releases
2. **Ajouter dans package.json** :
```json
"build": {
  "publish": {
    "provider": "github",
    "owner": "kdev1966",
    "repo": "posplus"
  }
}
```
3. **Rebuilder** avec `npm run package:win`

**Recommandation** : Testez d'abord sans auto-update. Vous pourrez l'activer plus tard.

---

## 🐛 Résolution de Problèmes

### Problème : Erreur lors de `npm install`

**Solution** :
```bash
# Nettoyer et réinstaller
rmdir /s /q node_modules
del package-lock.json
npm install
```

### Problème : Erreur "better-sqlite3 not found"

**Solution** :
```bash
# Rebuilder manuellement les modules natifs
npm run postinstall
```

### Problème : Erreur "icon.ico not found"

**Solutions** :
1. Vérifier que `build/icon.ico` existe
2. Créer une icône avec un outil en ligne : https://convertio.co/png-ico/
3. Ou temporairement commenter la ligne dans package.json :
```json
// "icon": "build/icon.ico",  // ← Commenter si pas d'icône
```

### Problème : Build très lent

**Normal** : Le premier build est toujours plus long (5-10 min). Les builds suivants sont plus rapides (~2-3 min).

### Problème : Avertissement "Publisher unknown" lors de l'installation

**Normal** : Sans certificat de code signing, Windows affiche un avertissement de sécurité.

**Pour installer quand même** :
1. Clic droit sur le .exe → Propriétés
2. Cocher "Débloquer" → OK
3. Double-clic pour installer
4. Cliquer sur "Plus d'infos" → "Exécuter quand même"

---

## 📊 Checklist Complète

Avant de commencer :
- [ ] Node.js 24.11.1 installé
- [ ] npm 11.6.2 installé
- [ ] Repo cloné sur PC Windows
- [ ] VS Code ouvert avec le projet

Étapes de build :
- [ ] `npm install` (attend la fin)
- [ ] Vérifier `build/icon.ico`
- [ ] `npm run package:win`
- [ ] Attendre 5-10 minutes
- [ ] Vérifier `release/POSPlus Setup 1.0.0.exe`

Test de l'installateur :
- [ ] Lancer l'installateur
- [ ] Accepter l'avertissement Windows
- [ ] Choisir le dossier d'installation
- [ ] Vérifier le raccourci bureau
- [ ] Lancer l'application
- [ ] Tester les fonctionnalités principales

---

## 🎓 Commandes Utiles

```bash
# Build uniquement (sans package)
npm run build

# Build dev (pour tester pendant le développement)
npm run dev

# Nettoyer avant rebuild
rmdir /s /q dist release

# Voir les logs de build
npm run package:win --verbose

# Build sans compression (plus rapide pour tests)
npm run package:win -- --dir
```

---

## 📝 Notes Importantes

1. **Première installation** : Prend 5-10 minutes (modules natifs à compiler)
2. **Builds suivants** : Plus rapides (~2-3 minutes)
3. **Taille finale** : ~150-200 MB (normal pour Electron + SQLite + Canvas)
4. **Avertissement Windows** : Normal sans certificat (coûte ~300-400€/an)
5. **Auto-update** : Désactivé par défaut, à activer si besoin

---

## ✅ Prochaines Étapes

Une fois le build réussi :

1. **Tester l'installateur** sur votre PC Windows
2. **Tester la version portable** sur une clé USB
3. **Partager** avec d'autres utilisateurs pour tests
4. **Collecter feedback** avant release officielle
5. **(Optionnel)** Acheter un certificat code signing pour production

---

## 🆘 Besoin d'Aide ?

Si vous rencontrez des problèmes :
1. Vérifiez la section "Résolution de Problèmes"
2. Copiez le message d'erreur complet
3. Contactez le support avec :
   - Message d'erreur
   - Commande exécutée
   - Version de Node.js (`node --version`)
   - Capture d'écran si possible

---

**Bonne chance ! 🚀**
