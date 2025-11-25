-- Migration: Add print preview setting
-- Adds option to show preview before printing tickets

ALTER TABLE store_settings ADD COLUMN print_preview_enabled INTEGER NOT NULL DEFAULT 0;
