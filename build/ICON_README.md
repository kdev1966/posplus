# Icône POS+ - Design Moderne

## 🎨 Design

L'icône POS+ présente un design moderne et professionnel avec :

- **Terminal POS stylisé** : Représentation élégante d'un terminal de point de vente
- **Gradient radial** : Dégradé cyan → bleu → violet pour un aspect moderne
- **Symbole "+"** : Élément central symbolisant l'aspect "Plus" de l'application
- **Effets visuels** : Brillances, ombres portées et reflets pour la profondeur
- **Design flat moderne** : Style contemporain adapté aux applications professionnelles

## 📁 Structure des fichiers

```
build/
├── icon.svg          # Source SVG (éditable)
├── icon.png          # PNG haute résolution (1024x1024)
├── icon.ico          # Icône Windows (multi-résolutions)
├── icon.icns         # Icône macOS (multi-résolutions)
└── icons/
    ├── 16x16.png     # Petite taille (barre d'état)
    ├── 24x24.png     # Petite taille
    ├── 32x32.png     # Icône standard
    ├── 48x48.png     # Icône moyenne
    ├── 64x64.png     # Icône moyenne
    ├── 128x128.png   # Grande icône
    ├── 256x256.png   # Très grande icône
    ├── 512x512.png   # Haute résolution
    ├── 1024x1024.png # Très haute résolution
    ├── icon.ico      # Windows
    └── icon.icns     # macOS
```

## 🔄 Régénération de l'icône

Pour régénérer l'icône complète (SVG + tous les formats) :

```bash
npm run generate:icon
```

Cette commande :
1. Génère le fichier SVG source
2. Convertit en PNG haute résolution
3. Crée toutes les tailles nécessaires (16px à 1024px)
4. Génère les formats .ico (Windows) et .icns (macOS)

## ✏️ Modification du design

Pour modifier l'icône :

1. Éditez le fichier `scripts/generate-modern-icon.js`
2. Modifiez le code SVG dans la variable `svgIcon`
3. Exécutez `npm run generate:icon`

Ou utilisez un éditeur SVG comme :
- Figma
- Adobe Illustrator
- Inkscape (gratuit)

Puis exportez en SVG et remplacez `build/icon.svg`.

## 🎨 Palette de couleurs

Les couleurs utilisées dans le design :

| Couleur | Hex     | Usage                    |
|---------|---------|--------------------------|
| Cyan    | #22D3EE | Début du gradient        |
| Bleu    | #3B82F6 | Centre du gradient       |
| Violet  | #8B5CF6 | Fin du gradient          |
| Blanc   | #FFFFFF | Terminal et détails      |
| Gris    | #1E293B | Écran du terminal        |

## 🚀 Utilisation lors du build

Les icônes sont automatiquement utilisées par Electron Builder lors de la création des packages :

```bash
# Build macOS
npm run package:mac

# Build Windows
npm run package:win

# Build Linux
npm run package:linux
```

Electron Builder utilise automatiquement :
- `build/icon.icns` pour macOS
- `build/icon.ico` pour Windows
- `build/icons/*.png` pour Linux

## 📝 Notes techniques

- **Format source** : SVG (vectoriel, éditable, mise à l'échelle parfaite)
- **Résolution PNG** : 1024x1024 (recommandé pour les exports)
- **Formats multi-plateformes** : .ico (Windows), .icns (macOS), .png (Linux)
- **Outil de conversion** : ImageMagick 7+
- **Génération automatique** : Script Node.js custom

## 🛠️ Dépendances

Pour régénérer les icônes, vous aurez besoin de :

- **Node.js** : Pour exécuter le script de génération
- **ImageMagick 7+** : Pour la conversion SVG → PNG/ICO/ICNS

Installation de ImageMagick :

```bash
# macOS
brew install imagemagick

# Ubuntu/Debian
sudo apt-get install imagemagick

# Windows
choco install imagemagick
```

## 📖 Ressources

- [Electron Builder - Icons](https://www.electron.build/icons)
- [ImageMagick Documentation](https://imagemagick.org/)
- [SVG Specification](https://www.w3.org/TR/SVG/)
