import {
  Product,
  ProductWithCategory,
  CreateProductInput,
  UpdateProductInput,
  ProductFilters,
} from '@shared/types/models';
import { IPCContract, PaginationRequest, PaginationResponse } from './base.contract';

export const ProductContracts = {
  GetAll: {
    channel: 'product:getAll',
  } as IPCContract<
    { filters?: ProductFilters } & PaginationRequest,
    PaginationResponse<ProductWithCategory>
  >,

  GetById: {
    channel: 'product:getById',
  } as IPCContract<{ id: string }, Product | null>,

  GetByBarcode: {
    channel: 'product:getByBarcode',
  } as IPCContract<{ barcode: string }, Product | null>,

  Create: {
    channel: 'product:create',
  } as IPCContract<CreateProductInput, Product>,

  Update: {
    channel: 'product:update',
  } as IPCContract<{ id: string; data: UpdateProductInput }, Product>,

  Delete: {
    channel: 'product:delete',
  } as IPCContract<{ id: string }, boolean>,

  Search: {
    channel: 'product:search',
  } as IPCContract<{ query: string; limit?: number }, ProductWithCategory[]>,

  UpdateStock: {
    channel: 'product:updateStock',
  } as IPCContract<{ id: string; quantity: number; notes?: string }, Product>,

  ImportFromCSV: {
    channel: 'product:importFromCSV',
  } as IPCContract<{ filePath: string }, { success: number; failed: number }>,

  ExportToCSV: {
    channel: 'product:exportToCSV',
  } as IPCContract<{ filters?: ProductFilters }, string>,
};
