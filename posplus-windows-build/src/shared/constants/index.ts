// ============================================================================
// SHARED CONSTANTS
// ============================================================================

export const APP_CONFIG = {
  APP_NAME: 'POSPlus',
  APP_VERSION: '1.0.0',
  DB_NAME: 'posplus.db',
  LOG_FILE: 'posplus.log',
} as const

export const PERMISSIONS = {
  // Users
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_MANAGE: 'user:manage',

  // Products
  PRODUCT_CREATE: 'product:create',
  PRODUCT_READ: 'product:read',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_DELETE: 'product:delete',
  PRODUCT_MANAGE: 'product:manage',

  // Categories
  CATEGORY_CREATE: 'category:create',
  CATEGORY_READ: 'category:read',
  CATEGORY_UPDATE: 'category:update',
  CATEGORY_DELETE: 'category:delete',
  CATEGORY_MANAGE: 'category:manage',

  // Tickets
  TICKET_CREATE: 'ticket:create',
  TICKET_READ: 'ticket:read',
  TICKET_UPDATE: 'ticket:update',
  TICKET_DELETE: 'ticket:delete',
  TICKET_REFUND: 'ticket:refund',
  TICKET_MANAGE: 'ticket:manage',

  // Cash Sessions
  SESSION_OPEN: 'session:open',
  SESSION_CLOSE: 'session:close',
  SESSION_READ: 'session:read',
  SESSION_MANAGE: 'session:manage',

  // Reports
  REPORT_VIEW: 'report:view',
  REPORT_EXPORT: 'report:export',
  REPORT_MANAGE: 'report:manage',

  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_MANAGE: 'settings:manage',

  // System
  SYSTEM_ADMIN: 'system:admin',
} as const

export const ROLE_IDS = {
  ADMIN: 1,
  MANAGER: 2,
  CASHIER: 3,
} as const

export const DEFAULT_ROLES = {
  ADMIN: {
    name: 'Administrator',
    permissions: Object.values(PERMISSIONS),
  },
  MANAGER: {
    name: 'Manager',
    permissions: [
      PERMISSIONS.USER_READ,
      PERMISSIONS.PRODUCT_MANAGE,
      PERMISSIONS.CATEGORY_MANAGE,
      PERMISSIONS.TICKET_MANAGE,
      PERMISSIONS.SESSION_MANAGE,
      PERMISSIONS.REPORT_MANAGE,
      PERMISSIONS.SETTINGS_VIEW,
    ],
  },
  CASHIER: {
    name: 'Cashier',
    permissions: [
      PERMISSIONS.PRODUCT_READ,
      PERMISSIONS.CATEGORY_READ,
      PERMISSIONS.TICKET_CREATE,
      PERMISSIONS.TICKET_READ,
      PERMISSIONS.SESSION_OPEN,
      PERMISSIONS.SESSION_CLOSE,
      PERMISSIONS.SESSION_READ,
    ],
  },
} as const

export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  TRANSFER: 'transfer',
  CHECK: 'check',
  OTHER: 'other',
} as const

export const STOCK_MOVEMENT_TYPES = {
  IN: 'in',
  OUT: 'out',
  ADJUSTMENT: 'adjustment',
  SALE: 'sale',
  RETURN: 'return',
} as const

export const TICKET_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const

export const SESSION_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
} as const
