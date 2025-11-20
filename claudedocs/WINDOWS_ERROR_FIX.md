# Fix Erreur Windows - ConfigManager

## ❌ Erreur Rencontrée

```
TypeError: Cannot read properties of undefined (reading 'getPath')
    at new ConfigManager (M:\...\ConfigManager.js:15:48)
```

## ✅ Correction Appliquée

Le problème était que `app.getPath('userData')` était appelé dans le constructeur de ConfigManager **avant que l'app Electron soit prête**.

### Solution Implémentée

**Lazy Initialization** : Le chemin de configuration n'est initialisé que lorsqu'il est réellement nécessaire (quand l'app est prête).

```typescript
// AVANT (❌ Erreur)
class ConfigManager {
  private configPath: string

  constructor() {
    this.configPath = join(app.getPath('userData'), 'pos-config.json')
    // ❌ app n'est pas encore prêt !
  }
}

// APRÈS (✅ Corrigé)
class ConfigManager {
  private configPath: string | null = null

  private getConfigPath(): string {
    if (!this.configPath) {
      this.configPath = join(app.getPath('userData'), 'pos-config.json')
      // ✅ Appelé seulement quand l'app est prête
    }
    return this.configPath
  }
}
```

## 🔄 Comment Appliquer la Correction

### Sur votre PC Windows

```powershell
# Naviguer vers le projet
cd M:\Users\dell\OneDrive\Bureau\posplus

# Récupérer les dernières modifications
git pull origin main

# Rebuild
npm run build:electron

# Relancer l'application
npm run dev
```

### Vérification du Fix

Si la correction fonctionne, vous devriez voir :

```
[1] Running in DEVELOPMENT mode
[1] App is ready
[1] Initializing database...
[1] P2P: Config saved to C:\Users\dell\AppData\Roaming\POSPlus\pos-config.json
[1] P2P: Created new config: POS-xxxxxxxx
[1] P2P: Configuration loaded: POS-xxxxxxxx
[1] P2P: Starting services...
[1] P2P: Server started on port 3030
```

## ✅ Résultat Attendu

Après `npm run dev` :
- ✅ Aucune erreur ConfigManager
- ✅ 2 fenêtres s'ouvrent (Main + Customer Display)
- ✅ Services P2P démarrés
- ✅ Configuration créée dans AppData
- ✅ Connexion P2P établie entre machines (voir P2P_CONNECTION_FIX.md)

## 🎯 Prochaine Étape

Une fois que l'app démarre correctement :
1. **Login** : `admin` / `admin123`
2. **Vérifier Dashboard**
3. **Aller dans Settings → P2P**
4. **Confirmer** : État "En ligne"

---

## 📝 Historique des Corrections

**ConfigManager Fix** : `7ab5efa` (2025-11-20)
- Lazy initialization pour éviter app.getPath() avant app ready

**app.isPackaged Fix** : `aa9f328` (2025-11-20)
- Déplacé logs dans app.whenReady()

**ELECTRON_RUN_AS_NODE Fix** : `e173568` (2025-11-20)
- Supprimé flag qui cassait Electron sur Windows

**P2P Connection Fix** : `b02090c` (2025-11-20)
- IPv4/IPv6 handling pour connexions WebSocket
- Voir [P2P_CONNECTION_FIX.md](P2P_CONNECTION_FIX.md)

**Testé** : ✅ Sur MacBook, ✅ Sur Windows (build), ⏳ P2P sync en attente test
