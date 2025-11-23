#!/usr/bin/env node

/**
 * Script de migration pour mettre à jour les SKU des produits existants
 * selon la nouvelle méthode d'auto-génération: SKU-YYYYMMDD-XXXXX
 *
 * Usage: node scripts/update-product-skus.js [--dry-run]
 */

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')
const os = require('os')

// Options
const isDryRun = process.argv.includes('--dry-run')

// Trouve le chemin de la base de données
function getDatabasePath() {
  const homeDir = os.homedir()

  // Chemins possibles selon la plateforme
  const possiblePaths = [
    // macOS
    path.join(homeDir, 'Library/Application Support/posplus/posplus.db'),
    path.join(homeDir, 'Library/Application Support/POSPlus/posplus.db'),
    path.join(homeDir, 'Library/Application Support/Electron/posplus.db'),
    // Windows
    path.join(homeDir, 'AppData/Roaming/posplus/posplus.db'),
    path.join(homeDir, 'AppData/Roaming/POSPlus/posplus.db'),
    // Linux
    path.join(homeDir, '.config/posplus/posplus.db'),
    path.join(homeDir, '.config/POSPlus/posplus.db'),
    // Développement local
    path.join(__dirname, '../posplus.db'),
    path.join(__dirname, '../pos.db'),
  ]

  console.log('🔍 Recherche de la base de données...\n')

  for (const dbPath of possiblePaths) {
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath)
      console.log(`   Trouvé: ${dbPath} (${stats.size} bytes)`)
      if (stats.size > 0) {
        return dbPath
      }
    }
  }

  console.error('\n❌ Aucune base de données trouvée dans les emplacements suivants:')
  possiblePaths.forEach(p => console.error(`   - ${p}`))
  throw new Error('\nBase de données introuvable. Assurez-vous que l\'application a été lancée au moins une fois et qu\'elle contient des produits.')
}

// Génère un SKU au format SKU-YYYYMMDD-XXXXX
function generateSKU(date, sequence) {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const seqStr = sequence.toString().padStart(5, '0')
  return `SKU-${dateStr}-${seqStr}`
}

// Extrait la date d'un timestamp ou utilise la date actuelle
function parseDate(timestamp) {
  if (timestamp) {
    return new Date(timestamp)
  }
  return new Date()
}

async function updateProductSKUs() {
  try {
    const dbPath = getDatabasePath()
    console.log(`📂 Base de données: ${dbPath}`)

    if (isDryRun) {
      console.log('🔍 Mode DRY RUN - Aucune modification ne sera effectuée\n')
    } else {
      console.log('⚠️  Mode PRODUCTION - Les SKU vont être modifiés\n')
    }

    // Ouvrir la base de données
    const db = new Database(dbPath)

    // Récupérer tous les produits avec leurs dates de création
    const products = db.prepare(`
      SELECT id, sku, name, created_at
      FROM products
      ORDER BY created_at, id
    `).all()

    if (products.length === 0) {
      console.log('ℹ️  Aucun produit trouvé dans la base de données')
      db.close()
      return
    }

    console.log(`📦 ${products.length} produits trouvés\n`)

    // Grouper les produits par date de création
    const productsByDate = new Map()

    for (const product of products) {
      const date = parseDate(product.created_at)
      const dateKey = date.toISOString().slice(0, 10) // YYYY-MM-DD

      if (!productsByDate.has(dateKey)) {
        productsByDate.set(dateKey, [])
      }
      productsByDate.get(dateKey).push(product)
    }

    // Préparer la requête de mise à jour
    const updateStmt = db.prepare('UPDATE products SET sku = ? WHERE id = ?')

    let updatedCount = 0
    let skippedCount = 0

    // Mettre à jour les SKU par date
    for (const [dateKey, dateProducts] of productsByDate.entries()) {
      const date = new Date(dateKey)
      console.log(`\n📅 Date: ${dateKey} (${dateProducts.length} produits)`)

      dateProducts.forEach((product, index) => {
        const sequence = index + 1
        const newSKU = generateSKU(date, sequence)

        // Vérifier si le SKU existe déjà au bon format
        const skuPattern = /^SKU-\d{8}-\d{5}$/
        if (product.sku && skuPattern.test(product.sku)) {
          console.log(`  ⏭️  #${product.id} ${product.name}: SKU déjà au bon format (${product.sku})`)
          skippedCount++
        } else {
          const oldSKU = product.sku || '(vide)'
          console.log(`  ✏️  #${product.id} ${product.name}: ${oldSKU} → ${newSKU}`)

          if (!isDryRun) {
            updateStmt.run(newSKU, product.id)
          }
          updatedCount++
        }
      })
    }

    db.close()

    // Résumé
    console.log('\n' + '='.repeat(60))
    console.log(`✅ Résumé:`)
    console.log(`   - Produits analysés: ${products.length}`)
    console.log(`   - SKU mis à jour: ${updatedCount}`)
    console.log(`   - SKU déjà corrects: ${skippedCount}`)

    if (isDryRun) {
      console.log('\n⚠️  Mode DRY RUN - Aucune modification effectuée')
      console.log('   Pour appliquer les changements, lancez: node scripts/update-product-skus.js')
    } else {
      console.log('\n✅ Migration terminée avec succès!')
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message)
    process.exit(1)
  }
}

// Exécuter la migration
updateProductSKUs()
