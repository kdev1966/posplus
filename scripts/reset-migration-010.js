#!/usr/bin/env node

/**
 * Reset migration 010 that failed
 * This allows the corrected migration to run again
 */

const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Determine database path
const userDataPath = path.join(
  os.homedir(),
  'Library/Application Support/Electron'
);
const dbPath = path.join(userDataPath, 'posplus.db');

console.log(`Database path: ${dbPath}`);

try {
  const db = new Database(dbPath);

  // Check if migration 010 exists
  const migration = db.prepare(
    "SELECT * FROM migrations WHERE name = '010_add_partially_refunded_status.sql'"
  ).get();

  if (migration) {
    console.log('Found migration 010 entry:', migration);

    // Delete the failed migration entry
    const result = db.prepare(
      "DELETE FROM migrations WHERE name = '010_add_partially_refunded_status.sql'"
    ).run();

    console.log(`Deleted ${result.changes} migration entry`);
    console.log('Migration 010 can now run again on next app start');
  } else {
    console.log('Migration 010 not found in database - nothing to reset');
  }

  db.close();
  console.log('Done!');
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
