import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './base.repository';
import {
  StockMovement,
  StockMovementWithDetails,
  CreateStockMovementInput,
  StockMovementFilters,
} from '@shared/types/models';
import { ProductRepository } from './product.repository';

export class StockMovementRepository extends BaseRepository<StockMovement> {
  protected tableName = 'stock_movements';
  private productRepo: ProductRepository;

  constructor() {
    super('StockMovementRepository');
    this.productRepo = new ProductRepository();
  }

  /**
   * Create stock movement
   */
  createMovement(input: CreateStockMovementInput, userId: string): StockMovement {
    return this.transaction(() => {
      const product = this.productRepo.findById(input.product_id);
      if (!product) {
        throw new Error('Product not found');
      }

      const now = new Date().toISOString();
      const quantityChange =
        input.type === 'in' || input.type === 'return'
          ? input.quantity
          : -input.quantity;

      const movement = {
        id: uuidv4(),
        product_id: input.product_id,
        user_id: userId,
        type: input.type,
        quantity: input.quantity,
        stock_before: product.stock_quantity,
        stock_after: product.stock_quantity + quantityChange,
        reference: input.reference || null,
        notes: input.notes || null,
        created_at: now,
      };

      return this.insert(movement);
    });
  }

  /**
   * Get movements with filters
   */
  getWithFilters(filters?: StockMovementFilters, limit = 100, offset = 0): StockMovementWithDetails[] {
    let sql = `
      SELECT sm.*, p.name as product_name, u.full_name as user_name
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      LEFT JOIN users u ON sm.user_id = u.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (filters?.product_id) {
      sql += ` AND sm.product_id = ?`;
      params.push(filters.product_id);
    }

    if (filters?.user_id) {
      sql += ` AND sm.user_id = ?`;
      params.push(filters.user_id);
    }

    if (filters?.type) {
      sql += ` AND sm.type = ?`;
      params.push(filters.type);
    }

    if (filters?.start_date) {
      sql += ` AND sm.created_at >= ?`;
      params.push(filters.start_date);
    }

    if (filters?.end_date) {
      sql += ` AND sm.created_at <= ?`;
      params.push(filters.end_date);
    }

    sql += ` ORDER BY sm.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return this.query<StockMovementWithDetails>(sql, params);
  }
}
