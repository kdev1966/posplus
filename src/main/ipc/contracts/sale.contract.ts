import {
  Sale,
  SaleWithItems,
  CreateSaleInput,
  SaleFilters,
  SalesSummary,
} from '@shared/types/models';
import { IPCContract, PaginationRequest, PaginationResponse } from './base.contract';

export const SaleContracts = {
  GetAll: {
    channel: 'sale:getAll',
  } as IPCContract<
    { filters?: SaleFilters } & PaginationRequest,
    PaginationResponse<SaleWithItems>
  >,

  GetById: {
    channel: 'sale:getById',
  } as IPCContract<{ id: string }, SaleWithItems | null>,

  Create: {
    channel: 'sale:create',
  } as IPCContract<CreateSaleInput, SaleWithItems>,

  Refund: {
    channel: 'sale:refund',
  } as IPCContract<{ id: string; reason?: string }, Sale>,

  GetSummary: {
    channel: 'sale:getSummary',
  } as IPCContract<{ filters?: SaleFilters }, SalesSummary>,

  GetDailySales: {
    channel: 'sale:getDailySales',
  } as IPCContract<{ date?: string }, SaleWithItems[]>,

  PrintReceipt: {
    channel: 'sale:printReceipt',
  } as IPCContract<{ id: string }, boolean>,
};
