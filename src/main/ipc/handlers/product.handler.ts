import { ProductService } from '../../services/product.service';
import { ProductContracts } from '../contracts';
import { createIPCHandler } from '../index';

const productService = new ProductService();

/**
 * Register product IPC handlers
 */
export function registerProductHandlers(): void {
  // Get all products
  createIPCHandler(
    ProductContracts.GetAll.channel,
    async (request: { filters?: any; page?: number; limit?: number }) => {
      return productService.getAll(request.filters, request.page, request.limit);
    }
  );

  // Get product by ID
  createIPCHandler(
    ProductContracts.GetById.channel,
    async (request: { id: string }) => {
      return productService.getById(request.id);
    }
  );

  // Get product by barcode
  createIPCHandler(
    ProductContracts.GetByBarcode.channel,
    async (request: { barcode: string }) => {
      return productService.getByBarcode(request.barcode);
    }
  );

  // Create product
  createIPCHandler(
    ProductContracts.Create.channel,
    async (request: any) => {
      return productService.create(request);
    }
  );

  // Update product
  createIPCHandler(
    ProductContracts.Update.channel,
    async (request: { id: string; data: any }) => {
      return productService.update(request.id, request.data);
    }
  );

  // Delete product
  createIPCHandler(
    ProductContracts.Delete.channel,
    async (request: { id: string }) => {
      return productService.delete(request.id);
    }
  );

  // Search products
  createIPCHandler(
    ProductContracts.Search.channel,
    async (request: { query: string; limit?: number }) => {
      return productService.search(request.query, request.limit);
    }
  );
}
