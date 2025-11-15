import { ProductRepository } from '../repositories/product.repository';
import { StockMovementRepository } from '../repositories/stock-movement.repository';
import {
  Product,
  ProductWithCategory,
  CreateProductInput,
  UpdateProductInput,
  ProductFilters,
} from '@shared/types/models';
import { Logger } from '../utils/logger';
import { PaginationResponse } from '../ipc/contracts';

export class ProductService {
  private productRepo: ProductRepository;
  private stockRepo: StockMovementRepository;
  private logger: Logger;

  constructor() {
    this.productRepo = new ProductRepository();
    this.stockRepo = new StockMovementRepository();
    this.logger = new Logger('ProductService');
  }

  /**
   * Get all products with pagination
   */
  async getAll(
    filters?: ProductFilters,
    page = 1,
    limit = 20
  ): Promise<PaginationResponse<ProductWithCategory>> {
    const offset = (page - 1) * limit;
    const items = this.productRepo.getAll(filters, limit, offset);
    const total = this.productRepo.countWithFilters(filters);
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get product by ID
   */
  async getById(id: string): Promise<Product | null> {
    return this.productRepo.findById(id);
  }

  /**
   * Get product by barcode
   */
  async getByBarcode(barcode: string): Promise<Product | null> {
    return this.productRepo.getByBarcode(barcode);
  }

  /**
   * Create product
   */
  async create(input: CreateProductInput): Promise<Product> {
    // Validate barcode uniqueness
    if (input.barcode) {
      const existing = this.productRepo.getByBarcode(input.barcode);
      if (existing) {
        throw new Error('Un produit avec ce code-barres existe déjà');
      }
    }

    // Validate SKU uniqueness
    if (input.sku) {
      const existing = this.productRepo.getBySku(input.sku);
      if (existing) {
        throw new Error('Un produit avec ce SKU existe déjà');
      }
    }

    const product = this.productRepo.create(input);
    this.logger.info(`Product created: ${product.id} - ${product.name}`);

    return product;
  }

  /**
   * Update product
   */
  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const existing = this.productRepo.findById(id);
    if (!existing) {
      throw new Error('Produit non trouvé');
    }

    // Validate barcode uniqueness if changed
    if (input.barcode && input.barcode !== existing.barcode) {
      const duplicate = this.productRepo.getByBarcode(input.barcode);
      if (duplicate && duplicate.id !== id) {
        throw new Error('Un produit avec ce code-barres existe déjà');
      }
    }

    // Validate SKU uniqueness if changed
    if (input.sku && input.sku !== existing.sku) {
      const duplicate = this.productRepo.getBySku(input.sku);
      if (duplicate && duplicate.id !== id) {
        throw new Error('Un produit avec ce SKU existe déjà');
      }
    }

    const product = this.productRepo.updateProduct(id, input);
    this.logger.info(`Product updated: ${product.id} - ${product.name}`);

    return product;
  }

  /**
   * Delete product
   */
  async delete(id: string): Promise<boolean> {
    const product = this.productRepo.findById(id);
    if (!product) {
      throw new Error('Produit non trouvé');
    }

    const deleted = this.productRepo.delete(id);
    if (deleted) {
      this.logger.info(`Product deleted: ${id}`);
    }

    return deleted;
  }

  /**
   * Search products
   */
  async search(query: string, limit = 20): Promise<ProductWithCategory[]> {
    return this.productRepo.search(query, limit);
  }

  /**
   * Update stock quantity
   */
  async updateStock(
    productId: string,
    quantity: number,
    userId: string,
    notes?: string
  ): Promise<Product> {
    const product = await this.productRepo.updateStock(productId, quantity);

    // Record stock movement
    await this.stockRepo.createMovement({
      product_id: productId,
      type: quantity > 0 ? 'in' : 'out',
      quantity: Math.abs(quantity),
      reference: 'MANUAL_ADJUSTMENT',
      notes,
    }, userId);

    this.logger.info(`Stock updated for product ${productId}: ${quantity}`);

    return product;
  }

  /**
   * Check low stock products
   */
  async getLowStockProducts(): Promise<ProductWithCategory[]> {
    return this.productRepo.getAll({ low_stock: true }, 100, 0);
  }
}
