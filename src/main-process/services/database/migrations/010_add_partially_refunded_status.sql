-- ============================================================================
-- Add 'partially_refunded' status to tickets table
-- Version: 010
-- Created: 2025-11-24
-- ============================================================================

-- SQLite doesn't support ALTER TABLE ... MODIFY CONSTRAINT directly
-- We need to recreate the table with the new constraint

PRAGMA foreign_keys = OFF;

-- Drop views that depend on tickets table
DROP VIEW IF EXISTS v_daily_sales;
DROP VIEW IF EXISTS v_top_products;

-- Drop trigger that depends on tickets table
DROP TRIGGER IF EXISTS update_tickets_timestamp;

-- Drop any orphaned tickets_new table from failed migration attempts
DROP TABLE IF EXISTS tickets_new;

-- Create new tickets table with updated CHECK constraint
-- IMPORTANT: Column order must match migration 002 exactly (11 columns)
CREATE TABLE tickets_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_number TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  customer_id INTEGER,
  session_id INTEGER NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0 CHECK(subtotal >= 0),
  discount_amount REAL NOT NULL DEFAULT 0 CHECK(discount_amount >= 0),
  total_amount REAL NOT NULL DEFAULT 0 CHECK(total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled', 'refunded', 'partially_refunded')),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (session_id) REFERENCES cash_sessions(id)
);

-- Copy all data from old table to new table
INSERT INTO tickets_new SELECT * FROM tickets;

-- Drop old table
DROP TABLE tickets;

-- Rename new table to original name
ALTER TABLE tickets_new RENAME TO tickets;

-- Recreate indexes
CREATE INDEX idx_tickets_ticket_number ON tickets(ticket_number);
CREATE INDEX idx_tickets_session_id ON tickets(session_id);
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);

-- Recreate trigger
CREATE TRIGGER update_tickets_timestamp
AFTER UPDATE ON tickets
BEGIN
  UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Recreate views (from migration 009 with partially_refunded status)
CREATE VIEW v_daily_sales AS
SELECT
  DATE(t.created_at) as sale_date,
  COUNT(t.id) as ticket_count,
  SUM(t.subtotal) as total_subtotal,
  SUM(t.discount_amount) as total_discount,
  SUM(t.total_amount) as total_amount
FROM tickets t
WHERE t.status IN ('completed', 'partially_refunded')
GROUP BY DATE(t.created_at);

CREATE VIEW v_top_products AS
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
WHERE t.status IN ('completed', 'partially_refunded')
GROUP BY p.id, p.name, p.sku
ORDER BY total_revenue DESC;

PRAGMA foreign_keys = ON;
