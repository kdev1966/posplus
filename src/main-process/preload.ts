import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import type { IPCApi } from '@shared/types'

// Expose protected methods via contextBridge
const api: IPCApi = {
  // Auth
  login: (credentials) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, credentials),
  logout: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT),
  checkAuth: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_CHECK),
  changePassword: (oldPassword, newPassword) =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTH_CHANGE_PASSWORD, oldPassword, newPassword),

  // Users
  getAllUsers: () => ipcRenderer.invoke(IPC_CHANNELS.USER_GET_ALL),
  getUserById: (id) => ipcRenderer.invoke(IPC_CHANNELS.USER_GET_BY_ID, id),
  createUser: (data) => ipcRenderer.invoke(IPC_CHANNELS.USER_CREATE, data),
  updateUser: (data) => ipcRenderer.invoke(IPC_CHANNELS.USER_UPDATE, data),
  deleteUser: (id) => ipcRenderer.invoke(IPC_CHANNELS.USER_DELETE, id),

  // Products
  getAllProducts: () => ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_GET_ALL),
  getProductById: (id) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_GET_BY_ID, id),
  getProductByBarcode: (barcode) =>
    ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_GET_BY_BARCODE, barcode),
  searchProducts: (query) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_SEARCH, query),
  createProduct: (data) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_CREATE, data),
  updateProduct: (data) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_UPDATE, data),
  deleteProduct: (id) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_DELETE, id),

  // Categories
  getAllCategories: () => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_GET_ALL),
  getCategoryById: (id) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_GET_BY_ID, id),
  createCategory: (data) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_CREATE, data),
  updateCategory: (data) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_UPDATE, data),
  deleteCategory: (id) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_DELETE, id),

  // Tickets
  createTicket: (data) => ipcRenderer.invoke(IPC_CHANNELS.TICKET_CREATE, data),
  getTicketById: (id) => ipcRenderer.invoke(IPC_CHANNELS.TICKET_GET_BY_ID, id),
  getAllTickets: (filters) => ipcRenderer.invoke(IPC_CHANNELS.TICKET_GET_ALL, filters),
  getTicketsBySession: (sessionId) =>
    ipcRenderer.invoke(IPC_CHANNELS.TICKET_GET_BY_SESSION, sessionId),
  cancelTicket: (id, reason) => ipcRenderer.invoke(IPC_CHANNELS.TICKET_CANCEL, id, reason),
  refundTicket: (id, reason) => ipcRenderer.invoke(IPC_CHANNELS.TICKET_REFUND, id, reason),

  // Cash Session
  openSession: (userId, openingCash) =>
    ipcRenderer.invoke(IPC_CHANNELS.SESSION_OPEN, userId, openingCash),
  closeSession: (sessionId, closingCash) =>
    ipcRenderer.invoke(IPC_CHANNELS.SESSION_CLOSE, sessionId, closingCash),
  getCurrentSession: () => ipcRenderer.invoke(IPC_CHANNELS.SESSION_GET_CURRENT),
  getSessionById: (id) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_GET_BY_ID, id),

  // Reports
  generateZReport: (sessionId) => ipcRenderer.invoke(IPC_CHANNELS.REPORT_Z, sessionId),
  getSalesReport: (startDate, endDate) =>
    ipcRenderer.invoke(IPC_CHANNELS.REPORT_SALES, startDate, endDate),
  getStockReport: () => ipcRenderer.invoke(IPC_CHANNELS.REPORT_STOCK),

  // Stock
  adjustStock: (productId, quantity, type, notes) =>
    ipcRenderer.invoke(IPC_CHANNELS.STOCK_ADJUST, productId, quantity, type, notes),
  getStockLogs: (productId) => ipcRenderer.invoke(IPC_CHANNELS.STOCK_GET_LOGS, productId),

  // Printer
  printTicket: (ticketId) => ipcRenderer.invoke(IPC_CHANNELS.PRINTER_PRINT_TICKET, ticketId),
  openDrawer: () => ipcRenderer.invoke(IPC_CHANNELS.PRINTER_OPEN_DRAWER),
  getPrinterStatus: () => ipcRenderer.invoke(IPC_CHANNELS.PRINTER_GET_STATUS),

  // Sync
  startSync: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC_START),
  getSyncStatus: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC_GET_STATUS),
  exportData: (startDate, endDate) =>
    ipcRenderer.invoke(IPC_CHANNELS.SYNC_EXPORT, startDate, endDate),

  // System
  getSystemInfo: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_INFO),
  getSystemLogs: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_LOGS),
}

// Expose API to window
contextBridge.exposeInMainWorld('api', api)

// Also expose electron marker so renderer knows we're in Electron
contextBridge.exposeInMainWorld('electron', { isElectron: true })

console.log('[PRELOAD] Preload script loaded successfully - Electron APIs exposed')
