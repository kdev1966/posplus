-- ============================================================================
-- Migration: Fix Statistics Views for Partial Refunds
-- Date: 2025-11-24
-- Description: Update v_daily_sales and v_top_products views to include
--              'partially_refunded' tickets in statistics calculations.
--              This ensures that dashboard and reports show correct revenue
--              after partial refunds (not 0).
-- ============================================================================

-- Drop existing views
DROP VIEW IF EXISTS v_daily_sales;
DROP VIEW IF EXISTS v_top_products;

-- ============================================================================
-- RECREATE VIEWS WITH PARTIAL REFUND SUPPORT
-- ============================================================================

-- Daily sales summary (includes both completed and partially refunded tickets)
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

-- Top selling products (includes both completed and partially refunded tickets)
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
