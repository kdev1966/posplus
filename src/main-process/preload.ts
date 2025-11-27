import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, StockLog, CreateProductDTO, UpdateProductDTO, CreateTicketDTO, UpdateStoreSettingsDTO } from '@shared/types'
import type { IPCApi } from '@shared/types'

// Expose protected methods via contextBridge
const api: IPCApi = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, credentials),
  logout: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT),
  checkAuth: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_CHECK),
  changePassword: (oldPassword: string, newPassword: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTH_CHANGE_PASSWORD, oldPassword, newPassword),

  // Users
  getAllUsers: () => ipcRenderer.invoke(IPC_CHANNELS.USER_GET_ALL),
  getUserById: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.USER_GET_BY_ID, id),
  createUser: (data: { username: string; password: string; roleId: number }) =>
    ipcRenderer.invoke(IPC_CHANNELS.USER_CREATE, data),
  updateUser: (data: { id: number; username?: string; password?: string; roleId?: number }) =>
    ipcRenderer.invoke(IPC_CHANNELS.USER_UPDATE, data),
  deleteUser: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.USER_DELETE, id),

  // Products
  getAllProducts: () => ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_GET_ALL),
  getProductById: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_GET_BY_ID, id),
  getProductByBarcode: (barcode: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_GET_BY_BARCODE, barcode),
  searchProducts: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_SEARCH, query),
  createProduct: (data: CreateProductDTO) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_CREATE, data),
  updateProduct: (data: UpdateProductDTO) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_UPDATE, data),
  deleteProduct: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_DELETE, id),

  // Categories
  getAllCategories: () => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_GET_ALL),
  getCategoryById: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_GET_BY_ID, id),
  createCategory: (data: { name: string; description?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_CREATE, data),
  updateCategory: (data: { id: number; name?: string; description?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_UPDATE, data),
  deleteCategory: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_DELETE, id),

  // Tickets
  createTicket: (data: CreateTicketDTO) => ipcRenderer.invoke(IPC_CHANNELS.TICKET_CREATE, data),
  getTicketById: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.TICKET_GET_BY_ID, id),
  getAllTickets: (filters?: { startDate?: string; endDate?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.TICKET_GET_ALL, filters),
  getTicketsBySession: (sessionId: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.TICKET_GET_BY_SESSION, sessionId),
  updateTicket: (id: number, data: Record<string, unknown>) =>
    ipcRenderer.invoke(IPC_CHANNELS.TICKET_UPDATE, id, data),
  cancelTicket: (id: number, reason: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.TICKET_CANCEL, id, reason),
  refundTicket: (id: number, reason: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.TICKET_REFUND, id, reason),
  partialRefundTicket: (id: number, lines: Array<{ lineId: number; quantity: number }>, reason: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.TICKET_PARTIAL_REFUND, id, lines, reason),

  // Cash Session
  openSession: (userId: number, openingCash: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.SESSION_OPEN, userId, openingCash),
  closeSession: (sessionId: number, closingCash: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.SESSION_CLOSE, sessionId, closingCash),
  getCurrentSession: () => ipcRenderer.invoke(IPC_CHANNELS.SESSION_GET_CURRENT),
  getSessionById: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_GET_BY_ID, id),
  getSessionStats: (sessionId: number) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_GET_STATS, sessionId),

  // Reports
  generateZReport: (sessionId: number) => ipcRenderer.invoke(IPC_CHANNELS.REPORT_Z, sessionId),
  getSalesReport: (startDate: string, endDate: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.REPORT_SALES, startDate, endDate),
  getStockReport: () => ipcRenderer.invoke(IPC_CHANNELS.REPORT_STOCK),

  // Stock
  adjustStock: (productId: number, quantity: number, type: StockLog['type'], notes?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.STOCK_ADJUST, productId, quantity, type, notes),
  getStockLogs: (productId?: number) => ipcRenderer.invoke(IPC_CHANNELS.STOCK_GET_LOGS, productId),

  // Printer
  printTicket: (ticketId: number, language?: 'fr' | 'ar') =>
    ipcRenderer.invoke(IPC_CHANNELS.PRINTER_PRINT_TICKET, ticketId, language),
  printTestTicket: () => ipcRenderer.invoke(IPC_CHANNELS.PRINTER_PRINT_TEST),
  getTestTicketPreview: () => ipcRenderer.invoke(IPC_CHANNELS.PRINTER_GET_TEST_PREVIEW),
  getTicketPreview: (ticketId: number, language?: 'fr' | 'ar') =>
    ipcRenderer.invoke(IPC_CHANNELS.PRINTER_GET_TICKET_PREVIEW, ticketId, language),
  getZReportPreview: (sessionId: number, language?: 'fr' | 'ar') =>
    ipcRenderer.invoke(IPC_CHANNELS.PRINTER_GET_ZREPORT_PREVIEW, sessionId, language),
  printZReport: (sessionId: number, language?: 'fr' | 'ar') =>
    ipcRenderer.invoke(IPC_CHANNELS.PRINTER_PRINT_ZREPORT, sessionId, language),
  openDrawer: () => ipcRenderer.invoke(IPC_CHANNELS.PRINTER_OPEN_DRAWER),
  getPrinterStatus: () => ipcRenderer.invoke(IPC_CHANNELS.PRINTER_GET_STATUS),
  getPrinterConfig: () => ipcRenderer.invoke(IPC_CHANNELS.PRINTER_GET_CONFIG),
  setPrinterConfig: (cfg: { printerName: string; port: string; type?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.PRINTER_SET_CONFIG, cfg),
  reconnectPrinter: () => ipcRenderer.invoke(IPC_CHANNELS.PRINTER_RECONNECT),

  // Sync
  startSync: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC_START),
  getSyncStatus: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC_GET_STATUS),
  exportData: (startDate: string, endDate: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SYNC_EXPORT, startDate, endDate),

  // System
  getSystemInfo: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_INFO),
  getSystemLogs: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_LOGS),

  // Backup & Restore
  createBackup: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_CREATE),
  restoreBackup: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_RESTORE),
  getBackupInfo: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_GET_INFO),

  // CSV Import/Export
  generateExcelTemplate: () => ipcRenderer.invoke(IPC_CHANNELS.EXCEL_GENERATE_TEMPLATE),
  exportToExcel: () => ipcRenderer.invoke(IPC_CHANNELS.EXCEL_EXPORT_DATA),
  importFromExcel: () => ipcRenderer.invoke(IPC_CHANNELS.EXCEL_IMPORT_DATA),

  // Application
  quitApp: () => ipcRenderer.invoke(IPC_CHANNELS.APP_QUIT),

  // P2P Sync
  getP2PStatus: () => ipcRenderer.invoke(IPC_CHANNELS.P2P_GET_STATUS),
  reconnectP2P: () => ipcRenderer.invoke(IPC_CHANNELS.P2P_RECONNECT),
  toggleP2P: (enabled: boolean) => ipcRenderer.invoke(IPC_CHANNELS.P2P_TOGGLE, enabled),
  syncP2PNow: () => ipcRenderer.invoke(IPC_CHANNELS.P2P_SYNC_NOW),

  // Store Settings
  getStoreSettings: () => ipcRenderer.invoke(IPC_CHANNELS.STORE_SETTINGS_GET),
  updateStoreSettings: (data: UpdateStoreSettingsDTO) =>
    ipcRenderer.invoke(IPC_CHANNELS.STORE_SETTINGS_UPDATE, data),
}

// Expose API to window
contextBridge.exposeInMainWorld('api', api)

// Also expose electron marker and IPC renderer for customer display
contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  ipcRenderer: {
    on: (channel: string, func: (...args: any[]) => void) => {
      // Only allow specific channels for security
      const validChannels = [
        'customer-cart-updated',
        'customer-payment-complete',
        'customer-language-changed',
        'p2p-data-synced',
      ]
      if (validChannels.includes(channel)) {
        const subscription = (_event: any, ...args: any[]) => func(...args)
        ipcRenderer.on(channel, subscription)
        // Return unsubscribe function
        return () => {
          ipcRenderer.removeListener(channel, subscription)
        }
      }
      return () => {}
    },
    send: (channel: string, ...args: any[]) => {
      // Only allow specific channels for security
      const validChannels = [
        'update-customer-display',
        'customer-payment-complete',
        'customer-language-change',
      ]
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, ...args)
      }
    },
  },
})

console.log('[PRELOAD] Preload script loaded successfully - Electron APIs exposed')
