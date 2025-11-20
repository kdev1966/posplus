# Windows Quick Start - Checklist Rapide

## 🚀 Démarrage Rapide (15 minutes)

### Étape 1 : Prérequis (5 min)
```powershell
# Vérifier installations
node --version    # >= 18.x
npm --version     # >= 9.x
git --version
python --version  # >= 3.x
```

✅ **Tout est installé** → Passer à Étape 2
❌ **Manque quelque chose** → Voir [WINDOWS_BUILD_GUIDE.md](WINDOWS_BUILD_GUIDE.md) section Prérequis

### Étape 2 : Cloner et Installer (5 min)
```powershell
# Cloner
cd C:\Users\VotreNom\Desktop
git clone https://github.com/kdev1966/posplus.git
cd posplus

# Installer (5-10 min, prendre un café ☕)
npm install
```

### Étape 3 : Builder (2 min)
```powershell
# Build complet
npm run build
```

### Étape 4 : Tester (3 min)
```powershell
# Lancer en dev
npm run dev
```

**Attendre** :
- Fenêtre principale : Interface POS
- Fenêtre Customer Display : À droite (800x900)

**Login** : `admin` / `admin123`

---

## ✅ Tests Essentiels (10 minutes)

### 1. Interface POS (3 min)
```
☐ Dashboard s'affiche
☐ Aller dans POS → Ajouter un produit
☐ Créer un ticket
☐ Vérifier Customer Display se met à jour
```

### 2. P2P Services (3 min)
```
☐ Settings → Section "Synchronisation P2P"
☐ État: "✓ En ligne"
☐ Port 3030 actif
☐ Configuration générée
```

### 3. Base de Données (2 min)
```
☐ Vérifier fichier existe:
   C:\Users\VotreNom\AppData\Roaming\POSPlus\posplus.db

☐ Créer un produit → Redémarrer app → Produit toujours là
```

### 4. Customer Display (2 min)
```
☐ Fenêtre séparée visible
☐ Ajouter produit → Apparaît sur écran client
☐ Effectuer paiement → Animation "Merci"
```

---

## 🔥 Pare-feu Windows

### Autoriser P2P (Port 3030)
```powershell
# PowerShell en Administrateur
New-NetFirewallRule -DisplayName "POSPlus P2P" -Direction Inbound -Protocol TCP -LocalPort 3030 -Action Allow
```

### Vérifier Port Actif
```powershell
netstat -ano | findstr :3030
```
Doit afficher : `TCP 0.0.0.0:3030 ... LISTENING`

---

## 📦 Packaging (Optionnel)

### Créer Executable Windows
```powershell
npm run package:win
```

**Résultat** :
```
dist/
├── win-unpacked/POSPlus.exe        # Portable
└── POSPlus Setup 1.0.0.exe         # Installateur
```

---

## 🐛 Problèmes Fréquents

### "Python not found"
```powershell
npm config set python "C:\Python\python.exe"
```

### "MSBuild not found"
Installer Visual Studio Build Tools

### Port 3030 occupé
```powershell
# Trouver PID
netstat -ano | findstr :3030
# Tuer processus
taskkill /F /PID [PID]
```

### App ne démarre pas
```powershell
# Clean install
rm -r node_modules
npm install
npm run build
```

---

## 📊 Checklist Finale

### ✅ Tout Fonctionne Si :
```
✓ App démarre sans erreur
✓ Login fonctionne
✓ 2 fenêtres visibles
✓ P2P Status: "En ligne"
✓ Customer Display se synchronise
✓ Produits/Tickets créés correctement
✓ Port 3030 actif
✓ Base de données persiste
```

### 🎯 Vous Êtes Prêt Pour :
```
→ Installer sur POS Windows
→ Tester synchronisation multi-machines
→ Déploiement production
```

---

## 📁 Fichiers Importants

```
C:\Users\VotreNom\AppData\Roaming\POSPlus\
├── posplus.db          ← Base de données
├── pos-config.json     ← Config P2P
└── logs\main.log       ← Logs application
```

---

## 🚀 Commandes Rapides

```powershell
# Développement
npm run dev

# Build
npm run build

# Package Windows
npm run package:win

# Clean et rebuild
rm -r node_modules; npm install

# Voir logs
type "$env:APPDATA\POSPlus\logs\main.log"
```

---

## 📞 Si Problème

1. **Vérifier logs** : `AppData\Roaming\POSPlus\logs\`
2. **Vérifier pare-feu** : Port 3030 autorisé
3. **Vérifier processus** : `netstat -ano | findstr :3030`
4. **Clean install** : Supprimer `node_modules` et réinstaller

---

## ✅ C'est Tout !

**Temps total** : ~25 minutes (avec café ☕)

Si tout fonctionne → Passer au test multi-machines !
