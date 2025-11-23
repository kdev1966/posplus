// ============================================================================
// SHARED TYPES - IPC Contracts
// ============================================================================

// ---------- Base Types ----------
export interface User {
  id: number
  username: string
  email: string
  firstName: string
  lastName: string
  roleId: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  permissions?: Permission[] | string // Can be array or JSON string from DB
  roleName?: string // Optional role name from joins
}

export interface Role {
  id: number
  name: string
  description: string
  permissions: Permission[]
}

export interface Permission {
  id: number
  resource: string
  action: 'create' | 'read' | 'update' | 'delete' | 'manage'
  description: string
}

export interface Category {
  id: number
  name: string
  description?: string
  parentId?: number
  displayOrder?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: number
  sku: string
  barcode?: string
  name: string
  description?: string
  categoryId: number
  price: number
  cost: number
  discountRate: number
  stock: number
  minStock: number
  maxStock: number
  unit: string
  isActive: boolean
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Ticket {
  id: number
  ticketNumber: string
  userId: number
  customerId?: number
  subtotal: number
  discountAmount: number
  totalAmount: number
  status: 'pending' | 'completed' | 'cancelled' | 'refunded'
  sessionId: number
  createdAt: string
  updatedAt: string
  lines: TicketLine[]
  payments: Payment[]
}

export interface TicketLine {
  id: number
  ticketId: number
  productId: number
  productName: string
  productSku: string
  quantity: number
  unitPrice: number
  discountRate: number
  discountAmount: number
  totalAmount: number
  createdAt: string
}

export interface Payment {
  id: number
  ticketId: number
  method: 'cash' | 'card' | 'transfer' | 'check' | 'other'
  amount: number
  reference?: string
  createdAt: string
}

export interface CashSession {
  id: number
  userId: number
  openingCash: number
  closingCash?: number
  expectedCash?: number
  difference?: number
  startedAt: string
  closedAt?: string
  status: 'open' | 'closed'
}

export interface ZReport {
  id: number
  sessionId: number
  userId: number
  totalSales: number
  totalDiscount: number
  totalCash: number
  totalCard: number
  totalOther: number
  ticketCount: number
  reportDate: string
  createdAt: string
}

export interface StockLog {
  id: number
  productId: number
  type: 'in' | 'out' | 'adjustment' | 'sale' | 'return'
  quantity: number
  reference?: string
  userId: number
  notes?: string
  createdAt: string
}

// ---------- DTO Types ----------
export interface CreateUserDTO {
  username: string
  email: string
  password: string
  firstName: string
  lastName: string
  roleId: number
}

export interface UpdateUserDTO {
  id: number
  username?: string
  email?: string
  firstName?: string
  lastName?: string
  roleId?: number
  isActive?: boolean
}

export interface CreateProductDTO {
  sku: string
  barcode?: string
  name: string
  description?: string
  categoryId: number
  price: number
  cost: number
  discountRate: number
  stock: number
  minStock: number
  maxStock?: number
  unit: string
  imageUrl?: string
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {
  id: number
}

export interface CreateTicketDTO {
  userId: number
  customerId?: number
  sessionId: number
  lines: {
    productId: number
    quantity: number
    unitPrice: number
    discountAmount?: number
  }[]
  payments: {
    method: Payment['method']
    amount: number
    reference?: string
  }[]
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthResponse {
  success: boolean
  user?: User
  token?: string
  error?: string
}

// ---------- IPC Channel Names ----------
export const IPC_CHANNELS = {
  // Auth
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_CHECK: 'auth:check',
  AUTH_CHANGE_PASSWORD: 'auth:change-password',

  // Users
  USER_GET_ALL: 'user:get-all',
  USER_GET_BY_ID: 'user:get-by-id',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',

  // Products
  PRODUCT_GET_ALL: 'product:get-all',
  PRODUCT_GET_BY_ID: 'product:get-by-id',
  PRODUCT_GET_BY_BARCODE: 'product:get-by-barcode',
  PRODUCT_SEARCH: 'product:search',
  PRODUCT_CREATE: 'product:create',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_DELETE: 'product:delete',

  // Categories
  CATEGORY_GET_ALL: 'category:get-all',
  CATEGORY_GET_BY_ID: 'category:get-by-id',
  CATEGORY_CREATE: 'category:create',
  CATEGORY_UPDATE: 'category:update',
  CATEGORY_DELETE: 'category:delete',

  // Tickets
  TICKET_CREATE: 'ticket:create',
  TICKET_GET_BY_ID: 'ticket:get-by-id',
  TICKET_GET_ALL: 'ticket:get-all',
  TICKET_GET_BY_SESSION: 'ticket:get-by-session',
  TICKET_UPDATE: 'ticket:update',
  TICKET_CANCEL: 'ticket:cancel',
  TICKET_REFUND: 'ticket:refund',

  // Cash Session
  SESSION_OPEN: 'session:open',
  SESSION_CLOSE: 'session:close',
  SESSION_GET_CURRENT: 'session:get-current',
  SESSION_GET_BY_ID: 'session:get-by-id',
  SESSION_GET_STATS: 'session:get-stats',

  // Reports
  REPORT_Z: 'report:z',
  REPORT_SALES: 'report:sales',
  REPORT_STOCK: 'report:stock',

  // Stock
  STOCK_ADJUST: 'stock:adjust',
  STOCK_GET_LOGS: 'stock:get-logs',

  // Printer
  PRINTER_PRINT_TICKET: 'printer:print-ticket',
  PRINTER_PRINT_TEST: 'printer:print-test',
  PRINTER_OPEN_DRAWER: 'printer:open-drawer',
  PRINTER_GET_CONFIG: 'printer:get-config',
  PRINTER_SET_CONFIG: 'printer:set-config',
  PRINTER_RECONNECT: 'printer:reconnect',
  PRINTER_GET_STATUS: 'printer:get-status',

  // Sync
  SYNC_START: 'sync:start',
  SYNC_GET_STATUS: 'sync:get-status',
  SYNC_EXPORT: 'sync:export',

  // System
  SYSTEM_GET_INFO: 'system:get-info',
  SYSTEM_GET_LOGS: 'system:get-logs',

  // Maintenance
  MAINTENANCE_REPAIR_PAYMENTS: 'maintenance:repair-payments',
  MAINTENANCE_CHECK_PAYMENTS: 'maintenance:check-payments',

  // Backup & Restore
  BACKUP_CREATE: 'backup:create',
  BACKUP_RESTORE: 'backup:restore',
  BACKUP_GET_INFO: 'backup:get-info',

  // Excel Import/Export
  EXCEL_GENERATE_TEMPLATE: 'excel:generate-template',
  EXCEL_EXPORT_DATA: 'excel:export-data',
  EXCEL_IMPORT_DATA: 'excel:import-data',

  // Application
  APP_QUIT: 'app:quit',

  // P2P Sync
  P2P_GET_STATUS: 'p2p:get-status',
  P2P_GET_DETAILED_STATS: 'p2p:get-detailed-stats',
  P2P_GET_SYNC_LOGS: 'p2p:get-sync-logs',
  P2P_GET_CONFLICTS: 'p2p:get-conflicts',
  P2P_GET_CONNECTION_METRICS: 'p2p:get-connection-metrics',
  P2P_SYNC_NOW: 'p2p:sync-now',
  P2P_RECONNECT: 'p2p:reconnect',
  P2P_TOGGLE: 'p2p:toggle',
} as const

// ---------- IPC API Interface ----------
export interface IPCApi {
  // Auth
  login: (credentials: LoginCredentials) => Promise<AuthResponse>
  logout: () => Promise<void>
  checkAuth: () => Promise<AuthResponse>
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>

