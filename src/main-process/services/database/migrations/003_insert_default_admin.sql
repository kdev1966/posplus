-- ============================================================================
-- POSPlus Database Schema - Insert Default Admin User
-- Version: 003
-- Created: 2025-11-17
-- Description: Insert default admin user with password 'admin123'
-- ============================================================================

-- Insert default admin user
-- Username: admin
-- Password: admin123 (hashed with bcrypt)
-- Role ID: 1 = Administrator (IMPORTANT: Must be 1, not 3!)
--   Role 1 = Administrator (Full system access with all 23 permissions)
--   Role 2 = Manager (Limited management permissions)
--   Role 3 = Cashier (Basic POS operations only)
INSERT OR IGNORE INTO users (
  username,
  email,
  password_hash,
  first_name,
  last_name,
  role_id,
  is_active
) VALUES (
  'admin',
  'admin@posplus.local',
  '$2b$10$Mk4CLUw6qwFOnIE9TJQVPeZIlkxS7cBzcfSVS6C.em6x5TNR8hxju',
  'System',
  'Administrator',
  1,  -- CRITICAL: Must be 1 (Administrator), not 3 (Cashier)
  1
);
