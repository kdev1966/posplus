-- Migration: Store settings for ticket printing
-- Add store information (name, phone) and custom messages in both languages

CREATE TABLE IF NOT EXISTS store_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  store_name_fr TEXT NOT NULL DEFAULT '',
  store_name_ar TEXT NOT NULL DEFAULT '',
  store_phone TEXT NOT NULL DEFAULT '',
  ticket_message_fr TEXT NOT NULL DEFAULT '',
  ticket_message_ar TEXT NOT NULL DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default values
INSERT OR IGNORE INTO store_settings (id, store_name_fr, store_name_ar, store_phone, ticket_message_fr, ticket_message_ar)
VALUES (1, '', '', '', '', '');

-- Trigger to update updated_at
CREATE TRIGGER IF NOT EXISTS store_settings_updated_at
AFTER UPDATE ON store_settings
BEGIN
  UPDATE store_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
