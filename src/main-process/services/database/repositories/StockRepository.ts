import DatabaseService from '../db'
import { StockLog } from '@shared/types'
import log from 'electron-log'
import ProductRepository from './ProductRepository'

export class StockRepository {
  private db = DatabaseService.getInstance().getDatabase()

  findAll(): StockLog[] {
    try {
      const stmt = this.db.prepare('SELECT * FROM stock_logs ORDER BY created_at DESC')
      return stmt.all() as StockLog[]
    } catch (error) {
      log.error('StockRepository.findAll failed:', error)
      throw error
    }
  }

  findByProduct(productId: number): StockLog[] {
    try {
      const stmt = this.db.prepare('SELECT * FROM stock_logs WHERE product_id = ? ORDER BY created_at DESC')
      return stmt.all(productId) as StockLog[]
    } catch (error) {
      log.error('StockRepository.findByProduct failed:', error)
      throw error
    }
  }

  findByType(type: StockLog['type']): StockLog[] {
    try {
      const stmt = this.db.prepare('SELECT * FROM stock_logs WHERE type = ? ORDER BY created_at DESC')
      return stmt.all(type) as StockLog[]
    } catch (error) {
      log.error('StockRepository.findByType failed:', error)
      throw error
    }
  }

  findByDateRange(startDate: string, endDate: string): StockLog[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM stock_logs
        WHERE created_at BETWEEN ? AND ?
        ORDER BY created_at DESC
      `)
      return stmt.all(startDate, endDate) as StockLog[]
    } catch (error) {
      log.error('StockRepository.findByDateRange failed:', error)
      throw error
    }
  }

  adjust(
    productId: number,
    quantity: number,
    type: StockLog['type'],
    userId: number,
    reference?: string,
    notes?: string
  ): StockLog {
    const transaction = this.db.transaction(() => {
      try {
        // Get current product stock
        const product = ProductRepository.findById(productId)
        if (!product) {
          throw new Error('Product not found')
        }

        const previousStock = product.stock
        let newStock: number

        switch (type) {
          case 'in':
            newStock = previousStock + quantity
            break
          case 'out':
            newStock = previousStock - quantity
            if (newStock < 0) {
              throw new Error('Insufficient stock')
            }
            break
          case 'adjustment':
            newStock = quantity // Set absolute value
            break
          case 'return':
            newStock = previousStock + quantity
            break
          case 'sale':
            newStock = previousStock - quantity
            if (newStock < 0) {
              throw new Error('Insufficient stock')
            }
            break
          default:
            throw new Error('Invalid stock movement type')
        }

        // Update product stock
        ProductRepository.updateStock(productId, newStock)

        // Log the movement
        const stmt = this.db.prepare(`
          INSERT INTO stock_logs (
            product_id, type, quantity, previous_stock, new_stock, reference, user_id, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)

        const result = stmt.run(
          productId,
          type,
          quantity,
          previousStock,
          newStock,
          reference || null,
          userId,
          notes || null
        )

        const logStmt = this.db.prepare('SELECT * FROM stock_logs WHERE id = ?')
        const stockLog = logStmt.get(result.lastInsertRowid) as StockLog

        log.info(`Stock adjusted: Product ${productId} - ${type} - Qty: ${quantity}`)
        return stockLog
      } catch (error) {
        log.error('StockRepository.adjust transaction failed:', error)
        throw error
      }
    })

    return transaction()
  }

  getStockValue(): any {
    try {
      const stmt = this.db.prepare(`
        SELECT
          COUNT(*) as total_products,
          SUM(stock) as total_units,
          SUM(stock * cost) as total_cost_value,
          SUM(stock * price) as total_retail_value
        FROM products
        WHERE is_active = 1
      `)
      return stmt.get()
    } catch (error) {
      log.error('StockRepository.getStockValue failed:', error)
      throw error
    }
  }

  getLowStockProducts(): any[] {
    try {
      const stmt = this.db.prepare('SELECT * FROM v_low_stock_products')
      return stmt.all() as any[]
    } catch (error) {
      log.error('StockRepository.getLowStockProducts failed:', error)
      throw error
    }
  }

  getStockMovementSummary(startDate: string, endDate: string): any[] {
    try {
      const stmt = this.db.prepare(`
        SELECT
          p.id,
          p.name,
          p.sku,
          SUM(CASE WHEN sl.type = 'in' THEN sl.quantity ELSE 0 END) as total_in,
          SUM(CASE WHEN sl.type = 'out' THEN sl.quantity ELSE 0 END) as total_out,
          SUM(CASE WHEN sl.type = 'sale' THEN sl.quantity ELSE 0 END) as total_sold,
          SUM(CASE WHEN sl.type = 'return' THEN sl.quantity ELSE 0 END) as total_returned,
          SUM(CASE WHEN sl.type = 'adjustment' THEN sl.quantity ELSE 0 END) as total_adjusted
        FROM products p
        LEFT JOIN stock_logs sl ON p.id = sl.product_id
        WHERE sl.created_at BETWEEN ? AND ?
        GROUP BY p.id, p.name, p.sku
        ORDER BY total_sold DESC
      `)
      return stmt.all(startDate, endDate) as any[]
    } catch (error) {
      log.error('StockRepository.getStockMovementSummary failed:', error)
      throw error
    }
  }
}

export default new StockRepository()
