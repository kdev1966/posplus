import { SaleRepository } from '../repositories/sale.repository';
import { ProductRepository } from '../repositories/product.repository';
import { StockMovementRepository } from '../repositories/stock-movement.repository';
import {
  SaleWithItems,
  CreateSaleInput,
  SaleFilters,
  SalesSummary,
} from '@shared/types/models';
import { Logger } from '../utils/logger';
import { PaginationResponse } from '../ipc/contracts';
import { PaymentMethod } from '@shared/types/enums';

export class SaleService {
  private saleRepo: SaleRepository;
  private productRepo: ProductRepository;
  private stockRepo: StockMovementRepository;
  private logger: Logger;

  constructor() {
    this.saleRepo = new SaleRepository();
    this.productRepo = new ProductRepository();
    this.stockRepo = new StockMovementRepository();
    this.logger = new Logger('SaleService');
  }

  /**
   * Get all sales with pagination
   */
  async getAll(
    filters?: SaleFilters,
    page = 1,
    limit = 20
  ): Promise<PaginationResponse<SaleWithItems>> {
    const offset = (page - 1) * limit;
    const items = this.saleRepo.getAll(filters, limit, offset);
    const total = this.saleRepo.countWithFilters(filters);
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
   * Get sale by ID
   */
  async getById(id: string): Promise<SaleWithItems | null> {
    return this.saleRepo.getByIdWithItems(id);
  }

  /**
   * Create sale
   */
  async create(input: CreateSaleInput, userId: string): Promise<SaleWithItems> {
    // Validate products and stock
    for (const item of input.items) {
      const product = this.productRepo.findById(item.product_id);
      if (!product) {
        throw new Error(`Produit non trouvé: ${item.product_id}`);
      }

      if (!product.is_active) {
        throw new Error(`Le produit "${product.name}" n'est pas actif`);
      }

      if (product.stock_quantity < item.quantity) {
        throw new Error(
          `Stock insuffisant pour "${product.name}". Disponible: ${product.stock_quantity}, Demandé: ${item.quantity}`
        );
      }

      // Fill in product details
      item.unit_price_ht = product.price_ht;
      item.tax_rate = product.tax_rate;
    }

    // Create sale with items
    const sale = this.saleRepo.createWithItems(input, userId);

    // Update stock and create movements
    for (let i = 0; i < sale.items.length; i++) {
      const item = sale.items[i];
      const product = this.productRepo.findById(item.product_id);

      if (product) {
        // Update product name and SKU in sale item
        const updateSql = `
          UPDATE sale_items
          SET product_name = ?, product_sku = ?
          WHERE id = ?
        `;
        this.saleRepo['execute'](updateSql, [product.name, product.sku, item.id]);

        // Update stock
        await this.productRepo.updateStock(item.product_id, -item.quantity);

        // Record stock movement
        await this.stockRepo.createMovement(
          {
            product_id: item.product_id,
            type: 'sale',
            quantity: item.quantity,
            reference: sale.sale_number,
            notes: `Vente ${sale.sale_number}`,
          },
          userId
        );
      }
    }

    this.logger.info(`Sale created: ${sale.sale_number} - Total: ${sale.total_ttc}€`);

    return this.saleRepo.getByIdWithItems(sale.id)!;
  }

  /**
   * Get daily sales
   */
  async getDailySales(date?: string): Promise<SaleWithItems[]> {
    return this.saleRepo.getDailySales(date);
  }

  /**
   * Get sales summary
   */
  async getSummary(filters?: SaleFilters): Promise<SalesSummary> {
    const sales = this.saleRepo.getAll(filters, 10000, 0);

    const summary: SalesSummary = {
      total_sales: sales.length,
      total_amount: 0,
      total_items: 0,
      average_sale: 0,
      by_payment_method: {
        [PaymentMethod.CASH]: 0,
        [PaymentMethod.CARD]: 0,
        [PaymentMethod.MOBILE]: 0,
        [PaymentMethod.OTHER]: 0,
      },
    };

    sales.forEach(sale => {
      summary.total_amount += sale.total_ttc;
      summary.total_items += sale.items.reduce((sum, item) => sum + item.quantity, 0);
      summary.by_payment_method[sale.payment_method] += sale.total_ttc;
    });

    summary.average_sale = summary.total_sales > 0 ? summary.total_amount / summary.total_sales : 0;

    return summary;
  }
}
