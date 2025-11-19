# Debug POSPlus sur Windows - Écran Blanc

## 🔍 Comment Trouver les Logs

Lorsque l'application affiche un écran blanc, les logs contiennent des informations cruciales pour diagnostiquer le problème.

### Emplacement des Logs sur Windows

Les logs sont stockés dans :
```
%APPDATA%\POSPlus\logs\
```

**Chemin complet :**
```
C:\Users\[VotreNom]\AppData\Roaming\POSPlus\logs\
```

### Accéder aux Logs

**Méthode 1 : Explorateur de fichiers**
1. Appuyez sur `Windows + R`
2. Tapez : `%APPDATA%\POSPlus\logs`
3. Appuyez sur Entrée
4. Ouvrez le fichier le plus récent (ex: `main.log`)

**Méthode 2 : Directement**
1. Ouvrez l'Explorateur Windows
2. Allez dans : `C:\Users\[VotreNom]\AppData\Roaming\POSPlus\logs`
3. Ouvrez `main.log` avec Notepad

### 📋 Que Chercher dans les Logs

Cherchez ces messages importants :

```
Loading production app from: ...
__dirname: ...
Resolved path: ...
Failed to load index.html: ...
Failed to load: ...
Page finished loading successfully
```

### 🛠️ DevTools Activés Temporairement

**La fenêtre DevTools s'ouvrira automatiquement** avec cette version de debug.

Dans DevTools, vérifiez :
1. **Console** - Erreurs JavaScript en rouge
2. **Network** - Fichiers qui ne chargent pas (en rouge)
3. **Elements** - Le HTML est-il chargé ?

### 📸 Captures à Fournir

Si le problème persiste, prenez des captures d'écran de :

1. **La fenêtre de l'application** (écran blanc)
2. **DevTools - Onglet Console** (montrant toutes les erreurs)
3. **DevTools - Onglet Network** (montrant les requêtes)
4. **Le fichier main.log** (les 50 dernières lignes)

### ⚠️ Problèmes Courants

#### 1. Erreur "Failed to load index.html"
**Cause** : Chemin incorrect vers les fichiers
**Solution** : Vérifier le chemin dans les logs

#### 2. Erreur "net::ERR_FILE_NOT_FOUND"
**Cause** : Fichiers CSS/JS introuvables
**Solution** : Problème de chemins relatifs

#### 3. Écran blanc sans erreur
**Cause** : Erreur JavaScript silencieuse
**Solution** : Vérifier la console DevTools

### 🔄 Après Avoir Identifié le Problème

Envoyez-moi :
- Les 50 dernières lignes de `main.log`
- Capture d'écran de DevTools Console
- Description de ce qui s'affiche (écran blanc complet ? fenêtre ? etc.)

## 📧 Contact

Une fois les logs récupérés, nous pourrons corriger le problème exact.
