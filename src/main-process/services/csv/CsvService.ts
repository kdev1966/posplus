import { dialog } from 'electron'
import fs from 'fs'
import log from 'electron-log'
import { parse } from 'csv-parse/sync'
import { stringify } from 'csv-stringify/sync'
import CategoryRepository from '../database/repositories/CategoryRepository'
import ProductRepository from '../database/repositories/ProductRepository'

class CsvService {
  /**
   * Generate and download CSV template for categories and products
   */
  async generateTemplate(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      // Open save dialog to choose directory
      const result = await dialog.showSaveDialog({
        title: 'Télécharger les modèles CSV',
        defaultPath: 'modeles_import',
        properties: ['createDirectory'],
        buttonLabel: 'Choisir le dossier'
      })

      if (result.canceled || !result.filePath) {
        log.info('Template download canceled by user')
        return { success: false, error: 'Template download canceled' }
      }

      const baseDir = result.filePath

      // Create directory if it doesn't exist
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true })
      }

      // Categories template
      const categoriesData = [
        ['Nom', 'Description', 'Ordre_Affichage', 'Actif'],
        ['Boissons', 'Boissons chaudes et froides', '10', 'OUI'],
        ['Snacks', 'Collations et encas', '20', 'OUI'],
        ['Plats', 'Plats principaux', '30', 'OUI'],
        ['Desserts', 'Desserts et pâtisseries', '40', 'OUI'],
      ]

      const categoriesCsv = stringify(categoriesData, {
        bom: true, // Add BOM for Excel compatibility
        quoted: true
      })

      const categoriesPath = `${baseDir}/categories.csv`
      fs.writeFileSync(categoriesPath, categoriesCsv, 'utf8')

      // Products template
      const productsData = [
        ['Nom', 'Code_Barres', 'Categorie', 'Prix', 'Cout', 'Stock', 'Stock_Min', 'Actif'],
        ['Café Espresso', '1234567890001', 'Boissons', '2.50', '0.50', '100', '20', 'OUI'],
        ['Croissant', '1234567890002', 'Snacks', '1.80', '0.60', '50', '10', 'OUI'],
        ['Pizza Margherita', '1234567890003', 'Plats', '12.00', '5.00', '30', '5', 'OUI'],
        ['Tarte aux pommes', '1234567890004', 'Desserts', '4.50', '1.50', '20', '5', 'OUI'],
      ]

      const productsCsv = stringify(productsData, {
        bom: true,
        quoted: true
      })

      const productsPath = `${baseDir}/produits.csv`
      fs.writeFileSync(productsPath, productsCsv, 'utf8')

      // Instructions file
      const instructions = `INSTRUCTIONS POUR L'IMPORT DE DONNÉES
=====================================

FICHIERS:
- categories.csv : Liste des catégories de produits
- produits.csv : Liste des produits

CATÉGORIES (categories.csv):
----------------------------
Colonnes obligatoires:
- Nom : Nom de la catégorie
- Ordre_Affichage : Nombre pour l'ordre d'affichage (1, 10, 20, etc.)
- Actif : OUI ou NON

Colonnes optionnelles:
- Description : Description de la catégorie

PRODUITS (produits.csv):
-----------------------
Colonnes obligatoires:
- Nom : Nom du produit
- Code_Barres : Code-barres unique
- Categorie : Nom exact de la catégorie (doit exister dans categories.csv)
- Prix : Prix de vente
- Stock : Quantité en stock
- Actif : OUI ou NON

Colonnes optionnelles:
- Cout : Coût d'achat
- Stock_Min : Stock minimum pour alerte

NOTES IMPORTANTES:
-----------------
1. Ne modifiez pas les noms des colonnes
2. Utilisez OUI ou NON pour les champs Actif
3. Importez d'abord les catégories, puis les produits
4. Le code-barres doit être unique pour chaque produit
5. L'ordre d'affichage détermine l'ordre dans le point de vente
6. Les fichiers doivent être encodés en UTF-8
7. Vous pouvez éditer ces fichiers avec Excel, LibreOffice ou tout éditeur de texte

EXEMPLE D'UTILISATION:
--------------------
1. Remplissez d'abord categories.csv avec vos catégories
2. Puis remplissez produits.csv avec vos produits
3. Dans l'application, allez dans Paramètres > Import/Export
4. Cliquez sur "Importer depuis CSV"
5. Sélectionnez le dossier contenant les fichiers

MISE À JOUR:
----------
Si vous importez des catégories ou produits qui existent déjà:
- Pour les catégories: mise à jour basée sur le nom
- Pour les produits: mise à jour basée sur le code-barres
`

      const instructionsPath = `${baseDir}/LISEZMOI.txt`
      fs.writeFileSync(instructionsPath, instructions, 'utf8')

      log.info(`Templates generated successfully in: ${baseDir}`)
      return { success: true, filePath: baseDir }
    } catch (error) {
      log.error('Failed to generate templates:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Export current categories and products to CSV
   */
  async exportData(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      // Get all categories and products
      const categories = CategoryRepository.findAll()
      const products = ProductRepository.findAll()

      // Open save dialog
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '')
      const result = await dialog.showSaveDialog({
        title: 'Exporter les données',
        defaultPath: `export_posplus_${timestamp}`,
        properties: ['createDirectory'],
        buttonLabel: 'Exporter'
      })

      if (result.canceled || !result.filePath) {
        log.info('Export canceled by user')
        return { success: false, error: 'Export canceled' }
      }

      const exportDir = result.filePath

      // Create directory if it doesn't exist
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true })
      }

      // Export categories
      const categoriesData = [
        ['Nom', 'Description', 'Ordre_Affichage', 'Actif']
      ]

      categories.forEach(cat => {
        categoriesData.push([
          cat.name,
          cat.description || '',
          String(cat.displayOrder),
          cat.isActive ? 'OUI' : 'NON'
        ])
      })

      const categoriesCsv = stringify(categoriesData, {
        bom: true,
        quoted: true
      })

      fs.writeFileSync(`${exportDir}/categories.csv`, categoriesCsv, 'utf8')

      // Export products - need to map category ID to name
      const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]))

      const productsData = [
        ['Nom', 'Code_Barres', 'Categorie', 'Prix', 'Cout', 'Stock', 'Stock_Min', 'Actif']
      ]

      products.forEach(prod => {
        productsData.push([
          prod.name,
          prod.barcode || '',
          categoryMap.get(prod.categoryId) || '',
          String(prod.price),
          String(prod.cost || 0),
          String(prod.stock),
          String(prod.minStock || 0),
          prod.isActive ? 'OUI' : 'NON'
        ])
      })

      const productsCsv = stringify(productsData, {
        bom: true,
        quoted: true
      })

      fs.writeFileSync(`${exportDir}/produits.csv`, productsCsv, 'utf8')

      log.info(`Data exported successfully to: ${exportDir}`)
      return { success: true, filePath: exportDir }
    } catch (error) {
      log.error('Failed to export data:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Import categories and products from CSV files
   */
  async importData(): Promise<{
    success: boolean
    categoriesImported?: number
    productsImported?: number
    errors?: string[]
    error?: string
  }> {
    try {
      // Open folder dialog
      const result = await dialog.showOpenDialog({
        title: 'Sélectionner le dossier contenant les fichiers CSV',
        properties: ['openDirectory']
      })

      if (result.canceled || result.filePaths.length === 0) {
        log.info('Import canceled by user')
        return { success: false, error: 'Import canceled' }
      }

      const importDir = result.filePaths[0]
      const categoriesPath = `${importDir}/categories.csv`
      const productsPath = `${importDir}/produits.csv`

      const errors: string[] = []
      let categoriesImported = 0
      let productsImported = 0

      // Import Categories first
      if (fs.existsSync(categoriesPath)) {
        try {
          const categoriesContent = fs.readFileSync(categoriesPath, 'utf8')

          // Debug logging
          log.info('Categories CSV content preview:', categoriesContent.substring(0, 200))
          log.info('Categories CSV first 100 bytes (hex):', Buffer.from(categoriesContent.substring(0, 100)).toString('hex'))

          const records = parse(categoriesContent, {
            columns: true,
            skip_empty_lines: true,
            bom: true,
            trim: true,
            relaxColumnCount: true, // Allow inconsistent column counts
            skipRecordsWithError: true // Skip problematic records instead of failing
          })

          // Debug: log first record structure
          log.info('Total category records parsed:', records.length)
          if (records.length > 0) {
            log.info('First category record columns:', Object.keys(records[0] as any))
            log.info('First category record:', JSON.stringify(records[0], null, 2))
          }

          for (let i = 0; i < records.length; i++) {
            const row = records[i] as any

            try {
              const name = String(row.Nom || '').trim()
              const description = String(row.Description || '').trim()
              const displayOrder = Number(row.Ordre_Affichage) || 0
              const isActive = String(row.Actif || '').toUpperCase() === 'OUI'

              // Validation
              if (!name) {
                errors.push(`Ligne ${i + 2} (Catégories): Nom manquant`)
                continue
              }

              if (displayOrder <= 0) {
                errors.push(`Ligne ${i + 2} (Catégories): Ordre d'affichage invalide`)
                continue
              }

              // Check if category already exists
              const existing = CategoryRepository.findAll().find(
                cat => cat.name.toLowerCase() === name.toLowerCase()
              )

              if (existing) {
                // Update existing category
                CategoryRepository.update({
                  id: existing.id,
                  name,
                  description: description || undefined,
                  displayOrder,
                  isActive
                })
              } else {
                // Create new category
                CategoryRepository.create({
                  name,
                  description: description || undefined,
                  displayOrder,
                  isActive
                })
              }

              categoriesImported++
            } catch (error) {
              errors.push(`Ligne ${i + 2} (Catégories): ${String(error)}`)
            }
          }

          log.info(`Categories imported: ${categoriesImported}`)
        } catch (error) {
          errors.push(`Erreur lecture categories.csv: ${String(error)}`)
        }
      } else {
        log.warn(`Categories file not found: ${categoriesPath}`)
      }

      // Import Products
      if (fs.existsSync(productsPath)) {
        try {
          const productsContent = fs.readFileSync(productsPath, 'utf8')

          // Debug logging
          log.info('Products CSV content preview:', productsContent.substring(0, 200))
          log.info('Products CSV first 100 bytes (hex):', Buffer.from(productsContent.substring(0, 100)).toString('hex'))

          const records = parse(productsContent, {
            columns: true,
            skip_empty_lines: true,
            bom: true,
            trim: true,
            relaxColumnCount: true,
            skipRecordsWithError: true
          })

          // Debug: log first record structure
          log.info('Total product records parsed:', records.length)
          if (records.length > 0) {
            log.info('First product record columns:', Object.keys(records[0] as any))
            log.info('First product record:', JSON.stringify(records[0], null, 2))
          }

          // Get all categories for lookup
          const categories = CategoryRepository.findAll()
          const categoryMap = new Map(
            categories.map(cat => [cat.name.toLowerCase(), cat.id])
          )

          for (let i = 0; i < records.length; i++) {
            const row = records[i] as any

            try {
              const name = String(row.Nom || '').trim()
              const barcode = String(row.Code_Barres || '').trim()
              const categoryName = String(row.Categorie || '').trim()
              const price = Number(row.Prix) || 0
              const cost = Number(row.Cout) || 0
              const stock = Number(row.Stock) || 0
              const minStock = Number(row.Stock_Min) || 0

              // Validation
              if (!name) {
                errors.push(`Ligne ${i + 2} (Produits): Nom manquant`)
                continue
              }

              if (!barcode) {
                errors.push(`Ligne ${i + 2} (Produits): Code-barres manquant`)
                continue
              }

              if (!categoryName) {
                errors.push(`Ligne ${i + 2} (Produits): Catégorie manquante`)
                continue
              }

              const categoryId = categoryMap.get(categoryName.toLowerCase())
              if (!categoryId) {
                errors.push(`Ligne ${i + 2} (Produits): Catégorie "${categoryName}" introuvable`)
                continue
              }

              if (price <= 0) {
                errors.push(`Ligne ${i + 2} (Produits): Prix invalide`)
                continue
              }

              // Check if product already exists by barcode
              const existing = ProductRepository.findByBarcode(barcode)

              if (existing) {
                // Update existing product
                ProductRepository.update({
                  id: existing.id,
                  name,
                  barcode,
                  categoryId,
                  price,
                  cost,
                  stock,
                  minStock
                })
              } else {
                // Create new product
                ProductRepository.create({
                  sku: barcode, // Use barcode as SKU
                  name,
                  barcode,
                  categoryId,
                  price,
                  cost,
                  discountRate: 0,
                  stock,
                  minStock,
                  unit: 'pièce'
                })
              }

              productsImported++
            } catch (error) {
              errors.push(`Ligne ${i + 2} (Produits): ${String(error)}`)
            }
          }

          log.info(`Products imported: ${productsImported}`)
        } catch (error) {
          errors.push(`Erreur lecture produits.csv: ${String(error)}`)
        }
      } else {
        log.warn(`Products file not found: ${productsPath}`)
      }

      log.info(`Import completed: ${categoriesImported} categories, ${productsImported} products`)

      if (errors.length > 0) {
        log.warn('Import errors:', errors)
      }

      return {
        success: true,
        categoriesImported,
        productsImported,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      log.error('Import failed:', error)
      return { success: false, error: String(error) }
    }
  }
}

export default new CsvService()
