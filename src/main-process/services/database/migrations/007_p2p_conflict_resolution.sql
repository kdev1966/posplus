-- ============================================================================
-- P2P Conflict Resolution - Migration 007
-- Version: 007
-- Created: 2025-11-23
-- Purpose: Add P2P synchronization conflict tracking and resolution
-- ============================================================================

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ============================================================================
-- P2P SYNC LOGS
-- ============================================================================

-- Track all P2P synchronization events
CREATE TABLE IF NOT EXISTS p2p_sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  peer_id TEXT NOT NULL,
  peer_name TEXT NOT NULL,
  message_type TEXT NOT NULL,
  message_action TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('product', 'category', 'ticket', 'customer', 'user', 'payment')),
  entity_id INTEGER,
  status TEXT NOT NULL CHECK(status IN ('success', 'conflict', 'error', 'skipped')),
  conflict_reason TEXT,
  resolution_strategy TEXT CHECK(resolution_strategy IN ('local_wins', 'remote_wins', 'last_write_wins', 'manual', NULL)),
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_p2p_sync_logs_peer_id ON p2p_sync_logs(peer_id);
CREATE INDEX idx_p2p_sync_logs_entity_type ON p2p_sync_logs(entity_type);
CREATE INDEX idx_p2p_sync_logs_entity_id ON p2p_sync_logs(entity_id);
CREATE INDEX idx_p2p_sync_logs_status ON p2p_sync_logs(status);
CREATE INDEX idx_p2p_sync_logs_created_at ON p2p_sync_logs(created_at);

-- ============================================================================
-- P2P CONFLICT HISTORY
-- ============================================================================

-- Detailed conflict resolution history
CREATE TABLE IF NOT EXISTS p2p_conflicts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  peer_id TEXT NOT NULL,
  peer_name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('product', 'category', 'ticket', 'customer', 'user', 'payment')),
  entity_id INTEGER NOT NULL,
  entity_name TEXT,
  conflict_type TEXT NOT NULL CHECK(conflict_type IN ('update_conflict', 'version_conflict', 'delete_conflict')),
  local_data TEXT NOT NULL, -- JSON snapshot of local version
  remote_data TEXT NOT NULL, -- JSON snapshot of remote version
  local_updated_at DATETIME,
  remote_updated_at DATETIME,
  resolution_strategy TEXT NOT NULL CHECK(resolution_strategy IN ('local_wins', 'remote_wins', 'last_write_wins', 'manual')),
  final_data TEXT, -- JSON snapshot of resolved version
  resolved_by TEXT, -- 'system' or user ID
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_p2p_conflicts_peer_id ON p2p_conflicts(peer_id);
CREATE INDEX idx_p2p_conflicts_entity_type ON p2p_conflicts(entity_type);
CREATE INDEX idx_p2p_conflicts_entity_id ON p2p_conflicts(entity_id);
CREATE INDEX idx_p2p_conflicts_conflict_type ON p2p_conflicts(conflict_type);
CREATE INDEX idx_p2p_conflicts_created_at ON p2p_conflicts(created_at);

-- ============================================================================
-- P2P CONNECTION METRICS
-- ============================================================================

-- Track connection statistics and health metrics
CREATE TABLE IF NOT EXISTS p2p_connection_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  peer_id TEXT NOT NULL,
  peer_name TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('connected', 'disconnected', 'reconnected', 'heartbeat_timeout', 'sync_completed', 'sync_failed')),
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  bytes_sent INTEGER DEFAULT 0,
  bytes_received INTEGER DEFAULT 0,
  sync_duration_ms INTEGER,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_p2p_connection_metrics_peer_id ON p2p_connection_metrics(peer_id);
CREATE INDEX idx_p2p_connection_metrics_event_type ON p2p_connection_metrics(event_type);
CREATE INDEX idx_p2p_connection_metrics_created_at ON p2p_connection_metrics(created_at);

-- ============================================================================
-- P2P SETTINGS
-- ============================================================================

-- Add P2P-specific settings
INSERT OR IGNORE INTO settings (key, value, type, description) VALUES
  ('p2p_enabled', 'true', 'boolean', 'Enable P2P synchronization'),
  ('p2p_auto_sync', 'true', 'boolean', 'Automatically sync with peers'),
  ('p2p_conflict_resolution', 'last_write_wins', 'string', 'Default conflict resolution strategy: local_wins, remote_wins, last_write_wins'),
  ('p2p_heartbeat_interval', '30000', 'number', 'Heartbeat interval in milliseconds'),
  ('p2p_reconnect_max_attempts', '10', 'number', 'Maximum reconnection attempts'),
  ('p2p_sync_batch_size', '100', 'number', 'Number of records to sync in one batch');

-- ============================================================================
-- VIEWS FOR P2P MONITORING
-- ============================================================================

-- Recent sync activity
CREATE VIEW IF NOT EXISTS v_p2p_recent_activity AS
SELECT
  peer_name,
  message_type,
  message_action,
  entity_type,
  status,
  COUNT(*) as count,
  MAX(created_at) as last_activity
FROM p2p_sync_logs
WHERE created_at >= datetime('now', '-1 hour')
GROUP BY peer_name, message_type, message_action, entity_type, status
ORDER BY last_activity DESC;

-- Conflict summary
CREATE VIEW IF NOT EXISTS v_p2p_conflict_summary AS
SELECT
  peer_name,
  entity_type,
  conflict_type,
  resolution_strategy,
  COUNT(*) as conflict_count,
  MAX(created_at) as last_conflict
FROM p2p_conflicts
WHERE created_at >= datetime('now', '-24 hours')
GROUP BY peer_name, entity_type, conflict_type, resolution_strategy
ORDER BY conflict_count DESC;

-- Connection health
CREATE VIEW IF NOT EXISTS v_p2p_connection_health AS
SELECT
  peer_name,
  event_type,
  COUNT(*) as event_count,
  SUM(messages_sent) as total_messages_sent,
  SUM(messages_received) as total_messages_received,
  AVG(sync_duration_ms) as avg_sync_duration_ms,
  MAX(created_at) as last_event
FROM p2p_connection_metrics
WHERE created_at >= datetime('now', '-1 hour')
GROUP BY peer_name, event_type
ORDER BY last_event DESC;
