import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { Logger } from '../utils/logger';

const logger = new Logger('Database');

/**
 * Database Connection Manager
 * Handles SQLite database connection with proper initialization
 */
class DatabaseConnection {
  private static instance: Database.Database | null = null;
  private static dbPath: string;

  /**
   * Get database instance (singleton pattern)
   */
  static getInstance(): Database.Database {
    if (!this.instance) {
      this.instance = this.connect();
    }
    return this.instance;
  }

  /**
   * Initialize and connect to database
   */
  private static connect(): Database.Database {
    try {
      // Determine database path
      const userDataPath = app.getPath('userData');
      const dataDir = path.join(userDataPath, 'data');

      // Ensure data directory exists
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.dbPath = path.join(dataDir, 'posplus.db');
      const isNewDatabase = !fs.existsSync(this.dbPath);

      logger.info(`Connecting to database at: ${this.dbPath}`);

      // Create database connection
      const db = new Database(this.dbPath, {
        verbose: process.env.NODE_ENV === 'development' ? logger.debug : undefined,
      });

      // Enable foreign keys
      db.pragma('foreign_keys = ON');

      // Set journal mode to WAL for better concurrency
      db.pragma('journal_mode = WAL');

      // Set synchronous mode for better performance
      db.pragma('synchronous = NORMAL');

      // Set cache size (10MB)
      db.pragma('cache_size = -10000');

      logger.info('Database connected successfully');

      // Initialize schema if new database
      if (isNewDatabase) {
        logger.info('Initializing new database schema...');
        this.initializeSchema(db);
      }

      return db;
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  /**
   * Initialize database schema
   */
  private static initializeSchema(db: Database.Database): void {
    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf-8');

      // Execute schema SQL
      db.exec(schema);

      logger.info('Database schema initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database schema:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  static close(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
      logger.info('Database connection closed');
    }
  }

  /**
   * Run database backup
   */
  static async backup(backupPath: string): Promise<void> {
    const db = this.getInstance();
    return new Promise((resolve, reject) => {
      try {
        db.backup(backupPath)
          .then(() => {
            logger.info(`Database backed up to: ${backupPath}`);
            resolve();
          })
          .catch(reject);
      } catch (error) {
        logger.error('Failed to backup database:', error);
        reject(error);
      }
    });
  }

  /**
   * Get database path
   */
  static getPath(): string {
    return this.dbPath;
  }

  /**
   * Vacuum database (optimize)
   */
  static vacuum(): void {
    const db = this.getInstance();
    db.exec('VACUUM');
    logger.info('Database vacuumed successfully');
  }
}

export default DatabaseConnection;
