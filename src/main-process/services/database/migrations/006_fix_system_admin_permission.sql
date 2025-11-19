-- ============================================================================
-- POSPlus Database Schema - Fix System Admin Permission
-- Version: 006
-- Created: 2025-11-18
-- Description: Fix system.admin permission - use 'manage' instead of 'admin'
-- ============================================================================

-- The original migration tried to insert ('system', 'admin') but the CHECK constraint
-- only allows: 'create', 'read', 'update', 'delete', 'manage'
-- So we use 'system.manage' instead of 'system.admin'

-- Insert the correct system permission
INSERT OR IGNORE INTO permissions (resource, action, description)
VALUES ('system', 'manage', 'System administration');

-- Assign system.manage to Administrator role
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE resource = 'system' AND action = 'manage';
