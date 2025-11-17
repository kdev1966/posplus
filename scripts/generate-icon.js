#!/usr/bin/env node

/**
 * Generate placeholder icon for POSPlus
 * Creates a simple PNG icon that can be converted to .ico
 */

const fs = require('fs')
const path = require('path')

// Create a simple SVG icon (will be converted to PNG)
const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1024" height="1024" rx="200" fill="#3B82F6"/>

  <!-- POS Text -->
  <text x="512" y="420" font-family="Arial, sans-serif" font-size="280" font-weight="bold" text-anchor="middle" fill="white">POS</text>

  <!-- Plus symbol -->
  <rect x="432" y="520" width="160" height="40" rx="20" fill="white"/>
  <rect x="492" y="460" width="40" height="160" rx="20" fill="white"/>

  <!-- Decorative line -->
  <rect x="200" y="720" width="624" height="8" rx="4" fill="rgba(255,255,255,0.5)"/>
</svg>`

const buildDir = path.join(__dirname, '..', 'build')

// Ensure build directory exists
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true })
}

// Save SVG
const svgPath = path.join(buildDir, 'icon.svg')
fs.writeFileSync(svgPath, svgIcon)
console.log(`Created SVG icon: ${svgPath}`)

console.log(`
Icon placeholder created!

To convert to required formats:

Option 1 - Online converter:
1. Go to https://cloudconvert.com/svg-to-ico
2. Upload build/icon.svg
3. Download icon.ico and place in build/

Option 2 - Install ImageMagick:
brew install imagemagick
convert build/icon.svg -define icon:auto-resize=256,128,64,48,32,16 build/icon.ico

Option 3 - Use electron-icon-builder:
npx electron-icon-builder --input=build/icon.svg --output=build --flatten

For now, electron-builder might use a default icon.
`)
