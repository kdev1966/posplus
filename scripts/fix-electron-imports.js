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
  // Replace with two-line approach for better CommonJS compatibility
  if (modified.includes('electron_1.default')) {
    // Replace destructuring from electron_1.default with two-line approach
    modified = modified.replace(
      /const\s*\{\s*([\w\s,]+)\s*\}\s*=\s*electron_1\.default;?/g,
      'const electron = require("electron");\nconst { $1 } = electron;'
    )
    // Remove the __importDefault line for electron if it exists
    modified = modified.replace(
      /const\s+electron_1\s*=\s*__importDefault\(require\("electron"\)\);?\n?/g,
      ''
    )
  }

  // Fix namespace import: const electron_1 = require("electron");
  // Replace with two-line approach for better CommonJS compatibility
  // This handles files like main.js that use electron_1.app, electron_1.BrowserWindow, etc.
  if (modified.includes('const electron_1 = require("electron")')) {
    // Find all electron_1.XXXX usages in the file
    const electronUsages = [...modified.matchAll(/electron_1\.(\w+)/g)]
    const uniqueExports = [...new Set(electronUsages.map(m => m[1]))]

    if (uniqueExports.length > 0) {
      // Replace the import line with two-line approach
      modified = modified.replace(
        /const electron_1 = require\("electron"\);?/,
        `const electron = require("electron");\nconst { ${uniqueExports.join(', ')} } = electron;`
      )

      // Replace all electron_1.XXXX with just XXXX
      uniqueExports.forEach(exportName => {
        const regex = new RegExp(`electron_1\\.${exportName}`, 'g')
        modified = modified.replace(regex, exportName)
      })
    }
  }

  // Fix shared types import in preload (must use correct relative path)
  // preload.js is in dist/main/main-process/preload.js
  // shared types is in dist/main/shared/types/index.js
  // From main-process/ we need ../shared/types/index
  if (filePath.includes('preload.js')) {
    // Fix import to use explicit index.js
    modified = modified.replace(
      /require\(["']\.\.\/shared\/types["']\)/g,
      'require("../shared/types/index")'
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
