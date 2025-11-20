# 🚀 Quick Start - Build Windows (5 Minutes)

## Sur votre PC Windows (dans VS Code)

### 1️⃣ Installer les dépendances
```bash
npm install
```
⏱️ Attendez 3-5 minutes

---

### 2️⃣ Builder l'application
```bash
npm run package:win
```
⏱️ Attendez 5-10 minutes

---

### 3️⃣ Récupérer les fichiers

Les fichiers seront dans le dossier `release/` :

```
release/
├── POSPlus Setup 1.0.0.exe          ← Installateur complet
└── POSPlus-Portable-1.0.0.exe       ← Version portable (sans installation)
```

---

## ✅ C'est tout !

### Pour installer :
1. Double-clic sur `POSPlus Setup 1.0.0.exe`
2. Windows affichera "Éditeur inconnu" → Normal (pas de certificat)
3. Cliquez sur **"Plus d'infos"** → **"Exécuter quand même"**
4. Suivez l'assistant d'installation

### Pour tester sans installer :
1. Double-clic sur `POSPlus-Portable-1.0.0.exe`
2. L'application se lance directement

---

## 🐛 Problèmes ?

Voir le guide complet : [GUIDE_BUILD_WINDOWS.md](GUIDE_BUILD_WINDOWS.md)

### Commande de nettoyage (si problème) :
```bash
rmdir /s /q node_modules dist release
npm install
npm run package:win
```

---

## 📝 Info Auto-Update

**Question** : "Auto update : je ne sais pas"

**Réponse** : L'auto-update est **DÉSACTIVÉ par défaut**.

**Avantages de l'activer** :
- ✅ Utilisateurs reçoivent automatiquement les nouvelles versions
- ✅ Pas besoin de réinstaller manuellement
- ✅ Notifications de mise à jour dans l'app

**Inconvénients** :
- ❌ Nécessite d'héberger les releases sur GitHub
- ❌ Configuration supplémentaire
- ❌ Tests plus complexes

**Recommandation** :
Testez d'abord **SANS auto-update**. Vous pourrez l'activer plus tard quand l'app sera stable.

Pour l'activer plus tard, voir la section "Auto-Update" dans [GUIDE_BUILD_WINDOWS.md](GUIDE_BUILD_WINDOWS.md).
