-- ============================================================================
-- POSPlus Database Schema - Force Logout After Role Fix
-- Version: 005
-- Created: 2025-11-18
-- Description: Add a flag to force all users to logout after role fix
-- ============================================================================

-- Add a setting to force logout on next app start
-- This ensures users will re-login and get fresh role data
INSERT OR REPLACE INTO settings (key, value, type, description)
VALUES ('force_logout', 'true', 'boolean', 'Force all users to logout on next app start');
