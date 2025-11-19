-- ============================================================================
-- POSPlus Database Schema - Initial Migration
-- Version: 001
-- Created: 2025-11-15
-- ============================================================================

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ============================================================================
-- ROLES & PERMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('create', 'read', 'update', 'delete', 'manage')),
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(resource, action)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- ============================================================================
-- USERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role_id INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_is_active ON users(is_active);

-- ============================================================================
-- CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  parent_id INTEGER,
  is_active BOOLEAN DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_is_active ON categories(is_active);
CREATE INDEX idx_categories_display_order ON categories(display_order);

-- ============================================================================
-- PRODUCTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category_id INTEGER NOT NULL,
  price REAL NOT NULL CHECK(price >= 0),
  cost REAL NOT NULL DEFAULT 0 CHECK(cost >= 0),
  tax_rate REAL NOT NULL DEFAULT 0 CHECK(tax_rate >= 0 AND tax_rate <= 1),
  discount_rate REAL NOT NULL DEFAULT 0 CHECK(discount_rate >= 0 AND discount_rate <= 1),
  stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
  min_stock INTEGER DEFAULT 0 CHECK(min_stock >= 0),
  max_stock INTEGER CHECK(max_stock IS NULL OR max_stock >= min_stock),
  unit TEXT NOT NULL DEFAULT 'pcs',
  is_active BOOLEAN DEFAULT 1,
  image_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_stock ON products(stock);

-- Full-text search for products
CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
  name,
  description,
  sku,
  content=products,
  content_rowid=id
);

-- ============================================================================
-- CASH SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS cash_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  opening_cash REAL NOT NULL DEFAULT 0 CHECK(opening_cash >= 0),
  closing_cash REAL CHECK(closing_cash IS NULL OR closing_cash >= 0),
  expected_cash REAL CHECK(expected_cash IS NULL OR expected_cash >= 0),
  difference REAL,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed')),
  notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_sessions_user_id ON cash_sessions(user_id);
CREATE INDEX idx_sessions_status ON cash_sessions(status);
CREATE INDEX idx_sessions_started_at ON cash_sessions(started_at);
CREATE INDEX idx_sessions_closed_at ON cash_sessions(closed_at);

-- ============================================================================
-- TICKETS (Sales)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_number TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  customer_id INTEGER,
  session_id INTEGER NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0 CHECK(subtotal >= 0),
  tax_amount REAL NOT NULL DEFAULT 0 CHECK(tax_amount >= 0),
  discount_amount REAL NOT NULL DEFAULT 0 CHECK(discount_amount >= 0),
  total_amount REAL NOT NULL DEFAULT 0 CHECK(total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled', 'refunded')),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (session_id) REFERENCES cash_sessions(id)
);

CREATE INDEX idx_tickets_ticket_number ON tickets(ticket_number);
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_session_id ON tickets(session_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);

-- ============================================================================
-- TICKET LINES
-- ============================================================================

CREATE TABLE IF NOT EXISTS ticket_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  quantity REAL NOT NULL CHECK(quantity > 0),
  unit_price REAL NOT NULL CHECK(unit_price >= 0),
  tax_rate REAL NOT NULL DEFAULT 0 CHECK(tax_rate >= 0 AND tax_rate <= 1),
  discount_rate REAL NOT NULL DEFAULT 0 CHECK(discount_rate >= 0 AND discount_rate <= 1),
  discount_amount REAL NOT NULL DEFAULT 0 CHECK(discount_amount >= 0),
  total_amount REAL NOT NULL CHECK(total_amount >= 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX idx_ticket_lines_ticket_id ON ticket_lines(ticket_id);
CREATE INDEX idx_ticket_lines_product_id ON ticket_lines(product_id);
CREATE INDEX idx_ticket_lines_created_at ON ticket_lines(created_at);

-- ============================================================================
-- PAYMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  method TEXT NOT NULL CHECK(method IN ('cash', 'card', 'transfer', 'check', 'other')),
  amount REAL NOT NULL CHECK(amount > 0),
  reference TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);

