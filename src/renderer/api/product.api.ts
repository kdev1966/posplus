import {
  Product,
  ProductWithCategory,
  CreateProductInput,
  UpdateProductInput,
  ProductFilters,
} from '@shared/types/models';
import { PaginationResponse } from '../../main/ipc/contracts';
import { ipcClient } from './client';
import { ProductContracts } from '../../main/ipc/contracts/product.contract';

export const productAPI = {
  async getAll(
    filters?: ProductFilters,
    page = 1,
    limit = 20
  ): Promise<PaginationResponse<ProductWithCategory>> {
    return ipcClient.invoke(ProductContracts.GetAll.channel, { filters, page, limit });
  },

  async getById(id: string): Promise<Product | null> {
    return ipcClient.invoke(ProductContracts.GetById.channel, { id });
  },

  async getByBarcode(barcode: string): Promise<Product | null> {
    return ipcClient.invoke(ProductContracts.GetByBarcode.channel, { barcode });
  },

  async create(data: CreateProductInput): Promise<Product> {
    return ipcClient.invoke(ProductContracts.Create.channel, data);
  },

  async update(id: string, data: UpdateProductInput): Promise<Product> {
    return ipcClient.invoke(ProductContracts.Update.channel, { id, data });
  },

  async delete(id: string): Promise<boolean> {
    return ipcClient.invoke(ProductContracts.Delete.channel, { id });
  },

  async search(query: string, limit?: number): Promise<ProductWithCategory[]> {
    return ipcClient.invoke(ProductContracts.Search.channel, { query, limit });
  },
};
