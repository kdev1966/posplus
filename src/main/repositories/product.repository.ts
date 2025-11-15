import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './base.repository';
import {
  Product,
  ProductWithCategory,
  CreateProductInput,
  UpdateProductInput,
  ProductFilters,
} from '@shared/types/models';

export class ProductRepository extends BaseRepository<Product> {
  protected tableName = 'products';

  constructor() {
    super('ProductRepository');
  }

  /**
   * Get all products with optional filters
   */
  getAll(filters?: ProductFilters, limit = 100, offset = 0): ProductWithCategory[] {
    try {
      let sql = `
        SELECT p.*, c.name as category_name, c.color as category_color
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE 1=1
      `;
      const params: unknown[] = [];

      if (filters?.search) {
        sql += ` AND (p.name LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ?)`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (filters?.category_id) {
        sql += ` AND p.category_id = ?`;
        params.push(filters.category_id);
      }

      if (filters?.is_active !== undefined) {
        sql += ` AND p.is_active = ?`;
        params.push(filters.is_active ? 1 : 0);
      }

      if (filters?.low_stock) {
        sql += ` AND p.stock_quantity <= p.min_stock_level`;
      }

      sql += ` ORDER BY p.name ASC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const results = this.query<Product & { category_name?: string; category_color?: string }>(
        sql,
        params
      );

      return results.map(row => {
        const { category_name, category_color, ...product } = row;
        return {
          ...product,
          category: category_name
            ? {
                id: product.category_id!,
                name: category_name,
                color: category_color,
              }
            : undefined,
        } as ProductWithCategory;
      });
    } catch (error) {
      this.logger.error('Failed to get all products:', error);
      throw error;
    }
  }

  /**
   * Get product by barcode
   */
  getByBarcode(barcode: string): Product | null {
    return this.findOne('barcode = ?', [barcode]);
  }

  /**
   * Get product by SKU
   */
  getBySku(sku: string): Product | null {
    return this.findOne('sku = ?', [sku]);
  }

  /**
   * Create new product
   */
  create(input: CreateProductInput): Product {
    const now = new Date().toISOString();
    const price_ttc = input.price_ht * (1 + (input.tax_rate || 0.20));

    const product = {
      id: uuidv4(),
      name: input.name,
      description: input.description || null,
      sku: input.sku || null,
      barcode: input.barcode || null,
      category_id: input.category_id || null,
      price_ht: input.price_ht,
      tax_rate: input.tax_rate || 0.20,
      price_ttc,
      cost_price: input.cost_price || null,
      stock_quantity: input.stock_quantity || 0,
      min_stock_level: input.min_stock_level || 0,
      unit: input.unit || 'unit',
      image_url: input.image_url || null,
      is_active: input.is_active !== undefined ? (input.is_active ? 1 : 0) : 1,
      created_at: now,
      updated_at: now,
    };

    return this.insert(product);
  }

  /**
   * Update product
   */
  updateProduct(id: string, input: UpdateProductInput): Product {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.sku !== undefined) updates.sku = input.sku;
    if (input.barcode !== undefined) updates.barcode = input.barcode;
    if (input.category_id !== undefined) updates.category_id = input.category_id;
    if (input.price_ht !== undefined) {
      updates.price_ht = input.price_ht;
      const taxRate = input.tax_rate !== undefined ? input.tax_rate : 0.20;
      updates.price_ttc = input.price_ht * (1 + taxRate);
    }
    if (input.tax_rate !== undefined) {
      updates.tax_rate = input.tax_rate;
      const current = this.findById(id);
      if (current) {
        updates.price_ttc = current.price_ht * (1 + input.tax_rate);
      }
    }
    if (input.cost_price !== undefined) updates.cost_price = input.cost_price;
    if (input.stock_quantity !== undefined) updates.stock_quantity = input.stock_quantity;
    if (input.min_stock_level !== undefined) updates.min_stock_level = input.min_stock_level;
    if (input.unit !== undefined) updates.unit = input.unit;
    if (input.image_url !== undefined) updates.image_url = input.image_url;
    if (input.is_active !== undefined) updates.is_active = input.is_active ? 1 : 0;

    return this.update(id, updates);
  }

  /**
   * Update stock quantity
   */
  updateStock(id: string, quantity: number): Product {
    const product = this.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }

    const newQuantity = product.stock_quantity + quantity;
    if (newQuantity < 0) {
      throw new Error('Insufficient stock');
    }

    return this.update(id, {
      stock_quantity: newQuantity,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Search products
   */
  search(query: string, limit = 20): ProductWithCategory[] {
    return this.getAll({ search: query }, limit, 0);
  }

  /**
   * Count products with filters
   */
  countWithFilters(filters?: ProductFilters): number {
    let sql = 'SELECT COUNT(*) as count FROM products WHERE 1=1';
    const params: unknown[] = [];

    if (filters?.search) {
      sql += ` AND (name LIKE ? OR barcode LIKE ? OR sku LIKE ?)`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (filters?.category_id) {
      sql += ` AND category_id = ?`;
      params.push(filters.category_id);
    }

    if (filters?.is_active !== undefined) {
      sql += ` AND is_active = ?`;
      params.push(filters.is_active ? 1 : 0);
    }

    if (filters?.low_stock) {
      sql += ` AND stock_quantity <= min_stock_level`;
    }

    const result = this.db.prepare(sql).get(...params) as { count: number };
    return result.count;
  }
}
