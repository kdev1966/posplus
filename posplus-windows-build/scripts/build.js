#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 Starting build process...\n')

// Clean dist folder
console.log('🧹 Cleaning dist folder...')
const distPath = path.join(__dirname, '../dist')
if (fs.existsSync(distPath)) {
  fs.rmSync(distPath, { recursive: true, force: true })
}
console.log('✅ Dist folder cleaned\n')

// Build renderer (React)
console.log('🎨 Building renderer (React + Vite)...')
try {
  execSync('npm run build:vite', { stdio: 'inherit' })
  console.log('✅ Renderer built successfully\n')
} catch (error) {
  console.error('❌ Renderer build failed')
  process.exit(1)
}

// Build electron (TypeScript)
console.log('⚡ Building electron (TypeScript)...')
try {
  execSync('npm run build:electron', { stdio: 'inherit' })
  console.log('✅ Electron built successfully\n')
} catch (error) {
  console.error('❌ Electron build failed')
  process.exit(1)
}

console.log('✨ Build completed successfully!')
console.log('\nNext steps:')
console.log('  - Run "npm run package" to create distributable packages')
console.log('  - Run "npm run package:win" for Windows installer')
console.log('  - Run "npm run package:mac" for macOS DMG')
console.log('  - Run "npm run package:linux" for Linux AppImage/deb')
