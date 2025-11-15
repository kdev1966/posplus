import { SaleService } from '../../services/sale.service';
import { SaleContracts } from '../contracts';
import { createIPCHandler } from '../index';

const saleService = new SaleService();

/**
 * Register sale IPC handlers
 */
export function registerSaleHandlers(): void {
  // Get all sales
  createIPCHandler(
    SaleContracts.GetAll.channel,
    async (request: { filters?: any; page?: number; limit?: number }) => {
      return saleService.getAll(request.filters, request.page, request.limit);
    }
  );

  // Get sale by ID
  createIPCHandler(SaleContracts.GetById.channel, async (request: { id: string }) => {
    return saleService.getById(request.id);
  });

  // Create sale
  createIPCHandler(
    SaleContracts.Create.channel,
    async (request: { saleData: any; userId: string }) => {
      return saleService.create(request.saleData, request.userId);
    }
  );

  // Get daily sales
  createIPCHandler(SaleContracts.GetDailySales.channel, async (request: { date?: string }) => {
    return saleService.getDailySales(request.date);
  });

  // Get summary
  createIPCHandler(SaleContracts.GetSummary.channel, async (request: { filters?: any }) => {
    return saleService.getSummary(request.filters);
  });
}
