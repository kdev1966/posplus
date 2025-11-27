# POSPlus - Système de Licensing Professionnel

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Configuration initiale](#configuration-initiale)
5. [Génération de licences](#génération-de-licences)
6. [Activation côté client](#activation-côté-client)
7. [Sécurité](#sécurité)
8. [Dépannage](#dépannage)
9. [API Reference](#api-reference)

---

## Vue d'ensemble

Le système de licensing POSPlus est une solution 100% offline qui protège l'application contre la copie et l'utilisation non autorisée. Il utilise:

- **Hardware ID**: Identifiant unique basé sur le matériel (Machine UUID, CPU ID, Disk Serial, MAC Address)
- **RSA-2048**: Signature cryptographique des licences
- **Binding matériel**: Chaque licence est liée à une machine spécifique

### Caractéristiques

- Fonctionne entièrement offline
- Impossible de copier une licence d'une machine à une autre
- Résistant à la réinstallation (HWID stable)
- Types de licences: DEMO, BASIC, PRO, ENTERPRISE
- Révocation de licences
- Protection des backups

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     OUTIL CLI (Admin)                        │
│   license-tool/                                              │
│   ├── Génération clés RSA                                   │
│   ├── Création de licences                                  │
│   ├── Vérification                                          │
│   └── Révocation                                            │
│         │                                                    │
│         │ Fichier .lic signé                                │
│         ▼                                                    │
├─────────────────────────────────────────────────────────────┤
│                   APPLICATION POSPlus                        │
│                                                              │
│  ┌──────────────────┐     ┌──────────────────┐              │
│  │   Main Process   │────│  License Module  │              │
│  │   (Electron)     │     │  - hardwareId    │              │
│  │                  │     │  - validator     │              │
│  │                  │     │  - dbProtection  │              │
│  └──────────────────┘     └──────────────────┘              │
│           │                                                  │
│           │ IPC                                              │
│           ▼                                                  │
│  ┌──────────────────────────────────────────┐               │
│  │          Renderer (React)                 │               │
│  │  ┌─────────────────┐  ┌───────────────┐  │               │
│  │  │ Page Activation │  │ LicenseStore  │  │               │
│  │  └─────────────────┘  └───────────────┘  │               │
│  └──────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### Structure des fichiers

```
posplus/
├── license-tool/                    # Outil CLI (NE PAS DISTRIBUER)
│   ├── package.json
│   ├── tsconfig.json
│   ├── bin/
│   │   └── posplus-license.js
│   ├── src/
│   │   ├── index.ts                 # Point d'entrée CLI
│   │   ├── types.ts
│   │   ├── commands/
│   │   │   ├── init.ts              # Initialisation RSA
│   │   │   ├── generate.ts          # Génération licence
│   │   │   ├── verify.ts            # Vérification
│   │   │   ├── list.ts              # Liste licences
│   │   │   └── revoke.ts            # Révocation
│   │   ├── crypto/
│   │   │   └── rsa.ts               # Fonctions RSA
│   │   └── storage/
│   │       └── licenseStore.ts      # Stockage local
│   ├── keys/                        # Clés RSA (CONFIDENTIEL)
│   │   ├── private.pem              # NE JAMAIS PARTAGER
│   │   └── public.pem               # À intégrer dans l'app
│   └── data/
│       └── licenses.json            # Registre des licences
│
├── src/main-process/services/license/
│   ├── index.ts                     # Exports
│   ├── hardwareId.ts                # Génération HWID
│   ├── licenseValidator.ts          # Validation licence
│   └── databaseProtection.ts        # Protection DB
│
├── src/main-process/handlers/
│   └── licenseHandlers.ts           # IPC handlers
│
├── src/shared/types/
│   └── license.ts                   # Types TypeScript
│
├── src/renderer/store/
│   └── licenseStore.ts              # État Zustand
│
├── src/renderer/pages/
│   └── Activation.tsx               # Page d'activation
│
└── src/renderer/components/license/
    └── LicenseInfo.tsx              # Composant info licence
```

---

## Installation

### 1. Outil CLI (côté admin)

```bash
cd license-tool
npm install
npm run build
```

### 2. POSPlus (côté application)

L'intégration est déjà effectuée. Les dépendances utilisées sont natives à Node.js:
- `crypto` (inclus dans Node.js)
- `fs` (inclus dans Node.js)
- `child_process` (inclus dans Node.js)

---

## Configuration initiale

### Étape 1: Générer les clés RSA

```bash
cd license-tool
npm run build
node dist/index.js init
```

Cela génère:
- `keys/private.pem` - Clé privée (GARDER SECRET)
- `keys/public.pem` - Clé publique

### Étape 2: Intégrer la clé publique dans POSPlus

1. Copiez le contenu de `keys/public.pem`
2. Ouvrez `src/main-process/services/license/licenseValidator.ts`
3. Remplacez le placeholder `PUBLIC_KEY` par votre clé publique

```typescript
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
[VOTRE CLÉ PUBLIQUE ICI]
...AQIDAQAB
-----END PUBLIC KEY-----`;
```

### Étape 3: Compiler POSPlus

```bash
npm run build
```

---

## Génération de licences

### Workflow standard

1. **Client demande une licence**
   - Le client lance POSPlus
   - L'écran d'activation affiche le Hardware ID
   - Le client envoie cet ID par email/téléphone

2. **Admin génère la licence**
   ```bash
   cd license-tool
   node dist/index.js generate \
     --hwid "a1b2c3d4e5f6..." \
     --client "Restaurant ABC" \
     --type PRO \
     --expires 2026-01-01
   ```

3. **Admin envoie le fichier .lic au client**

4. **Client importe la licence**
   - Clic sur "Importer une licence"
   - Sélection du fichier .lic
   - L'application s'active

### Commandes CLI

#### Initialisation
```bash
posplus-license init [--force]
```

#### Générer une licence
```bash
posplus-license generate \
  --hwid <hardware_id> \
  --client "<nom>" \
  --type <DEMO|BASIC|PRO|ENTERPRISE> \
  [--expires YYYY-MM-DD] \
  [--output <path>] \
  [--max-users <n>] \
  [--notes "<texte>"]
```

#### Vérifier une licence
```bash
posplus-license verify <fichier.lic> [--hwid <id>] [--verbose]
```

#### Lister les licences
```bash
posplus-license list [--client <nom>] [--type <type>] [--active] [--revoked] [--stats]
```

#### Révoquer une licence
```bash
posplus-license revoke <license_id> [--reason "<texte>"] [--force]
```

#### Afficher la clé publique
```bash
posplus-license show-key
```

#### Exporter la blacklist
```bash
posplus-license export-blacklist [--output <path>]
```

---

## Activation côté client

### Page d'activation automatique

Quand l'application démarre sans licence valide, elle affiche automatiquement la page d'activation qui:

1. Affiche le Hardware ID de la machine
2. Permet de copier l'ID pour l'envoyer au fournisseur
3. Permet d'importer un fichier .lic

### Processus d'import

1. L'utilisateur clique sur "Importer une licence"
2. Un dialogue de sélection de fichier s'ouvre
3. Le fichier est validé:
   - Vérification de la signature RSA
   - Vérification du Hardware ID
   - Vérification de la date d'expiration
4. Si valide, la licence est copiée dans un emplacement sécurisé
5. L'application redirige vers l'écran de login

---

## Sécurité

### Protection Hardware ID

Le Hardware ID est généré à partir de:
- Machine UUID (BIOS/EFI)
- CPU ID / Serial
- Disk Serial Number
- MAC Address principale

Ces informations sont combinées et hashées (SHA-256) pour produire un identifiant stable et unique.

### Protection du fichier licence

- Stocké dans un dossier caché: `{userData}/.license/.lic.dat`
- Hash d'intégrité: `{userData}/.license/.integrity`
- Le hash inclut le Hardware ID, empêchant la copie

### Protection de la base de données

Le module `databaseProtection` fournit:

```typescript
import { databaseProtection } from './services/license';

// Chiffrer des données sensibles
const encrypted = databaseProtection.encryptString("donnée secrète");

// Déchiffrer
const decrypted = databaseProtection.decryptString(encrypted);

// Chiffrer un backup
databaseProtection.encryptBackupFile(sourcePath, destPath);

// Vérifier le binding matériel
if (databaseProtection.verifyDatabaseBinding()) {
  // Base de données liée à cette machine
}
```

### Révocation de licences

1. Révoquez via CLI: `posplus-license revoke <id>`
2. Exportez la blacklist: `posplus-license export-blacklist`
3. Distribuez le fichier `blacklist.json` aux applications
4. Copiez dans `{userData}/.license/.blacklist.json`

### Bonnes pratiques

- **Ne JAMAIS** partager `private.pem`
- **Ne JAMAIS** inclure l'outil CLI dans les builds distribués
- Garder des backups sécurisés des clés
- Utiliser des dates d'expiration raisonnables
- Documenter chaque licence générée

---

## Dépannage

### Erreur: "Hardware ID mismatch"

**Cause**: La licence est générée pour une autre machine.

**Solution**:
1. Demander au client son Hardware ID actuel
2. Générer une nouvelle licence pour cet ID

### Erreur: "Signature invalide"

**Cause**: Le fichier a été modifié ou la clé publique ne correspond pas.

**Solution**:
1. Vérifier que la clé publique dans l'app correspond à la clé privée utilisée
2. Régénérer la licence

### Erreur: "Licence expirée"

**Cause**: La date d'expiration est dépassée.

**Solution**: Générer une nouvelle licence avec une date future.

### Le Hardware ID a changé

**Cause possible**:
- Changement de carte réseau
- Changement de disque dur
- Modification du BIOS

**Solution**: Générer une nouvelle licence avec le nouveau Hardware ID.

---

## API Reference

### licenseValidator

```typescript
import {
  validateLicense,
  importLicense,
  removeLicense,
  getLicenseInfo,
  hasFeature,
  refreshLicense,
  getDatabaseEncryptionKey,
} from './services/license';

// Valider la licence actuelle
const result = validateLicense();
// { valid: true, status: 'valid', licenseType: 'PRO', ... }

// Importer une licence
const importResult = importLicense('/path/to/license.lic');

// Récupérer les infos pour l'UI
const info = getLicenseInfo();

// Vérifier une fonctionnalité
if (hasFeature('p2p_sync')) {
  // Activer P2P
}

// Obtenir la clé de chiffrement DB
const dbKey = getDatabaseEncryptionKey();
```

### hardwareId

```typescript
import {
  getHardwareId,
  getHardwareInfo,
  refreshHardwareId,
  verifyHardwareId,
} from './services/license';

// Obtenir le Hardware ID
const hwid = getHardwareId();

// Obtenir les détails matériels
const info = getHardwareInfo();
// { hardwareId, machineUUID, cpuId, diskSerial, macAddress, platform, hostname }

// Forcer le recalcul
const newHwid = refreshHardwareId();

// Vérifier un ID
const matches = verifyHardwareId("expected_hwid");
```

### LicenseStore (React)

```typescript
import { useLicenseStore } from './store/licenseStore';

const {
  licenseInfo,
  hardwareInfo,
  isLoading,
  error,
  isChecked,
  isLicensed,
  checkLicense,
  getHardwareInfo,
  importLicense,
  removeLicense,
  clearError,
} = useLicenseStore();
```

### Types de licence

| Type | Durée | Fonctionnalités |
|------|-------|-----------------|
| DEMO | 30 jours | basic_pos, max_100_products, max_1_user, watermark |
| BASIC | 1 an | basic_pos, products_unlimited, max_3_users, thermal_printing, basic_reports |
| PRO | 1 an | Tout BASIC + customer_display, stock_management, backup_restore, csv_import_export |
| ENTERPRISE | 1 an | Tout PRO + p2p_sync, multi_store, api_access, priority_support |

---

## Exemple de fichier .lic

```json
{
  "client": "Restaurant ABC",
  "licenseType": "PRO",
  "hardwareId": "a1b2c3d4e5f6789...64 caractères hex...",
  "expires": "2026-01-01",
  "version": "1.0",
  "issuedAt": "2024-01-15T10:30:00.000Z",
  "features": [
    "basic_pos",
    "products_unlimited",
    "users_unlimited",
    "thermal_printing",
    "advanced_reports",
    "customer_display",
    "stock_management",
    "backup_restore",
    "csv_import_export"
  ],
  "signature": "BASE64_RSA_SIGNATURE..."
}
```

---

## Support

Pour toute question technique sur le système de licensing, consultez les logs de l'application:
- Windows: `%AppData%/posplus/logs/`
- macOS: `~/Library/Logs/posplus/`
- Linux: `~/.config/posplus/logs/`
