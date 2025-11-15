import DatabaseService from '../db'
import { Product, CreateProductDTO, UpdateProductDTO } from '@shared/types'
import log from 'electron-log'

export class ProductRepository {
  private db = DatabaseService.getInstance().getDatabase()

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
      return stmt.all() as Product[]
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
      return (stmt.get(id) as Product) || null
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
      return (stmt.get(barcode) as Product) || null
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
      return (stmt.get(sku) as Product) || null
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
      return stmt.all(searchTerm, likeTerm) as Product[]
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
      return stmt.all(categoryId) as Product[]
    } catch (error) {
      log.error('ProductRepository.findByCategory failed:', error)
      throw error
    }
  }

  findLowStock(): Product[] {
    try {
      const stmt = this.db.prepare('SELECT * FROM v_low_stock_products')
      return stmt.all() as Product[]
    } catch (error) {
      log.error('ProductRepository.findLowStock failed:', error)
      throw error
    }
  }

  create(data: CreateProductDTO): Product {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO products (
          sku, barcode, name, description, category_id,
          price, cost, tax_rate, stock, min_stock, max_stock, unit, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        data.sku,
        data.barcode || null,
        data.name,
        data.description || null,
        data.categoryId,
        data.price,
        data.cost,
        data.taxRate,
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
      return product
    } catch (error) {
      log.error('ProductRepository.create failed:', error)
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
      if (data.taxRate !== undefined) {
        fields.push('tax_rate = ?')
        values.push(data.taxRate)
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
    } catch (error) {
      log.error('ProductRepository.delete failed:', error)
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
      return product
    } catch (error) {
      log.error('ProductRepository.updateStock failed:', error)
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
