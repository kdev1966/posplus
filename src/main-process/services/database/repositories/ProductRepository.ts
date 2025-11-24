import DatabaseService from '../db'
import { Product, CreateProductDTO, UpdateProductDTO } from '@shared/types'
import log from 'electron-log'
import P2PSyncService from '../../p2p/SyncService'

export class ProductRepository {
  private get db() {
    return DatabaseService.getInstance().getDatabase()
  }

  findAll(): Product[] {
    try {
      const stmt = this.db.prepare(`
        SELECT
          p.*,
          c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.name
      `)
      const results = stmt.all() as any[]
      return results.map(result => ({
        ...result,
        isActive: Boolean(result.is_active),
        categoryId: result.category_id,
        discountRate: result.discount_rate,
        minStock: result.min_stock,
        maxStock: result.max_stock,
        imageUrl: result.image_url,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      }))
    } catch (error) {
      log.error('ProductRepository.findAll failed:', error)
      throw error
    }
  }

  findById(id: number): Product | null {
    try {
      const stmt = this.db.prepare(`
        SELECT
          p.*,
          c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
      `)
      const result = stmt.get(id) as any
      if (!result) return null

      return {
        ...result,
        isActive: Boolean(result.is_active),
        categoryId: result.category_id,
        discountRate: result.discount_rate,
        minStock: result.min_stock,
        maxStock: result.max_stock,
        imageUrl: result.image_url,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      }
    } catch (error) {
      log.error('ProductRepository.findById failed:', error)
      throw error
    }
  }

  findByBarcode(barcode: string): Product | null {
    try {
      const stmt = this.db.prepare(`
        SELECT
          p.*,
          c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.barcode = ?
      `)
      const result = stmt.get(barcode) as any
      if (!result) return null

      return {
        ...result,
        isActive: Boolean(result.is_active),
        categoryId: result.category_id,
        discountRate: result.discount_rate,
        minStock: result.min_stock,
        maxStock: result.max_stock,
        imageUrl: result.image_url,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      }
    } catch (error) {
      log.error('ProductRepository.findByBarcode failed:', error)
      throw error
    }
  }

  findBySku(sku: string): Product | null {
    try {
      const stmt = this.db.prepare(`
        SELECT
          p.*,
          c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.sku = ?
      `)
      const result = stmt.get(sku) as any
      if (!result) return null

      return {
        ...result,
        isActive: Boolean(result.is_active),
        categoryId: result.category_id,
        discountRate: result.discount_rate,
        minStock: result.min_stock,
        maxStock: result.max_stock,
        imageUrl: result.image_url,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      }
    } catch (error) {
      log.error('ProductRepository.findBySku failed:', error)
      throw error
    }
  }

  search(query: string): Product[] {
    try {
      const stmt = this.db.prepare(`
        SELECT DISTINCT
          p.*,
          c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id IN (
          SELECT rowid FROM products_fts WHERE products_fts MATCH ?
        )
        OR p.barcode LIKE ?
        ORDER BY p.name
        LIMIT 50
      `)
      const searchTerm = `${query}*`
      const likeTerm = `%${query}%`
      const results = stmt.all(searchTerm, likeTerm) as any[]
      return results.map(result => ({
        ...result,
        isActive: Boolean(result.is_active),
        categoryId: result.category_id,
        discountRate: result.discount_rate,
        minStock: result.min_stock,
        maxStock: result.max_stock,
        imageUrl: result.image_url,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      }))
    } catch (error) {
      log.error('ProductRepository.search failed:', error)
      throw error
    }
  }

  findByCategory(categoryId: number): Product[] {
    try {
      const stmt = this.db.prepare(`
        SELECT
          p.*,
          c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.category_id = ?
        ORDER BY p.name
      `)
      const results = stmt.all(categoryId) as any[]
      return results.map(result => ({
        ...result,
        isActive: Boolean(result.is_active),
        categoryId: result.category_id,
        discountRate: result.discount_rate,
        minStock: result.min_stock,
        maxStock: result.max_stock,
        imageUrl: result.image_url,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      }))
    } catch (error) {
      log.error('ProductRepository.findByCategory failed:', error)
      throw error
    }
  }

  findLowStock(): Product[] {
    try {
      const stmt = this.db.prepare('SELECT * FROM v_low_stock_products')
      const results = stmt.all() as any[]
      return results.map(result => ({
        ...result,
        isActive: Boolean(result.is_active),
        categoryId: result.category_id,
        discountRate: result.discount_rate,
        minStock: result.min_stock,
        maxStock: result.max_stock,
        imageUrl: result.image_url,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      }))
    } catch (error) {
      log.error('ProductRepository.findLowStock failed:', error)
      throw error
    }
  }

