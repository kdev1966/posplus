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
  let modified = content

  // Fix relative electron imports
  const relativeRegex = /require\(["'](\.\.\/)+(electron)["']\)/g
  modified = modified.replace(relativeRegex, 'require("electron")')

  // Fix esModuleInterop issue: replace electron_1.default with direct require
  // Pattern: const electron_1 = __importDefault(require("electron"));
  // followed by: const { app, BrowserWindow } = electron_1.default;
  // Replace the destructuring to use direct require
  if (modified.includes('electron_1.default')) {
    // Replace destructuring from electron_1.default with direct require
    modified = modified.replace(
      /const\s*\{\s*([\w\s,]+)\s*\}\s*=\s*electron_1\.default;?/g,
      'const { $1 } = require("electron");'
    )
    // Remove the __importDefault line for electron if it exists
    modified = modified.replace(
      /const\s+electron_1\s*=\s*__importDefault\(require\("electron"\)\);?\n?/g,
      ''
    )
  }

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
