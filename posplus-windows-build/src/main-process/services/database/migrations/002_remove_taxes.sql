-- ============================================================================
-- POSPlus Database Schema - Remove Taxes Migration
-- Version: 002
-- Created: 2025-11-16
-- Description: Remove tax-related columns (TTC pricing - all prices include taxes)
-- ============================================================================

-- NOTE: SQLite doesn't support DROP COLUMN directly.
-- We need to recreate tables without tax columns.

-- ============================================================================
-- RECREATE PRODUCTS TABLE WITHOUT TAX_RATE
-- ============================================================================

-- Create new products table without tax_rate
CREATE TABLE IF NOT EXISTS products_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category_id INTEGER NOT NULL,
  price REAL NOT NULL CHECK(price >= 0),
  cost REAL NOT NULL DEFAULT 0 CHECK(cost >= 0),
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

-- Copy data from old table (excluding tax_rate, defaulting discount_rate to 0 if not exists)
INSERT INTO products_new (id, sku, barcode, name, description, category_id, price, cost, discount_rate, stock, min_stock, max_stock, unit, is_active, image_url, created_at, updated_at)
SELECT id, sku, barcode, name, description, category_id, price, cost, 0, stock, min_stock, max_stock, unit, is_active, image_url, created_at, updated_at
FROM products;

-- Drop old table
DROP TABLE IF EXISTS products;

-- Rename new table
ALTER TABLE products_new RENAME TO products;

-- Recreate indexes
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_stock ON products(stock);

-- Recreate FTS table
DROP TABLE IF EXISTS products_fts;
CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
  name,
  description,
  sku,
  content=products,
  content_rowid=id
);

-- Re-populate FTS
INSERT INTO products_fts(rowid, name, description, sku)
SELECT id, name, description, sku FROM products;

-- ============================================================================
-- RECREATE TICKETS TABLE WITHOUT TAX_AMOUNT
-- ============================================================================

-- Create new tickets table without tax_amount
CREATE TABLE IF NOT EXISTS tickets_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_number TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  customer_id INTEGER,
  session_id INTEGER NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0 CHECK(subtotal >= 0),
  discount_amount REAL NOT NULL DEFAULT 0 CHECK(discount_amount >= 0),
  total_amount REAL NOT NULL DEFAULT 0 CHECK(total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled', 'refunded')),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (session_id) REFERENCES cash_sessions(id)
);

-- Copy data from old table (excluding tax_amount)
INSERT INTO tickets_new (id, ticket_number, user_id, customer_id, session_id, subtotal, discount_amount, total_amount, status, notes, created_at, updated_at)
SELECT id, ticket_number, user_id, customer_id, session_id, subtotal, discount_amount, total_amount, status, notes, created_at, updated_at
FROM tickets;

-- Drop old table
DROP TABLE IF EXISTS tickets;

-- Rename new table
ALTER TABLE tickets_new RENAME TO tickets;

-- Recreate indexes
CREATE INDEX idx_tickets_ticket_number ON tickets(ticket_number);
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_session_id ON tickets(session_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);

-- ============================================================================
-- RECREATE TICKET_LINES TABLE WITHOUT TAX_RATE
-- ============================================================================

