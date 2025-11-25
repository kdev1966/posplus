#!/usr/bin/env node

/**
 * Génère une icône moderne et créative pour POS+
 * Design: Terminal POS stylisé avec gradient cyan->bleu->violet
 */

const fs = require('fs');
const path = require('path');

// Icône SVG moderne avec un terminal POS stylisé
const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradient radial pour le fond -->
    <radialGradient id="bgGradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#22D3EE;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#3B82F6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8B5CF6;stop-opacity:1" />
    </radialGradient>

    <!-- Gradient pour l'effet de brillance -->
    <linearGradient id="shineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:0.3" />
      <stop offset="30%" style="stop-color:#FFFFFF;stop-opacity:0" />
    </linearGradient>

    <!-- Gradient pour l'écran -->
    <linearGradient id="screenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1E293B;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#334155;stop-opacity:1" />
    </linearGradient>

    <!-- Ombre portée -->
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="8"/>
      <feOffset dx="0" dy="4" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.3"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Fond circulaire avec gradient -->
  <circle cx="512" cy="512" r="460" fill="url(#bgGradient)"/>

  <!-- Effet de brillance en haut -->
  <circle cx="512" cy="512" r="460" fill="url(#shineGradient)"/>

  <!-- Groupe du terminal POS (avec ombre) -->
  <g filter="url(#shadow)">
    <!-- Corps du terminal -->
    <rect x="337" y="287" width="350" height="450" rx="35" fill="#FFFFFF" fill-opacity="0.95"/>

    <!-- Écran du terminal -->
    <rect x="367" y="327" width="290" height="180" rx="15" fill="url(#screenGradient)"/>

    <!-- Reflet sur l'écran -->
    <rect x="367" y="327" width="290" height="60" rx="15" fill="#FFFFFF" fill-opacity="0.1"/>

    <!-- Symbole "+" moderne au centre -->
    <g transform="translate(512, 600)">
      <!-- Barre horizontale -->
      <rect x="-80" y="-20" width="160" height="40" rx="20" fill="#3B82F6"/>
      <!-- Barre verticale -->
      <rect x="-20" y="-80" width="40" height="160" rx="20" fill="#3B82F6"/>

      <!-- Effet de brillance sur le + -->
      <rect x="-80" y="-20" width="160" height="15" rx="20" fill="#FFFFFF" fill-opacity="0.3"/>
      <rect x="-20" y="-80" width="40" height="60" rx="20" fill="#FFFFFF" fill-opacity="0.3"/>
    </g>

    <!-- 3 boutons en bas du terminal -->
    <circle cx="412" cy="697" r="12" fill="#E5E7EB"/>
    <circle cx="512" cy="697" r="12" fill="#E5E7EB"/>
    <circle cx="612" cy="697" r="12" fill="#E5E7EB"/>

    <!-- Petit détail: fente pour carte en haut -->
    <rect x="437" y="277" width="150" height="8" rx="4" fill="#334155" fill-opacity="0.3"/>
  </g>

  <!-- Petit badge "POS" discret en bas -->
  <g transform="translate(512, 880)">
    <rect x="-60" y="-20" width="120" height="40" rx="20" fill="#1F2937" fill-opacity="0.6"/>
    <text x="0" y="8" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#FFFFFF">POS+</text>
  </g>
</svg>`;

const buildDir = path.join(__dirname, '..', 'build');
const iconsDir = path.join(buildDir, 'icons');

// Créer les répertoires si nécessaires
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Sauvegarder le SVG
const svgPath = path.join(buildDir, 'icon.svg');
fs.writeFileSync(svgPath, svgIcon);
console.log(`✓ Icône SVG créée: ${svgPath}`);

console.log(`
╔═══════════════════════════════════════════════════════════╗
║         Icône Moderne POS+ Générée avec Succès!          ║
╚═══════════════════════════════════════════════════════════╝

📝 Fichier créé: build/icon.svg

🎨 Design:
   • Terminal POS moderne et stylisé
   • Gradient radial cyan → bleu → violet
   • Symbole "+" élégant au centre
   • Effets de brillance et ombres portées

📦 Pour générer les formats .ico et .icns:

Option 1 - Utiliser electron-icon-builder (Recommandé):
   npm install -g electron-icon-builder
   electron-icon-builder --input=build/icon.svg --output=build --flatten

Option 2 - Conversion en ligne:
   1. Aller sur https://cloudconvert.com/svg-to-ico
   2. Uploader build/icon.svg
   3. Télécharger et placer dans build/

Option 3 - ImageMagick (si installé):
   brew install imagemagick  # sur macOS
   convert build/icon.svg -define icon:auto-resize=256,128,64,48,32,16 build/icon.ico
   convert build/icon.svg -resize 1024x1024 build/icon.icns

🚀 L'icône sera automatiquement utilisée lors du build:
   npm run build:mac
   npm run build:win

`);
