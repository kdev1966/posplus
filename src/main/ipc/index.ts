import { ipcMain } from 'electron';
import { registerProductHandlers } from './handlers/product.handler';
import { registerSaleHandlers } from './handlers/sale.handler';
import { registerUserHandlers } from './handlers/user.handler';
import { registerCategoryHandlers } from './handlers/category.handler';
import { Logger } from '../utils/logger';

const logger = new Logger('IPC');

/**
 * Register all IPC handlers
 */
export function registerIPCHandlers(): void {
  try {
    registerProductHandlers();
    registerSaleHandlers();
    registerUserHandlers();
    registerCategoryHandlers();

    logger.info('All IPC handlers registered successfully');
  } catch (error) {
    logger.error('Failed to register IPC handlers:', error);
    throw error;
  }
}

/**
 * Helper to create IPC handler with error handling
 */
export function createIPCHandler<TRequest, TResponse>(
  channel: string,
  handler: (request: TRequest) => Promise<TResponse>
): void {
  ipcMain.handle(channel, async (_event, request: TRequest) => {
    try {
      const response = await handler(request);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      logger.error(`IPC Handler error [${channel}]:`, error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'IPC_ERROR',
        },
      };
    }
  });
}
