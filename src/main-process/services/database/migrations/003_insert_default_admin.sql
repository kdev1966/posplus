-- ============================================================================
-- POSPlus Database Schema - Insert Default Admin User
-- Version: 003
-- Created: 2025-11-17
-- Description: Insert default admin user with password 'admin123'
-- ============================================================================

-- Insert default admin user
-- Username: admin
-- Password: admin123 (hashed with bcrypt)
-- Role ID 1 = Admin (from roles table)
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
  'Admin',
  'User',
  1,
  1
);
