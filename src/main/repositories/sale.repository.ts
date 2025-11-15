import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './base.repository';
import {
  Sale,
  SaleItem,
  SaleWithItems,
  CreateSaleInput,
  SaleFilters,
} from '@shared/types/models';

export class SaleRepository extends BaseRepository<Sale> {
  protected tableName = 'sales';

  constructor() {
    super('SaleRepository');
  }

  /**
   * Get all sales with filters
   */
  getAll(filters?: SaleFilters, limit = 100, offset = 0): SaleWithItems[] {
    try {
      let sql = `
        SELECT s.*, u.full_name as user_name
        FROM sales s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE 1=1
      `;
      const params: unknown[] = [];

      if (filters?.start_date) {
        sql += ` AND s.created_at >= ?`;
        params.push(filters.start_date);
      }

      if (filters?.end_date) {
        sql += ` AND s.created_at <= ?`;
        params.push(filters.end_date);
      }

      if (filters?.user_id) {
        sql += ` AND s.user_id = ?`;
        params.push(filters.user_id);
      }

      if (filters?.payment_method) {
        sql += ` AND s.payment_method = ?`;
        params.push(filters.payment_method);
      }

      if (filters?.payment_status) {
        sql += ` AND s.payment_status = ?`;
        params.push(filters.payment_status);
      }

      sql += ` ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const sales = this.query<Sale>(sql, params);

      // Get items for each sale
      return sales.map(sale => ({
        ...sale,
        synced: Boolean(sale.synced),
        items: this.getSaleItems(sale.id),
      }));
    } catch (error) {
      this.logger.error('Failed to get all sales:', error);
      throw error;
    }
  }

  /**
   * Get sale by ID with items
   */
  getByIdWithItems(id: string): SaleWithItems | null {
    const sale = this.findById(id);
    if (!sale) return null;

    return {
      ...sale,
      synced: Boolean(sale.synced),
      items: this.getSaleItems(id),
    };
  }

  /**
   * Get sale items
   */
  private getSaleItems(saleId: string): SaleItem[] {
    const sql = 'SELECT * FROM sale_items WHERE sale_id = ? ORDER BY created_at';
    return this.query<SaleItem>(sql, [saleId]);
  }

  /**
   * Create sale with items
   */
  createWithItems(input: CreateSaleInput, userId: string): SaleWithItems {
    return this.transaction(() => {
      const now = new Date().toISOString();
      const saleNumber = this.generateSaleNumber();

      // Calculate totals
      let subtotal_ht = 0;
      let total_tax = 0;

      const items = input.items.map(item => {
        const item_subtotal_ht = item.unit_price_ht * item.quantity;
        const item_tax = item_subtotal_ht * item.tax_rate;
        const item_subtotal_ttc = item_subtotal_ht + item_tax;

        subtotal_ht += item_subtotal_ht;
        total_tax += item_tax;

        return {
          subtotal_ht: item_subtotal_ht,
          subtotal_ttc: item_subtotal_ttc - (item.discount_amount || 0),
        };
      });

      const total_ttc = subtotal_ht + total_tax - (input.discount_amount || 0);
      const change_amount = input.amount_paid - total_ttc;

      // Create sale
      const sale = this.insert({
        id: uuidv4(),
        sale_number: saleNumber,
        user_id: userId,
        customer_name: input.customer_name || null,
        subtotal_ht,
        total_tax,
        total_ttc,
        discount_amount: input.discount_amount || 0,
        discount_percentage: input.discount_percentage || 0,
        payment_method: input.payment_method,
        payment_status: 'completed',
        amount_paid: input.amount_paid,
        change_amount: Math.max(0, change_amount),
        notes: input.notes || null,
        synced: 0,
        created_at: now,
      });

      // Create sale items
      const saleItems: SaleItem[] = input.items.map((item, index) => {
        const itemData = {
          id: uuidv4(),
          sale_id: sale.id,
          product_id: item.product_id,
          product_name: '', // Will be filled by service
          product_sku: null,
          quantity: item.quantity,
          unit_price_ht: item.unit_price_ht,
          tax_rate: item.tax_rate,
          unit_price_ttc: item.unit_price_ht * (1 + item.tax_rate),
          subtotal_ht: items[index].subtotal_ht,
          subtotal_ttc: items[index].subtotal_ttc,
          discount_amount: item.discount_amount || 0,
          created_at: now,
        };

        const sql = `
          INSERT INTO sale_items (
            id, sale_id, product_id, product_name, product_sku,
            quantity, unit_price_ht, tax_rate, unit_price_ttc,
            subtotal_ht, subtotal_ttc, discount_amount, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        this.execute(sql, [
          itemData.id,
          itemData.sale_id,
          itemData.product_id,
          itemData.product_name,
          itemData.product_sku,
          itemData.quantity,
          itemData.unit_price_ht,
          itemData.tax_rate,
          itemData.unit_price_ttc,
          itemData.subtotal_ht,
          itemData.subtotal_ttc,
          itemData.discount_amount,
          itemData.created_at,
        ]);

        return itemData as SaleItem;
      });

      return {
        ...sale,
        synced: Boolean(sale.synced),
        items: saleItems,
      };
    });
  }

  /**
   * Generate unique sale number
   */
  private generateSaleNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    // Count today's sales
    const today = date.toISOString().split('T')[0];
    const count = this.count('created_at >= ?', [today]) + 1;
    const sequence = count.toString().padStart(4, '0');

    return `${year}${month}${day}-${sequence}`;
  }

  /**
   * Get daily sales
   */
  getDailySales(date?: string): SaleWithItems[] {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.getAll(
      {
        start_date: `${targetDate} 00:00:00`,
        end_date: `${targetDate} 23:59:59`,
      },
      1000,
      0
    );
  }

  /**
   * Count sales with filters
   */
  countWithFilters(filters?: SaleFilters): number {
    let sql = 'SELECT COUNT(*) as count FROM sales WHERE 1=1';
    const params: unknown[] = [];

    if (filters?.start_date) {
      sql += ` AND created_at >= ?`;
      params.push(filters.start_date);
    }

    if (filters?.end_date) {
      sql += ` AND created_at <= ?`;
      params.push(filters.end_date);
    }

    if (filters?.user_id) {
      sql += ` AND user_id = ?`;
      params.push(filters.user_id);
    }

    if (filters?.payment_method) {
      sql += ` AND payment_method = ?`;
      params.push(filters.payment_method);
    }

    const result = this.db.prepare(sql).get(...params) as { count: number };
    return result.count;
  }
}
