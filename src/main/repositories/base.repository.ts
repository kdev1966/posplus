import Database from 'better-sqlite3';
import DatabaseConnection from '../database/connection';
import { Logger } from '../utils/logger';

/**
 * Base Repository Class
 * Provides common database operations with type safety
 */
export abstract class BaseRepository<T> {
  protected db: Database.Database;
  protected logger: Logger;
  protected abstract tableName: string;

  constructor(loggerContext: string) {
    this.db = DatabaseConnection.getInstance();
    this.logger = new Logger(loggerContext);
  }

  /**
   * Find all records
   */
  protected findAll(whereClause?: string, params?: unknown[]): T[] {
    try {
      const sql = `SELECT * FROM ${this.tableName}${whereClause ? ` WHERE ${whereClause}` : ''}`;
      const stmt = this.db.prepare(sql);
      return (params ? stmt.all(...params) : stmt.all()) as T[];
    } catch (error) {
      this.logger.error(`Failed to find all from ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Find one record by condition
   */
  protected findOne(whereClause: string, params: unknown[]): T | null {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE ${whereClause} LIMIT 1`;
      const stmt = this.db.prepare(sql);
      const result = stmt.get(...params) as T | undefined;
      return result || null;
    } catch (error) {
      this.logger.error(`Failed to find one from ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Find by ID
   */
  findById(id: string): T | null {
    return this.findOne('id = ?', [id]);
  }

  /**
   * Insert record
   */
  protected insert(data: Record<string, unknown>): T {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(', ');

      const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...values);

      if (result.changes === 0) {
        throw new Error('Insert failed - no rows affected');
      }

      return this.findById(data.id as string)!;
    } catch (error) {
      this.logger.error(`Failed to insert into ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Update record
   */
  protected update(id: string, data: Record<string, unknown>): T {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const setClause = keys.map(key => `${key} = ?`).join(', ');

      const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...values, id);

      if (result.changes === 0) {
        throw new Error('Update failed - record not found');
      }

      return this.findById(id)!;
    } catch (error) {
      this.logger.error(`Failed to update ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Delete record
   */
  delete(id: string): boolean {
    try {
      const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const stmt = this.db.prepare(sql);
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      this.logger.error(`Failed to delete from ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Count records
   */
  count(whereClause?: string, params?: unknown[]): number {
    try {
      const sql = `SELECT COUNT(*) as count FROM ${this.tableName}${
        whereClause ? ` WHERE ${whereClause}` : ''
      }`;
      const stmt = this.db.prepare(sql);
      const result = (params ? stmt.get(...params) : stmt.get()) as { count: number };
      return result.count;
    } catch (error) {
      this.logger.error(`Failed to count ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Execute in transaction
   */
  protected transaction<R>(callback: () => R): R {
    try {
      const transaction = this.db.transaction(callback);
      return transaction();
    } catch (error) {
      this.logger.error('Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Execute raw SQL
   */
  protected execute(sql: string, params?: unknown[]): Database.RunResult {
    try {
      const stmt = this.db.prepare(sql);
      return params ? stmt.run(...params) : stmt.run();
    } catch (error) {
      this.logger.error('Failed to execute SQL:', error);
      throw error;
    }
  }

  /**
   * Query raw SQL
   */
  protected query<R>(sql: string, params?: unknown[]): R[] {
    try {
      const stmt = this.db.prepare(sql);
      return (params ? stmt.all(...params) : stmt.all()) as R[];
    } catch (error) {
      this.logger.error('Failed to query SQL:', error);
      throw error;
    }
  }
}
