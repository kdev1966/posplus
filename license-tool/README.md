# POSPlus License Tool

Outil CLI pour la génération et la gestion des licences POSPlus.

## Installation

```bash
npm install
npm run build
```

## Utilisation rapide

### 1. Initialisation (première fois)

```bash
node dist/index.js init
```

Cela génère les clés RSA nécessaires.

### 2. Copier la clé publique

Après l'initialisation, copiez le contenu de `keys/public.pem` dans le fichier `src/main-process/services/license/licenseValidator.ts` de POSPlus.

### 3. Générer une licence

```bash
node dist/index.js generate \
  --hwid "HARDWARE_ID_DU_CLIENT" \
  --client "Nom du Client" \
  --type PRO \
  --expires 2026-01-01
```

### 4. Vérifier une licence

```bash
node dist/index.js verify license.lic --verbose
```

### 5. Lister les licences

```bash
node dist/index.js list --active
```

### 6. Révoquer une licence

```bash
node dist/index.js revoke LICENSE_ID --reason "Raison"
```

## Commandes

| Commande | Description |
|----------|-------------|
| `init` | Initialise les clés RSA |
| `generate` | Génère une nouvelle licence |
| `verify` | Vérifie un fichier de licence |
| `list` | Liste les licences générées |
| `revoke` | Révoque une licence |
| `show-key` | Affiche la clé publique |
| `export-blacklist` | Exporte la liste noire |

## Types de licences

- **DEMO**: 30 jours, fonctionnalités limitées
- **BASIC**: 1 an, fonctionnalités de base
- **PRO**: 1 an, toutes les fonctionnalités sauf P2P
- **ENTERPRISE**: 1 an, toutes les fonctionnalités

## Sécurité

⚠️ **IMPORTANT**:

- **JAMAIS** partager `keys/private.pem`
- **JAMAIS** inclure cet outil dans les builds distribués
- Garder des backups sécurisés du dossier `keys/`
- Garder des backups du fichier `data/licenses.json`

## Structure

```
license-tool/
├── bin/              # Exécutable CLI
├── src/              # Code source TypeScript
├── dist/             # Build JavaScript
├── keys/             # Clés RSA (CONFIDENTIEL)
├── data/             # Données des licences
└── examples/         # Exemples
```
