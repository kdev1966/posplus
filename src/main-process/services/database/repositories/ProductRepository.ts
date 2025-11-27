import Database from 'better-sqlite3'
import DatabaseService from '../db'
import { Product, CreateProductDTO, UpdateProductDTO } from '@shared/types'
import log from 'electron-log'
import P2PSyncService from '../../p2p/SyncService'

/**
 * ProductRepository with cached prepared statements for optimal performance.
 * Statements are lazily initialized and reused across calls.
 */
export class ProductRepository {
  // Cached prepared statements
  private _stmtFindAll: Database.Statement | null = null
  private _stmtFindById: Database.Statement | null = null
  private _stmtFindByBarcode: Database.Statement | null = null
  private _stmtFindBySku: Database.Statement | null = null
  private _stmtSearch: Database.Statement | null = null
  private _stmtFindByCategory: Database.Statement | null = null
  private _stmtFindLowStock: Database.Statement | null = null
  private _stmtCreate: Database.Statement | null = null
  private _stmtCreateFromSync: Database.Statement | null = null
  private _stmtUpdateFromSync: Database.Statement | null = null
  private _stmtDelete: Database.Statement | null = null
  private _stmtUpdateStock: Database.Statement | null = null
  // Reserved for future sync functionality
  // private _stmtUpdateStockFromSync: Database.Statement | null = null
  private _stmtAdjustStock: Database.Statement | null = null
  private _stmtToggleActive: Database.Statement | null = null
  private _stmtFindLastSku: Database.Statement | null = null

  private get db() {
    return DatabaseService.getInstance().getDatabase()
  }

