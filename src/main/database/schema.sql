-- POSPlus Database Schema
-- SQLite Database for Point of Sale System
-- Version: 1.0.0

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'cashier')),
  is_active INTEGER DEFAULT 1 NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT,
  parent_id TEXT,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1 NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_order ON categories(display_order);

-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT UNIQUE,
  barcode TEXT UNIQUE,
  category_id TEXT,
  price_ht REAL NOT NULL CHECK(price_ht >= 0),
  tax_rate REAL NOT NULL DEFAULT 0.20 CHECK(tax_rate >= 0 AND tax_rate <= 1),
  price_ttc REAL NOT NULL CHECK(price_ttc >= 0),
  cost_price REAL CHECK(cost_price >= 0),
  stock_quantity INTEGER DEFAULT 0 NOT NULL,
  min_stock_level INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'unit',
  image_url TEXT,
  is_active INTEGER DEFAULT 1 NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);

-- ============================================================================
-- SALES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  sale_number TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  customer_name TEXT,
  subtotal_ht REAL NOT NULL CHECK(subtotal_ht >= 0),
  total_tax REAL NOT NULL CHECK(total_tax >= 0),
  total_ttc REAL NOT NULL CHECK(total_ttc >= 0),
  discount_amount REAL DEFAULT 0 CHECK(discount_amount >= 0),
  discount_percentage REAL DEFAULT 0 CHECK(discount_percentage >= 0 AND discount_percentage <= 100),
  payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'card', 'mobile', 'other')),
  payment_status TEXT NOT NULL DEFAULT 'completed' CHECK(payment_status IN ('completed', 'pending', 'cancelled', 'refunded')),
  amount_paid REAL DEFAULT 0,
  change_amount REAL DEFAULT 0,
  notes TEXT,
  synced INTEGER DEFAULT 0 NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_sales_number ON sales(sale_number);
CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_synced ON sales(synced);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(payment_status);

-- ============================================================================
-- SALE ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  quantity REAL NOT NULL CHECK(quantity > 0),
  unit_price_ht REAL NOT NULL CHECK(unit_price_ht >= 0),
  tax_rate REAL NOT NULL CHECK(tax_rate >= 0 AND tax_rate <= 1),
  unit_price_ttc REAL NOT NULL CHECK(unit_price_ttc >= 0),
  subtotal_ht REAL NOT NULL CHECK(subtotal_ht >= 0),
  subtotal_ttc REAL NOT NULL CHECK(subtotal_ttc >= 0),
  discount_amount REAL DEFAULT 0 CHECK(discount_amount >= 0),
  created_at TEXT NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_date ON sale_items(created_at);

-- ============================================================================
-- CASH MOVEMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS cash_movements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('opening', 'closing', 'deposit', 'withdrawal', 'sale')),
  amount REAL NOT NULL,
  balance_before REAL NOT NULL,
  balance_after REAL NOT NULL,
  reference TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_user ON cash_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_type ON cash_movements(type);
CREATE INDEX IF NOT EXISTS idx_cash_movements_date ON cash_movements(created_at);

-- ============================================================================
-- STOCK MOVEMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('in', 'out', 'adjustment', 'sale', 'return')),
  quantity REAL NOT NULL,
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  reference TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_user ON stock_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);

-- ============================================================================
-- SESSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ============================================================================
-- SYNC QUEUE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('create', 'update', 'delete')),
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL,
  synced_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at);

-- ============================================================================
-- SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  updated_at TEXT NOT NULL
);

-- ============================================================================
-- APP METADATA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Insert schema version
INSERT OR REPLACE INTO app_metadata (key, value, updated_at)
VALUES ('schema_version', '1', datetime('now'));

-- Insert default admin user (password: admin123)
-- Password hash for 'admin123' using bcrypt
INSERT OR IGNORE INTO users (id, username, password_hash, full_name, role, is_active, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin',
  '$2b$10$rBV2kHBXPvWs7IXVNQX3K.LjZE7gGY8qGqZKqFZwYxPZE3aqGhJ7O',
  'Administrator',
  'admin',
  1,
  datetime('now'),
  datetime('now')
);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value, type, description, updated_at)
VALUES
  ('company_name', 'POSPlus', 'string', 'Company name', datetime('now')),
  ('tax_rate', '0.20', 'number', 'Default tax rate (20%)', datetime('now')),
  ('currency', 'EUR', 'string', 'Currency code', datetime('now')),
  ('currency_symbol', '€', 'string', 'Currency symbol', datetime('now')),
  ('receipt_header', 'POSPlus\nThank you for your purchase!', 'string', 'Receipt header text', datetime('now')),
  ('receipt_footer', 'Visit us again!', 'string', 'Receipt footer text', datetime('now')),
  ('auto_lock_enabled', 'true', 'boolean', 'Enable auto lock', datetime('now')),
  ('auto_lock_timeout', '300000', 'number', 'Auto lock timeout (ms)', datetime('now'));