  // Users
  getAllUsers: () => Promise<User[]>
  getUserById: (id: number) => Promise<User | null>
  createUser: (data: CreateUserDTO) => Promise<User>
  updateUser: (data: UpdateUserDTO) => Promise<User>
  deleteUser: (id: number) => Promise<boolean>

  // Products
  getAllProducts: () => Promise<Product[]>
  getProductById: (id: number) => Promise<Product | null>
  getProductByBarcode: (barcode: string) => Promise<Product | null>
  searchProducts: (query: string) => Promise<Product[]>
  createProduct: (data: CreateProductDTO) => Promise<Product>
  updateProduct: (data: UpdateProductDTO) => Promise<Product>
  deleteProduct: (id: number) => Promise<boolean>

  // Categories
  getAllCategories: () => Promise<Category[]>
  getCategoryById: (id: number) => Promise<Category | null>
  createCategory: (data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Category>
  updateCategory: (data: Partial<Category> & { id: number }) => Promise<Category>
  deleteCategory: (id: number) => Promise<boolean>

  // Tickets
  createTicket: (data: CreateTicketDTO) => Promise<Ticket>
  getTicketById: (id: number) => Promise<Ticket | null>
  getAllTickets: (filters?: { startDate?: string; endDate?: string }) => Promise<Ticket[]>
  getTicketsBySession: (sessionId: number) => Promise<Ticket[]>
  updateTicket: (id: number, data: any) => Promise<Ticket>
  cancelTicket: (id: number, reason: string) => Promise<boolean>
  refundTicket: (id: number, reason: string) => Promise<boolean>

  // Cash Session
  openSession: (userId: number, openingCash: number) => Promise<CashSession>
  closeSession: (sessionId: number, closingCash: number) => Promise<CashSession>
  getCurrentSession: () => Promise<CashSession | null>
  getSessionById: (id: number) => Promise<CashSession | null>
  getSessionStats: (sessionId: number) => Promise<any>

  // Reports
  generateZReport: (sessionId: number) => Promise<ZReport>
  getSalesReport: (startDate: string, endDate: string) => Promise<any>
  getStockReport: () => Promise<any>

  // Stock
  adjustStock: (productId: number, quantity: number, type: StockLog['type'], notes?: string) => Promise<boolean>
  getStockLogs: (productId?: number) => Promise<StockLog[]>

  // Printer
  printTicket: (ticketId: number) => Promise<boolean>
  printTestTicket: () => Promise<boolean>
  openDrawer: () => Promise<boolean>
  getPrinterStatus: () => Promise<{ connected: boolean; ready: boolean; error?: string }>
  getPrinterConfig: () => Promise<{ printerName: string; port: string; type?: string }>
  setPrinterConfig: (cfg: { printerName: string; port: string; type?: string }) => Promise<boolean>
  reconnectPrinter: () => Promise<boolean>

  // Sync
  startSync: () => Promise<boolean>
  getSyncStatus: () => Promise<{ lastSync?: string; status: string }>
  exportData: (startDate: string, endDate: string) => Promise<string>

  // System
  getSystemInfo: () => Promise<any>
  getSystemLogs: () => Promise<string[]>

  // Maintenance
  repairTicketPayments: (ticketId?: number) => Promise<{ fixed: number; errors: string[] }>
  checkTicketPayments: () => Promise<Array<{
    ticketId: number
    ticketNumber: string
    totalAmount: number
    totalPaid: number
    difference: number
  }>>

  // Backup & Restore
  createBackup: () => Promise<{ success: boolean; filePath?: string; error?: string }>
  restoreBackup: () => Promise<{ success: boolean; error?: string; needsRestart?: boolean }>
  getBackupInfo: () => Promise<{ path: string; size: number; exists: boolean }>

  // Excel Import/Export
  generateExcelTemplate: () => Promise<{ success: boolean; filePath?: string; error?: string }>
  exportToExcel: () => Promise<{ success: boolean; filePath?: string; error?: string }>
  importFromExcel: () => Promise<{
    success: boolean
    categoriesImported?: number
    productsImported?: number
    errors?: string[]
    error?: string
  }>

  // Application
  quitApp: () => Promise<void>

  // P2P Sync
  getP2PStatus: () => Promise<{
    serverRunning: boolean
    connectedPeers: number
    totalPeers: number
    enabled: boolean
    posId: string
    posName: string
    peers: Array<{
      id: string
      name: string
      address: string
      online: boolean
      lastSeen: Date
    }>
    error?: string
  }>
  reconnectP2P: () => Promise<{ success: boolean; error?: string }>
  toggleP2P: (enabled: boolean) => Promise<{ success: boolean; error?: string }>
  syncP2PNow: () => Promise<{ success: boolean; productsSynced: number; categoriesSynced: number; error?: string }>
}

// Expose API to window object
declare global {
  interface Window {
    api: IPCApi
  }
}
