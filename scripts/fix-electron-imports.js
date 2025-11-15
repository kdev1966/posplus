#!/usr/bin/env node

/**
 * Cross-platform script to fix electron imports in compiled files
 * Replaces relative electron imports with direct 'electron' imports
 */

const fs = require('fs')
const path = require('path')

function walkSync(dir, callback) {
  const files = fs.readdirSync(dir)
  files.forEach((file) => {
    const filepath = path.join(dir, file)
    const stats = fs.statSync(filepath)
    if (stats.isDirectory()) {
      walkSync(filepath, callback)
    } else if (stats.isFile() && filepath.endsWith('.js')) {
      callback(filepath)
    }
  })
}

function fixElectronImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  const regex = /require\(["'](\.\.\/)+(electron)["']\)/g
  const modified = content.replace(regex, 'require("electron")')

  if (content !== modified) {
    fs.writeFileSync(filePath, modified, 'utf8')
    console.log(`Fixed imports in: ${filePath}`)
  }
}

// Main execution
const distPath = path.join(__dirname, '..', 'dist', 'main')

if (!fs.existsSync(distPath)) {
  console.error(`Error: dist/main directory not found at ${distPath}`)
  process.exit(1)
}

console.log('Fixing electron imports in compiled files...')
walkSync(distPath, fixElectronImports)
console.log('Done!')
