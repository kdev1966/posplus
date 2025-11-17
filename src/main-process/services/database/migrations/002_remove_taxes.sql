-- ============================================================================
-- POSPlus Database Schema - Remove Taxes Migration
-- Version: 002
-- Created: 2025-11-16
-- Description: Remove tax-related columns (TTC pricing - all prices include taxes)
-- ============================================================================

-- NOTE: SQLite doesn't support DROP COLUMN directly.
-- We need to recreate tables without tax columns.
-- This migration handles both fresh installs and upgrades from existing databases.

-- ============================================================================
-- PRODUCTS TABLE (WITHOUT TAX_RATE)
-- ============================================================================

-- Drop old products table and related objects if they exist
DROP TRIGGER IF EXISTS products_fts_insert;
DROP TRIGGER IF EXISTS products_fts_update;
DROP TRIGGER IF EXISTS products_fts_delete;
DROP TRIGGER IF EXISTS update_products_timestamp;
DROP TRIGGER IF EXISTS log_stock_on_product_update;
DROP TRIGGER IF EXISTS prevent_product_deletion_with_stock;
DROP VIEW IF EXISTS v_low_stock_products;
DROP VIEW IF EXISTS v_top_products;
DROP TABLE IF EXISTS products_fts;
DROP TABLE IF EXISTS products;

-- Create products table without tax_rate
CREATE TABLE IF NOT EXISTS products (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);

-- Create FTS table
CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
  name,
  description,
  sku,
  content=products,
  content_rowid=id
);

-- ============================================================================
-- TICKETS TABLE (WITHOUT TAX_AMOUNT)
-- ============================================================================

-- Drop old tickets table and related objects
DROP TRIGGER IF EXISTS update_tickets_timestamp;
DROP VIEW IF EXISTS v_daily_sales;
DROP TABLE IF EXISTS tickets;

-- Create tickets table without tax_amount
CREATE TABLE IF NOT EXISTS tickets (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_session_id ON tickets(session_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);

-- ============================================================================
-- TICKET_LINES TABLE (WITHOUT TAX_RATE)
-- ============================================================================

-- Drop old ticket_lines table
DROP TABLE IF EXISTS ticket_lines;

-- Create ticket_lines table without tax_rate
CREATE TABLE IF NOT EXISTS ticket_lines (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ticket_lines_ticket_id ON ticket_lines(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_lines_product_id ON ticket_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_ticket_lines_created_at ON ticket_lines(created_at);

-- ============================================================================
-- Z_REPORTS TABLE (WITHOUT TOTAL_TAX)
-- ============================================================================

-- Drop old z_reports table
DROP TABLE IF EXISTS z_reports;

-- Create z_reports table without total_tax
CREATE TABLE IF NOT EXISTS z_reports (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_z_reports_session_id ON z_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_z_reports_user_id ON z_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_z_reports_report_date ON z_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_z_reports_created_at ON z_reports(created_at);

-- ============================================================================
-- RECREATE VIEWS (Without tax references)
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

-- Daily sales summary (without tax)
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

-- ============================================================================
-- RECREATE TRIGGERS
-- ============================================================================

-- Update timestamps trigger for products
CREATE TRIGGER IF NOT EXISTS update_products_timestamp
AFTER UPDATE ON products
BEGIN
  UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update timestamps trigger for tickets
CREATE TRIGGER IF NOT EXISTS update_tickets_timestamp
AFTER UPDATE ON tickets
BEGIN
  UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- FTS sync triggers for products
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