CREATE INDEX idx_payments_ticket_id ON payments(ticket_id);
CREATE INDEX idx_payments_method ON payments(method);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- ============================================================================
-- STOCK LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('in', 'out', 'adjustment', 'sale', 'return')),
  quantity REAL NOT NULL,
  previous_stock REAL NOT NULL,
  new_stock REAL NOT NULL,
  reference TEXT,
  user_id INTEGER NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_stock_logs_product_id ON stock_logs(product_id);
CREATE INDEX idx_stock_logs_type ON stock_logs(type);
CREATE INDEX idx_stock_logs_user_id ON stock_logs(user_id);
CREATE INDEX idx_stock_logs_created_at ON stock_logs(created_at);

-- ============================================================================
-- Z REPORTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS z_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  total_sales REAL NOT NULL DEFAULT 0,
  total_tax REAL NOT NULL DEFAULT 0,
  total_discount REAL NOT NULL DEFAULT 0,
  total_cash REAL NOT NULL DEFAULT 0,
  total_card REAL NOT NULL DEFAULT 0,
  total_transfer REAL NOT NULL DEFAULT 0,
  total_check REAL NOT NULL DEFAULT 0,
  total_other REAL NOT NULL DEFAULT 0,
  ticket_count INTEGER NOT NULL DEFAULT 0,
  report_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES cash_sessions(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_z_reports_session_id ON z_reports(session_id);
CREATE INDEX idx_z_reports_user_id ON z_reports(user_id);
CREATE INDEX idx_z_reports_report_date ON z_reports(report_date);
CREATE INDEX idx_z_reports_created_at ON z_reports(created_at);

-- ============================================================================
-- CUSTOMERS (Optional - for future use)
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_number TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT,
  is_active BOOLEAN DEFAULT 1,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_is_active ON customers(is_active);

-- ============================================================================
-- SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamps
CREATE TRIGGER IF NOT EXISTS update_users_timestamp
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_products_timestamp
AFTER UPDATE ON products
BEGIN
  UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_categories_timestamp
AFTER UPDATE ON categories
BEGIN
  UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_tickets_timestamp
AFTER UPDATE ON tickets
BEGIN
  UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- FTS sync triggers
CREATE TRIGGER IF NOT EXISTS products_fts_insert
AFTER INSERT ON products
BEGIN
  INSERT INTO products_fts(rowid, name, description, sku)
  VALUES (NEW.id, NEW.name, NEW.description, NEW.sku);
END;

CREATE TRIGGER IF NOT EXISTS products_fts_update
AFTER UPDATE ON products
BEGIN
  UPDATE products_fts SET name = NEW.name, description = NEW.description, sku = NEW.sku
  WHERE rowid = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS products_fts_delete
AFTER DELETE ON products
BEGIN
  DELETE FROM products_fts WHERE rowid = OLD.id;
END;

-- Log stock changes on product updates
CREATE TRIGGER IF NOT EXISTS log_stock_on_product_update
AFTER UPDATE OF stock ON products
WHEN OLD.stock != NEW.stock
BEGIN
  INSERT INTO stock_logs (product_id, type, quantity, previous_stock, new_stock, user_id, notes)
  VALUES (
    NEW.id,
    CASE WHEN NEW.stock > OLD.stock THEN 'in' ELSE 'out' END,
    ABS(NEW.stock - OLD.stock),
    OLD.stock,
    NEW.stock,
    (SELECT id FROM users WHERE is_active = 1 LIMIT 1),
    'Auto-logged from product update'
  );
END;

-- Prevent deletion of products with stock
CREATE TRIGGER IF NOT EXISTS prevent_product_deletion_with_stock
BEFORE DELETE ON products
WHEN OLD.stock > 0
BEGIN
  SELECT RAISE(ABORT, 'Cannot delete product with stock > 0');
END;

-- Ensure only one open session per user
CREATE TRIGGER IF NOT EXISTS check_single_open_session
BEFORE INSERT ON cash_sessions
WHEN NEW.status = 'open'
BEGIN
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM cash_sessions WHERE user_id = NEW.user_id AND status = 'open')
    THEN RAISE(ABORT, 'User already has an open session')
  END;
END;

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Insert default roles
INSERT OR IGNORE INTO roles (id, name, description) VALUES
  (1, 'Administrator', 'Full system access'),
  (2, 'Manager', 'Manage products, sales and reports'),
  (3, 'Cashier', 'Process sales only');

