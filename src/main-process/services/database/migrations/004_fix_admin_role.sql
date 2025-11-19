-- ============================================================================
-- POSPlus Database Schema - Fix Admin User Role
-- Version: 004
-- Created: 2025-11-18
-- Description: Ensure admin user has Administrator role (role_id = 1)
-- ============================================================================

-- Fix admin user role if it was incorrectly set
-- This ensures the admin user always has full Administrator privileges
UPDATE users
SET role_id = 1
WHERE username = 'admin'
  AND role_id != 1;

-- Log the fix (SQLite doesn't have console output, but this documents the change)
-- If the update affected rows, the admin role was corrected from Cashier/Manager to Administrator
