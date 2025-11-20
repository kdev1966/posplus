# 🔍 Instructions - Test Version Debug Windows

## ✅ Ce Qui a Été Fait

J'ai créé une **version de debug** de POSPlus pour diagnostiquer le problème d'écran blanc sur Windows.

### Modifications Apportées

1. **DevTools automatiquement ouvertes** en mode production
2. **Logs détaillés** pour tracer le chargement de l'interface
3. **Gestionnaires d'erreurs** pour capturer les problèmes de chargement

## 📦 Fichiers à Installer sur Windows

Dans le dossier `release/`, vous trouverez :

```
POSPlus Setup 1.0.0.exe          (Installateur - 87 MB)
POSPlus-Portable-1.0.0.exe       (Version portable - 87 MB)
```

## 🎯 Procédure de Test sur Windows

### Étape 1 : Installation

**Option A - Installateur** (Recommandé pour le debug)
```
1. Désinstaller l'ancienne version si présente
2. Double-clic sur "POSPlus Setup 1.0.0.exe"
3. Suivre l'assistant d'installation
```

**Option B - Portable**
```
1. Double-clic sur "POSPlus-Portable-1.0.0.exe"
2. L'application démarre directement
```

### Étape 2 : Lancement et Observation

Quand vous lancez l'application :

**A. Fenêtre DevTools s'ouvre automatiquement** (nouvelle fenêtre séparée)
   - Console tab = erreurs JavaScript
   - Network tab = fichiers chargés/manquants

**B. Fenêtre principale POSPlus**
   - Peut être blanche (problème actuel)
   - Ou afficher l'interface (problème résolu !)

### Étape 3 : Collecter les Informations

#### 📸 Captures d'Écran Nécessaires

1. **Fenêtre principale POSPlus** (montrer l'écran blanc ou ce qui s'affiche)
2. **DevTools - Onglet Console**
   - Toutes les lignes (surtout en rouge = erreurs)
   - Faire défiler jusqu'en bas
3. **DevTools - Onglet Network**
   - Liste des fichiers chargés
   - Fichiers en rouge = erreurs de chargement

#### 📋 Fichier Log à Récupérer

**Emplacement :**
```
Appuyez sur Windows + R
Tapez : %APPDATA%\POSPlus\logs
Entrée
```

**Fichier à envoyer :**
```
main.log (le plus récent)
```

**OU copier les dernières lignes** (50-100 lignes) qui contiennent :
- "Loading production app from:"
- "__dirname:"
- "Resolved path:"
- Toute ligne avec "Error" ou "Failed"

## 🔎 Ce Que Je Cherche dans les Logs

### Dans DevTools Console

❌ **Erreurs potentielles :**
```javascript
Failed to load resource: net::ERR_FILE_NOT_FOUND
Uncaught TypeError: Cannot read property 'X' of undefined
CSP violation...
```

✅ **Messages attendus :**
```javascript
[PRELOAD] Preload script loaded successfully
React app mounting...
```

### Dans main.log

❌ **Problèmes potentiels :**
```
Failed to load index.html: Error: ...
Failed to load: -6 - ERR_FILE_NOT_FOUND
Resolved path: C:\Program Files\POSPlus\resources\app.asar\dist\main\...WRONG...
```

✅ **Logs attendus :**
```
Loading production app from: C:\Program Files\POSPlus\resources\app.asar\dist\main\main-process\..\..\renderer\index.html
Page finished loading successfully
Window ready to show
```

## 📊 Scénarios Possibles

### Scénario 1 : Chemin Incorrect
**Symptôme :** Erreur "Failed to load index.html" dans les logs
**Cause :** Le chemin `../../renderer/index.html` est incorrect
**Solution :** Je corrigerai le chemin exact

### Scénario 2 : Fichiers Assets Manquants
**Symptôme :** DevTools Network montre fichiers .js/.css en rouge
**Cause :** Chemins relatifs incorrects dans index.html
**Solution :** Je modifierai la configuration Vite

### Scénario 3 : Erreur JavaScript
**Symptôme :** Console montre erreur JavaScript au démarrage
**Cause :** Code incompatible ou API manquante
**Solution :** Je corrigerai le code problématique

### Scénario 4 : CSP (Content Security Policy)
**Symptôme :** Erreur CSP violation dans Console
**Cause :** Electron bloque certains scripts
**Solution :** J'ajusterai les politiques de sécurité

## ✉️ Informations à Me Renvoyer

Merci de me fournir :

1. ✅ Capture DevTools Console (entière)
2. ✅ Capture DevTools Network tab
3. ✅ Capture fenêtre principale POSPlus
4. ✅ Contenu du fichier `main.log` (dernières 100 lignes)

**Format acceptable :**
- Screenshots (PNG, JPG)
- Texte copié-collé
- Fichier main.log attaché

## 🎯 Objectif

Avec ces informations, je pourrai :
- Identifier le problème exact (chemin, fichier, erreur JS)
- Créer un correctif ciblé
- Repackager une version corrigée
- Vous fournir une version qui fonctionne définitivement

## ⏭️ Prochaines Étapes

1. **Vous** : Testez cette version debug sur Windows
2. **Vous** : Collectez les informations (screenshots + log)
3. **Moi** : J'analyse et corrige le problème exact
4. **Moi** : Je créerai une version finale sans DevTools

---

**Questions ?** N'hésitez pas à demander des clarifications sur la procédure.
