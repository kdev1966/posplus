export const APP_NAME = 'POSPlus';
export const APP_VERSION = '1.0.0';

export const DEFAULT_TAX_RATE = 0.20; // 20% TVA
export const DEFAULT_CURRENCY = 'EUR';
export const DEFAULT_CURRENCY_SYMBOL = '€';

export const SESSION_TIMEOUT = 3600000; // 1 hour in milliseconds
export const AUTO_LOCK_TIMEOUT = 300000; // 5 minutes in milliseconds

export const ITEMS_PER_PAGE = 20;
export const MAX_SEARCH_RESULTS = 50;

export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';
export const TIME_FORMAT = 'HH:mm:ss';

export const PRODUCT_UNITS = [
  { value: 'unit', label: 'Unité' },
  { value: 'kg', label: 'Kilogramme' },
  { value: 'g', label: 'Gramme' },
  { value: 'l', label: 'Litre' },
  { value: 'ml', label: 'Millilitre' },
  { value: 'm', label: 'Mètre' },
  { value: 'cm', label: 'Centimètre' },
];

export const DEFAULT_CATEGORY_COLORS = [
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // green
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#6366f1', // indigo
];

export const RECEIPT_WIDTH = 48; // characters
export const RECEIPT_LOGO_MAX_WIDTH = 384; // pixels