-- Create new ticket_lines table without tax_rate
CREATE TABLE IF NOT EXISTS ticket_lines_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  quantity REAL NOT NULL CHECK(quantity > 0),
  unit_price REAL NOT NULL CHECK(unit_price >= 0),
  discount_rate REAL NOT NULL DEFAULT 0 CHECK(discount_rate >= 0 AND discount_rate <= 1),
  discount_amount REAL NOT NULL DEFAULT 0 CHECK(discount_amount >= 0),
  total_amount REAL NOT NULL CHECK(total_amount >= 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Copy data from old table (excluding tax_rate, defaulting discount_rate to 0 if not exists)
INSERT INTO ticket_lines_new (id, ticket_id, product_id, product_name, product_sku, quantity, unit_price, discount_rate, discount_amount, total_amount, created_at)
SELECT id, ticket_id, product_id, product_name, product_sku, quantity, unit_price, 0, discount_amount, total_amount, created_at
FROM ticket_lines;

-- Drop old table
DROP TABLE IF EXISTS ticket_lines;

-- Rename new table
ALTER TABLE ticket_lines_new RENAME TO ticket_lines;

-- Recreate indexes
CREATE INDEX idx_ticket_lines_ticket_id ON ticket_lines(ticket_id);
CREATE INDEX idx_ticket_lines_product_id ON ticket_lines(product_id);
CREATE INDEX idx_ticket_lines_created_at ON ticket_lines(created_at);

-- ============================================================================
-- RECREATE Z_REPORTS TABLE WITHOUT TOTAL_TAX
-- ============================================================================

-- Create new z_reports table without total_tax
CREATE TABLE IF NOT EXISTS z_reports_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  total_sales REAL NOT NULL DEFAULT 0,
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

-- Copy data from old table (excluding total_tax)
INSERT INTO z_reports_new (id, session_id, user_id, total_sales, total_discount, total_cash, total_card, total_transfer, total_check, total_other, ticket_count, report_date, created_at)
SELECT id, session_id, user_id, total_sales, total_discount, total_cash, total_card, total_transfer, total_check, total_other, ticket_count, report_date, created_at
FROM z_reports;

-- Drop old table
DROP TABLE IF EXISTS z_reports;

-- Rename new table
ALTER TABLE z_reports_new RENAME TO z_reports;

-- Recreate indexes
CREATE INDEX idx_z_reports_session_id ON z_reports(session_id);
CREATE INDEX idx_z_reports_user_id ON z_reports(user_id);
CREATE INDEX idx_z_reports_report_date ON z_reports(report_date);
CREATE INDEX idx_z_reports_created_at ON z_reports(created_at);

-- ============================================================================
-- UPDATE VIEWS (Remove tax references)
-- ============================================================================

-- Drop and recreate daily sales view without tax
DROP VIEW IF EXISTS v_daily_sales;
CREATE VIEW IF NOT EXISTS v_daily_sales AS
SELECT
  DATE(t.created_at) as sale_date,
  COUNT(t.id) as ticket_count,
  SUM(t.subtotal) as total_subtotal,
  SUM(t.discount_amount) as total_discount,
  SUM(t.total_amount) as total_amount
FROM tickets t
WHERE t.status = 'completed'
GROUP BY DATE(t.created_at);

-- ============================================================================
-- RECREATE TRIGGERS
-- ============================================================================

-- Update timestamps trigger for products
DROP TRIGGER IF EXISTS update_products_timestamp;
CREATE TRIGGER IF NOT EXISTS update_products_timestamp
AFTER UPDATE ON products
BEGIN
  UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update timestamps trigger for tickets
DROP TRIGGER IF EXISTS update_tickets_timestamp;
CREATE TRIGGER IF NOT EXISTS update_tickets_timestamp
AFTER UPDATE ON tickets
BEGIN
  UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- FTS sync triggers for products
DROP TRIGGER IF EXISTS products_fts_insert;
CREATE TRIGGER IF NOT EXISTS products_fts_insert
AFTER INSERT ON products
BEGIN
  INSERT INTO products_fts(rowid, name, description, sku)
  VALUES (NEW.id, NEW.name, NEW.description, NEW.sku);
END;

DROP TRIGGER IF EXISTS products_fts_update;
CREATE TRIGGER IF NOT EXISTS products_fts_update
AFTER UPDATE ON products
BEGIN
  UPDATE products_fts SET name = NEW.name, description = NEW.description, sku = NEW.sku
  WHERE rowid = NEW.id;
END;

DROP TRIGGER IF EXISTS products_fts_delete;
CREATE TRIGGER IF NOT EXISTS products_fts_delete
AFTER DELETE ON products
BEGIN
  DELETE FROM products_fts WHERE rowid = OLD.id;
END;

-- Log stock changes on product updates
DROP TRIGGER IF EXISTS log_stock_on_product_update;
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
DROP TRIGGER IF EXISTS prevent_product_deletion_with_stock;
CREATE TRIGGER IF NOT EXISTS prevent_product_deletion_with_stock
BEFORE DELETE ON products
WHEN OLD.stock > 0
BEGIN
  SELECT RAISE(ABORT, 'Cannot delete product with stock > 0');
END;
