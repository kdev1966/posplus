import { app, BrowserWindow } from 'electron';
import path from 'path';
import { initializeApp } from './app';
import { createMainWindow } from './window/main-window';
import DatabaseConnection from './database/connection';
import { Logger } from './utils/logger';

const logger = new Logger('Main');

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

/**
 * Create main window
 */
const createWindow = (): void => {
  mainWindow = createMainWindow();
};

/**
 * App ready handler
 */
app.whenReady().then(async () => {
  try {
    logger.info('Application starting...');

    // Initialize database
    DatabaseConnection.getInstance();
    logger.info('Database initialized');

    // Initialize IPC handlers and services
    await initializeApp();
    logger.info('Application initialized');

    // Create main window
    createWindow();

    // Recreate window on macOS when dock icon is clicked
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });

    logger.info('Application started successfully');
  } catch (error) {
    logger.error('Failed to start application:', error);
    app.quit();
  }
});

/**
 * Quit when all windows are closed (except on macOS)
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Cleanup before quit
 */
app.on('before-quit', () => {
  logger.info('Application closing...');
  DatabaseConnection.close();
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});
