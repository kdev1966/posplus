import { registerIPCHandlers } from './ipc';
import { Logger } from './utils/logger';

const logger = new Logger('App');

/**
 * Initialize application
 * Sets up IPC handlers, services, and other core functionality
 */
export async function initializeApp(): Promise<void> {
  try {
    // Register IPC handlers
    registerIPCHandlers();
    logger.info('IPC handlers registered');

    // Initialize other services if needed
    // e.g., Auto-updater, Hardware integrations, etc.

  } catch (error) {
    logger.error('Failed to initialize application:', error);
    throw error;
  }
}