-- Insert default permissions
INSERT OR IGNORE INTO permissions (resource, action, description) VALUES
  ('user', 'create', 'Create users'),
  ('user', 'read', 'View users'),
  ('user', 'update', 'Update users'),
  ('user', 'delete', 'Delete users'),
  ('user', 'manage', 'Full user management'),

  ('product', 'create', 'Create products'),
  ('product', 'read', 'View products'),
  ('product', 'update', 'Update products'),
  ('product', 'delete', 'Delete products'),
  ('product', 'manage', 'Full product management'),

  ('category', 'create', 'Create categories'),
  ('category', 'read', 'View categories'),
  ('category', 'update', 'Update categories'),
  ('category', 'delete', 'Delete categories'),
  ('category', 'manage', 'Full category management'),

  ('ticket', 'create', 'Create tickets'),
  ('ticket', 'read', 'View tickets'),
  ('ticket', 'update', 'Update tickets'),
  ('ticket', 'delete', 'Delete tickets'),
  ('ticket', 'manage', 'Full ticket management'),

  ('session', 'manage', 'Manage cash sessions'),
  ('report', 'manage', 'Access reports'),
  ('settings', 'manage', 'Manage system settings'),
  ('system', 'manage', 'System administration');

-- Assign all permissions to Administrator role
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Assign permissions to Manager role
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions
WHERE resource IN ('product', 'category', 'ticket', 'session', 'report')
   OR (resource = 'user' AND action = 'read');

-- Assign permissions to Cashier role
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions
WHERE (resource IN ('product', 'category') AND action = 'read')
   OR (resource = 'ticket' AND action IN ('create', 'read'))
   OR (resource = 'session' AND action = 'manage');

-- NOTE: Default admin user is now created in migration 003_insert_default_admin.sql
-- This was moved to avoid duplication and ensure consistent setup

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value, type, description) VALUES
  ('company_name', 'POSPlus Store', 'string', 'Company name'),
  ('company_address', '', 'string', 'Company address'),
  ('company_phone', '', 'string', 'Company phone'),
  ('company_email', '', 'string', 'Company email'),
  ('tax_id', '', 'string', 'Tax identification number'),
  ('currency', 'TND', 'string', 'Currency code'),
  ('currency_symbol', 'DT', 'string', 'Currency symbol'),
  ('country', 'Tunisia', 'string', 'Country'),
  ('timezone', 'Africa/Tunis', 'string', 'Timezone'),
  ('language', 'fr', 'string', 'Default language'),
  ('receipt_header', 'Merci pour votre achat !', 'string', 'Receipt header text'),
  ('receipt_footer', 'À bientôt', 'string', 'Receipt footer text'),
  ('low_stock_alert', 'true', 'boolean', 'Enable low stock alerts'),
  ('auto_print_receipt', 'true', 'boolean', 'Auto-print receipts');

-- ============================================================================
-- VIEWS (Useful queries)
-- ============================================================================

-- Products with low stock
CREATE VIEW IF NOT EXISTS v_low_stock_products AS
SELECT
  p.id,
  p.sku,
  p.name,
  p.stock,
  p.min_stock,
  c.name as category_name
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.stock <= p.min_stock AND p.is_active = 1;

-- Daily sales summary
CREATE VIEW IF NOT EXISTS v_daily_sales AS
SELECT
  DATE(t.created_at) as sale_date,
  COUNT(t.id) as ticket_count,
  SUM(t.subtotal) as total_subtotal,
  SUM(t.tax_amount) as total_tax,
  SUM(t.discount_amount) as total_discount,
  SUM(t.total_amount) as total_amount
FROM tickets t
WHERE t.status = 'completed'
GROUP BY DATE(t.created_at);

-- Top selling products
CREATE VIEW IF NOT EXISTS v_top_products AS
SELECT
  p.id,
  p.name,
  p.sku,
  COUNT(tl.id) as times_sold,
  SUM(tl.quantity) as total_quantity,
  SUM(tl.total_amount) as total_revenue
FROM products p
JOIN ticket_lines tl ON p.id = tl.product_id
JOIN tickets t ON tl.ticket_id = t.id
WHERE t.status = 'completed'
GROUP BY p.id, p.name, p.sku
ORDER BY total_revenue DESC;