  private generateSKU(): string {
    // Génère un SKU automatique au format: SKU-YYYYMMDD-XXXXX
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')

    // Trouve le dernier SKU généré aujourd'hui
    const stmt = this.db.prepare(`
      SELECT sku FROM products
      WHERE sku LIKE ?
      ORDER BY sku DESC
      LIMIT 1
    `)
    const pattern = `SKU-${dateStr}-%`
    const result = stmt.get(pattern) as any

    let nextNumber = 1
    if (result && result.sku) {
      // Extrait le numéro du dernier SKU et incrémente
      const match = result.sku.match(/SKU-\d{8}-(\d{5})/)
      if (match) {
        nextNumber = parseInt(match[1]) + 1
      }
    }

    // Format: SKU-20251123-00001
    return `SKU-${dateStr}-${nextNumber.toString().padStart(5, '0')}`
  }

  create(data: CreateProductDTO): Product {
    try {
      // Générer un SKU automatiquement s'il n'est pas fourni
      const sku = data.sku && data.sku.trim() !== '' ? data.sku : this.generateSKU()

      const stmt = this.db.prepare(`
        INSERT INTO products (
          sku, barcode, name, description, category_id,
          price, cost, discount_rate, stock, min_stock, max_stock, unit, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        sku,
        data.barcode || null,
        data.name,
        data.description || null,
        data.categoryId,
        data.price,
        data.cost,
        data.discountRate || 0,
        data.stock,
        data.minStock,
        data.maxStock || null,
        data.unit,
        data.imageUrl || null
      )

      const product = this.findById(result.lastInsertRowid as number)
      if (!product) {
        throw new Error('Failed to create product')
      }

      log.info(`Product created: ${product.name} (ID: ${product.id})`)

      // Synchronize with P2P peers
      try {
        P2PSyncService.syncProduct(product, 'create')
        log.info(`P2P: Product ${product.name} synchronized with peers`)
      } catch (error) {
        log.error('P2P: Failed to sync product creation:', error)
      }

      return product
    } catch (error) {
      log.error('ProductRepository.create failed:', error)
      throw error
    }
  }

  // Méthode pour créer un produit depuis sync P2P
  createFromSync(productData: any): Product {
    try {
      log.info(`P2P: Creating product from sync: ${productData.name}`)

      const stmt = this.db.prepare(`
        INSERT INTO products (
          sku, barcode, name, description, category_id,
          price, cost, discount_rate, stock, min_stock, max_stock, unit, image_url,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        productData.sku,
        productData.barcode || null,
        productData.name,
        productData.description || null,
        productData.categoryId,
        productData.price,
        productData.cost,
        productData.discountRate || 0,
        productData.stock,
        productData.minStock,
        productData.maxStock || null,
        productData.unit,
        productData.imageUrl || null,
        productData.isActive ? 1 : 0,
        productData.createdAt,
        productData.updatedAt
      )

      const product = this.findById(result.lastInsertRowid as number)
      if (!product) {
        throw new Error('Failed to create product from sync')
      }

      log.info(`P2P: Product ${product.name} created from sync successfully`)
      return product
    } catch (error) {
      log.error('ProductRepository.createFromSync failed:', error)
      throw error
    }
  }

  update(data: UpdateProductDTO): Product {
    try {
      const fields: string[] = []
      const values: any[] = []

      if (data.sku !== undefined) {
        fields.push('sku = ?')
        values.push(data.sku)
      }
      if (data.barcode !== undefined) {
        fields.push('barcode = ?')
        values.push(data.barcode)
      }
      if (data.name !== undefined) {
        fields.push('name = ?')
        values.push(data.name)
      }
      if (data.description !== undefined) {
        fields.push('description = ?')
        values.push(data.description)
      }
      if (data.categoryId !== undefined) {
        fields.push('category_id = ?')
        values.push(data.categoryId)
      }
      if (data.price !== undefined) {
        fields.push('price = ?')
        values.push(data.price)
      }
      if (data.cost !== undefined) {
        fields.push('cost = ?')
        values.push(data.cost)
      }
      if (data.discountRate !== undefined) {
        fields.push('discount_rate = ?')
        values.push(data.discountRate)
      }
      if (data.stock !== undefined) {
        fields.push('stock = ?')
        values.push(data.stock)
      }
      if (data.minStock !== undefined) {
        fields.push('min_stock = ?')
        values.push(data.minStock)
      }
      if (data.maxStock !== undefined) {
        fields.push('max_stock = ?')
        values.push(data.maxStock)
      }
      if (data.unit !== undefined) {
        fields.push('unit = ?')
        values.push(data.unit)
      }
      if (data.imageUrl !== undefined) {
        fields.push('image_url = ?')
        values.push(data.imageUrl)
      }

      if (fields.length === 0) {
        throw new Error('No fields to update')
      }

      values.push(data.id)

      const stmt = this.db.prepare(`
        UPDATE products SET ${fields.join(', ')} WHERE id = ?
      `)
      stmt.run(...values)

      const product = this.findById(data.id)
      if (!product) {
        throw new Error('Product not found after update')
      }

      log.info(`Product updated: ${product.name} (ID: ${product.id})`)

      // Synchronize with P2P peers
      try {
        P2PSyncService.syncProduct(product, 'update')
        log.info(`P2P: Product ${product.name} update synchronized with peers`)
      } catch (error) {
        log.error('P2P: Failed to sync product update:', error)
      }

      return product
    } catch (error) {
      log.error('ProductRepository.update failed:', error)
      throw error
    }
  }

  delete(id: number): boolean {
    try {
      const stmt = this.db.prepare('DELETE FROM products WHERE id = ?')
      const result = stmt.run(id)

      log.info(`Product deleted: ID ${id}`)
      return result.changes > 0
    } catch (error: any) {
      log.error('ProductRepository.delete failed:', error)

      // Check if error is from the trigger preventing deletion of products with stock
      if (error?.message?.includes('Cannot delete product with stock')) {
        throw new Error('PRODUCT_HAS_STOCK')
      }

      throw error
    }
  }

  updateStock(productId: number, quantity: number): Product {
    try {
      const stmt = this.db.prepare('UPDATE products SET stock = ? WHERE id = ?')
      stmt.run(quantity, productId)

      const product = this.findById(productId)
      if (!product) {
        throw new Error('Product not found after stock update')
      }

      log.info(`Product stock updated: ${product.name} (ID: ${product.id}) - New stock: ${quantity}`)

      // Synchronize stock with P2P peers
      try {
        P2PSyncService.syncStock(productId, quantity)
        log.info(`P2P: Stock update for ${product.name} synchronized with peers`)
      } catch (error) {
        log.error('P2P: Failed to sync stock update:', error)
      }

      return product
    } catch (error) {
      log.error('ProductRepository.updateStock failed:', error)
      throw error
    }
  }

  // Méthode pour mettre à jour un produit depuis sync P2P
  updateFromSync(productData: any): Product | null {
    try {
      log.info(`P2P: Updating product from sync: ${productData.name}`)

      const stmt = this.db.prepare(`
        UPDATE products SET
          sku = ?,
          barcode = ?,
          name = ?,
          description = ?,
          category_id = ?,
          price = ?,
          cost = ?,
          discount_rate = ?,
          stock = ?,
          min_stock = ?,
          max_stock = ?,
          unit = ?,
          image_url = ?,
          is_active = ?,
          updated_at = ?
        WHERE id = ?
      `)

      stmt.run(
        productData.sku,
        productData.barcode || null,
        productData.name,
        productData.description || null,
        productData.categoryId,
        productData.price,
        productData.cost,
        productData.discountRate || 0,
        productData.stock,
        productData.minStock,
        productData.maxStock || null,
        productData.unit,
        productData.imageUrl || null,
        productData.isActive ? 1 : 0,
        productData.updatedAt,
        productData.id
      )

      const product = this.findById(productData.id)
      if (product) {
        log.info(`P2P: Product ${product.name} updated from sync successfully`)
      }
      return product
    } catch (error) {
      log.error('ProductRepository.updateFromSync failed:', error)
      throw error
    }
  }

  // Méthode pour mettre à jour le stock depuis sync P2P
  updateStockFromSync(productId: number, quantity: number): void {
    try {
      log.info(`P2P: Updating stock from sync for product ${productId} to ${quantity}`)

      const stmt = this.db.prepare('UPDATE products SET stock = ? WHERE id = ?')
      stmt.run(quantity, productId)

      log.info(`P2P: Stock updated from sync successfully`)
    } catch (error) {
      log.error('ProductRepository.updateStockFromSync failed:', error)
      throw error
    }
  }

  adjustStock(productId: number, adjustment: number): Product {
    try {
      const stmt = this.db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?')
      stmt.run(adjustment, productId)

      const product = this.findById(productId)
      if (!product) {
        throw new Error('Product not found after stock adjustment')
      }

      log.info(`Product stock adjusted: ${product.name} (ID: ${product.id}) - Adjustment: ${adjustment}`)
      return product
    } catch (error) {
      log.error('ProductRepository.adjustStock failed:', error)
      throw error
    }
  }

  toggleActive(id: number): boolean {
    try {
      const stmt = this.db.prepare('UPDATE products SET is_active = NOT is_active WHERE id = ?')
      const result = stmt.run(id)

      log.info(`Product active status toggled: ID ${id}`)
      return result.changes > 0
    } catch (error) {
      log.error('ProductRepository.toggleActive failed:', error)
      throw error
    }
  }
}

export default new ProductRepository()