  /**
   * Maps a database row to a Product object.
   * Centralizes the snake_case to camelCase conversion.
   */
  private mapProductFromDb(row: any): Product {
    return {
      id: row.id,
      sku: row.sku,
      barcode: row.barcode,
      name: row.name,
      description: row.description,
      categoryId: row.category_id,
      categoryName: row.category_name,
      price: row.price,
      cost: row.cost,
      discountRate: row.discount_rate,
      stock: row.stock,
      minStock: row.min_stock,
      maxStock: row.max_stock,
      unit: row.unit,
      isActive: Boolean(row.is_active),
      imageUrl: row.image_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  // Lazy statement getters with caching
  private get stmtFindAll(): Database.Statement {
    if (!this._stmtFindAll) {
      this._stmtFindAll = this.db.prepare(`
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.name
      `)
    }
    return this._stmtFindAll
  }

  private get stmtFindById(): Database.Statement {
    if (!this._stmtFindById) {
      this._stmtFindById = this.db.prepare(`
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
      `)
    }
    return this._stmtFindById
  }

  private get stmtFindByBarcode(): Database.Statement {
    if (!this._stmtFindByBarcode) {
      this._stmtFindByBarcode = this.db.prepare(`
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.barcode = ?
      `)
    }
    return this._stmtFindByBarcode
  }

  private get stmtFindBySku(): Database.Statement {
    if (!this._stmtFindBySku) {
      this._stmtFindBySku = this.db.prepare(`
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.sku = ?
      `)
    }
    return this._stmtFindBySku
  }

  private get stmtSearch(): Database.Statement {
    if (!this._stmtSearch) {
      this._stmtSearch = this.db.prepare(`
        SELECT DISTINCT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id IN (
          SELECT rowid FROM products_fts WHERE products_fts MATCH ?
        )
        OR p.barcode LIKE ?
        ORDER BY p.name
        LIMIT 50
      `)
    }
    return this._stmtSearch
  }

  private get stmtFindByCategory(): Database.Statement {
    if (!this._stmtFindByCategory) {
      this._stmtFindByCategory = this.db.prepare(`
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.category_id = ?
        ORDER BY p.name
      `)
    }
    return this._stmtFindByCategory
  }

  private get stmtFindLowStock(): Database.Statement {
    if (!this._stmtFindLowStock) {
      this._stmtFindLowStock = this.db.prepare('SELECT * FROM v_low_stock_products')
    }
    return this._stmtFindLowStock
  }

  private get stmtCreate(): Database.Statement {
    if (!this._stmtCreate) {
      this._stmtCreate = this.db.prepare(`
        INSERT INTO products (
          sku, barcode, name, description, category_id,
          price, cost, discount_rate, stock, min_stock, max_stock, unit, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
    }
    return this._stmtCreate
  }

  private get stmtCreateFromSync(): Database.Statement {
    if (!this._stmtCreateFromSync) {
      this._stmtCreateFromSync = this.db.prepare(`
        INSERT INTO products (
          sku, barcode, name, description, category_id,
          price, cost, discount_rate, stock, min_stock, max_stock, unit, image_url,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
    }
    return this._stmtCreateFromSync
  }

  private get stmtUpdateFromSync(): Database.Statement {
    if (!this._stmtUpdateFromSync) {
      this._stmtUpdateFromSync = this.db.prepare(`
        UPDATE products SET
          sku = ?, barcode = ?, name = ?, description = ?, category_id = ?,
          price = ?, cost = ?, discount_rate = ?, stock = ?, min_stock = ?,
          max_stock = ?, unit = ?, image_url = ?, is_active = ?, updated_at = ?
        WHERE id = ?
      `)
    }
    return this._stmtUpdateFromSync
  }

  private get stmtDelete(): Database.Statement {
    if (!this._stmtDelete) {
      this._stmtDelete = this.db.prepare('DELETE FROM products WHERE id = ?')
    }
    return this._stmtDelete
  }

  private get stmtUpdateStock(): Database.Statement {
    if (!this._stmtUpdateStock) {
      this._stmtUpdateStock = this.db.prepare('UPDATE products SET stock = ? WHERE id = ?')
    }
    return this._stmtUpdateStock
  }

  private get stmtAdjustStock(): Database.Statement {
    if (!this._stmtAdjustStock) {
      this._stmtAdjustStock = this.db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?')
    }
    return this._stmtAdjustStock
  }

  private get stmtToggleActive(): Database.Statement {
    if (!this._stmtToggleActive) {
      this._stmtToggleActive = this.db.prepare('UPDATE products SET is_active = NOT is_active WHERE id = ?')
    }
    return this._stmtToggleActive
  }

  private get stmtFindLastSku(): Database.Statement {
    if (!this._stmtFindLastSku) {
      this._stmtFindLastSku = this.db.prepare(`
        SELECT sku FROM products
        WHERE sku LIKE ?
        ORDER BY sku DESC
        LIMIT 1
      `)
    }
    return this._stmtFindLastSku
  }

  findAll(options?: { limit?: number; offset?: number }): Product[] {
    try {
      if (options?.limit !== undefined) {
        // Use paginated query
        const stmt = this.db.prepare(`
          SELECT p.*, c.name as category_name
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          ORDER BY p.name
          LIMIT ? OFFSET ?
        `)
        const results = stmt.all(options.limit, options.offset || 0) as any[]
        return results.map(row => this.mapProductFromDb(row))
      }
      // Use cached non-paginated query
      const results = this.stmtFindAll.all() as any[]
      return results.map(row => this.mapProductFromDb(row))
    } catch (error) {
      log.error('ProductRepository.findAll failed:', error)
      throw error
    }
  }

  /**
   * Get total count of products for pagination
   */
  count(): number {
    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM products')
      const result = stmt.get() as { count: number }
      return result.count
    } catch (error) {
      log.error('ProductRepository.count failed:', error)
      throw error
    }
  }

  findById(id: number): Product | null {
    try {
      const result = this.stmtFindById.get(id) as any
      return result ? this.mapProductFromDb(result) : null
    } catch (error) {
      log.error('ProductRepository.findById failed:', error)
      throw error
    }
  }

  findByBarcode(barcode: string): Product | null {
    try {
      const result = this.stmtFindByBarcode.get(barcode) as any
      return result ? this.mapProductFromDb(result) : null
    } catch (error) {
      log.error('ProductRepository.findByBarcode failed:', error)
      throw error
    }
  }

  findBySku(sku: string): Product | null {
    try {
      const result = this.stmtFindBySku.get(sku) as any
      return result ? this.mapProductFromDb(result) : null
    } catch (error) {
      log.error('ProductRepository.findBySku failed:', error)
      throw error
    }
  }

  search(query: string): Product[] {
    try {
      const searchTerm = `${query}*`
      const likeTerm = `%${query}%`
      const results = this.stmtSearch.all(searchTerm, likeTerm) as any[]
      return results.map(row => this.mapProductFromDb(row))
    } catch (error) {
      log.error('ProductRepository.search failed:', error)
      throw error
    }
  }

  findByCategory(categoryId: number): Product[] {
    try {
      const results = this.stmtFindByCategory.all(categoryId) as any[]
      return results.map(row => this.mapProductFromDb(row))
    } catch (error) {
      log.error('ProductRepository.findByCategory failed:', error)
      throw error
    }
  }

  findLowStock(): Product[] {
    try {
      const results = this.stmtFindLowStock.all() as any[]
      return results.map(row => this.mapProductFromDb(row))
    } catch (error) {
      log.error('ProductRepository.findLowStock failed:', error)
      throw error
    }
  }

  private generateSKU(): string {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const pattern = `SKU-${dateStr}-%`
    const result = this.stmtFindLastSku.get(pattern) as any

    let nextNumber = 1
    if (result && result.sku) {
      const match = result.sku.match(/SKU-\d{8}-(\d{5})/)
      if (match) {
        nextNumber = parseInt(match[1]) + 1
      }
    }

    return `SKU-${dateStr}-${nextNumber.toString().padStart(5, '0')}`
  }

  create(data: CreateProductDTO): Product {
    try {
      const sku = data.sku && data.sku.trim() !== '' ? data.sku : this.generateSKU()

      const result = this.stmtCreate.run(
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

  createFromSync(productData: any): Product {
    try {
      log.info(`P2P: Creating product from sync: ${productData.name}`)

      const result = this.stmtCreateFromSync.run(
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

      if (data.sku !== undefined) { fields.push('sku = ?'); values.push(data.sku) }
      if (data.barcode !== undefined) { fields.push('barcode = ?'); values.push(data.barcode) }
      if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
      if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
      if (data.categoryId !== undefined) { fields.push('category_id = ?'); values.push(data.categoryId) }
      if (data.price !== undefined) { fields.push('price = ?'); values.push(data.price) }
      if (data.cost !== undefined) { fields.push('cost = ?'); values.push(data.cost) }
      if (data.discountRate !== undefined) { fields.push('discount_rate = ?'); values.push(data.discountRate) }
      if (data.stock !== undefined) { fields.push('stock = ?'); values.push(data.stock) }
      if (data.minStock !== undefined) { fields.push('min_stock = ?'); values.push(data.minStock) }
      if (data.maxStock !== undefined) { fields.push('max_stock = ?'); values.push(data.maxStock) }
      if (data.unit !== undefined) { fields.push('unit = ?'); values.push(data.unit) }
      if (data.imageUrl !== undefined) { fields.push('image_url = ?'); values.push(data.imageUrl) }

      if (fields.length === 0) {
        throw new Error('No fields to update')
      }

      values.push(data.id)

      // Dynamic update query - cannot be cached
      const stmt = this.db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`)
      stmt.run(...values)

      const product = this.findById(data.id)
      if (!product) {
        throw new Error('Product not found after update')
      }

      log.info(`Product updated: ${product.name} (ID: ${product.id})`)

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
      const result = this.stmtDelete.run(id)
      log.info(`Product deleted: ID ${id}`)
      return result.changes > 0
    } catch (error: any) {
      log.error('ProductRepository.delete failed:', error)
      if (error?.message?.includes('Cannot delete product with stock')) {
        throw new Error('PRODUCT_HAS_STOCK')
      }
      throw error
    }
  }

  updateStock(productId: number, quantity: number): Product {
    try {
      this.stmtUpdateStock.run(quantity, productId)

      const product = this.findById(productId)
      if (!product) {
        throw new Error('Product not found after stock update')
      }

      log.info(`Product stock updated: ${product.name} (ID: ${product.id}) - New stock: ${quantity}`)

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

  updateFromSync(productData: any): Product | null {
    try {
      log.info(`P2P: Updating product from sync: ${productData.name}`)

      this.stmtUpdateFromSync.run(
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

  updateStockFromSync(productId: number, quantity: number): void {
    try {
      log.info(`P2P: Updating stock from sync for product ${productId} to ${quantity}`)
      this.stmtUpdateStock.run(quantity, productId)
      log.info(`P2P: Stock updated from sync successfully`)
    } catch (error) {
      log.error('ProductRepository.updateStockFromSync failed:', error)
      throw error
    }
  }

  adjustStock(productId: number, adjustment: number): Product {
    try {
      this.stmtAdjustStock.run(adjustment, productId)

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
      const result = this.stmtToggleActive.run(id)
      log.info(`Product active status toggled: ID ${id}`)
      return result.changes > 0
    } catch (error) {
      log.error('ProductRepository.toggleActive failed:', error)
      throw error
    }
  }

  /**
   * Clears the statement cache. Useful if the database connection changes.
   */
  clearStatementCache(): void {
    this._stmtFindAll = null
    this._stmtFindById = null
    this._stmtFindByBarcode = null
    this._stmtFindBySku = null
    this._stmtSearch = null
    this._stmtFindByCategory = null
    this._stmtFindLowStock = null
    this._stmtCreate = null
    this._stmtCreateFromSync = null
    this._stmtUpdateFromSync = null
    this._stmtDelete = null
    this._stmtUpdateStock = null
    // this._stmtUpdateStockFromSync = null
    this._stmtAdjustStock = null
    this._stmtToggleActive = null
    this._stmtFindLastSku = null
  }
}

export default new ProductRepository()
