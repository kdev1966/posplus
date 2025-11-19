import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import log from 'electron-log'

class DatabaseService {
  private static instance: DatabaseService
  private db: Database.Database | null = null
  private dbPath: string = ''
  private migrationsPath: string = ''
  private isInitialized: boolean = false

  private constructor() {
    // Don't initialize paths here - wait for app.whenReady()
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  public initialize(): void {
    if (this.isInitialized) {
      log.info('Database already initialized')
      return
    }

    try {
      log.info('Initializing database...')

      // Initialize paths now that app is ready
      const userDataPath = app.getPath('userData')
      this.dbPath = path.join(userDataPath, 'posplus.db')
      this.migrationsPath = path.join(__dirname, 'migrations')

      log.info(`Database path: ${this.dbPath}`)
      log.info(`Migrations path: ${this.migrationsPath}`)

      // Ensure the directory exists
      const dbDir = path.dirname(this.dbPath)
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
      }

      // Create or open database
      this.db = new Database(this.dbPath, {
        verbose: (message) => log.debug(`SQLite: ${message}`),
      })

      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL')
      this.db.pragma('foreign_keys = ON')
      this.db.pragma('synchronous = NORMAL')

      // Run migrations
      this.runMigrations()

      this.isInitialized = true
      log.info('Database initialized successfully')
    } catch (error) {
      log.error('Failed to initialize database:', error)
      throw error
    }
  }

  private runMigrations(): void {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      log.info('Running migrations...')

      // Create migrations table if not exists
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Get executed migrations
      const executed = this.db
        .prepare('SELECT name FROM migrations')
        .all() as { name: string }[]
      const executedNames = new Set(executed.map((m) => m.name))

      // Read migration files
      if (!fs.existsSync(this.migrationsPath)) {
        log.warn(`Migrations directory not found: ${this.migrationsPath}`)
        return
      }

      const migrationFiles = fs
        .readdirSync(this.migrationsPath)
        .filter((f) => f.endsWith('.sql'))
        .sort()

      // Execute pending migrations
      const insertMigration = this.db.prepare(
        'INSERT INTO migrations (name) VALUES (?)'
      )

      for (const file of migrationFiles) {
        if (executedNames.has(file)) {
          log.debug(`Migration ${file} already executed, skipping`)
          continue
        }

        log.info(`Executing migration: ${file}`)
        const migrationPath = path.join(this.migrationsPath, file)
        const sql = fs.readFileSync(migrationPath, 'utf-8')

        this.db.exec(sql)
        insertMigration.run(file)

        log.info(`Migration ${file} executed successfully`)
      }

      log.info('All migrations completed')
    } catch (error) {
      log.error('Migration failed:', error)
      throw error
    }
  }

  public getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.')
    }
    return this.db
  }

  public getDatabasePath(): string {
    if (!this.dbPath) {
      throw new Error('Database not initialized. Call initialize() first.')
    }
    return this.dbPath
  }

  public close(): void {
    if (this.db) {
      log.info('Closing database...')
      this.db.close()
      this.db = null
      log.info('Database closed')
    }
  }

  public vacuum(): void {
    if (this.db) {
      log.info('Running VACUUM...')
      this.db.exec('VACUUM')
      log.info('VACUUM completed')
    }
  }

  public async backup(backupPath: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      log.info(`Creating backup at: ${backupPath}`)

      // Force a checkpoint to ensure all WAL data is written to the main database
      this.db.pragma('wal_checkpoint(FULL)')

      // Use VACUUM INTO to create a clean, optimized backup
      // This creates a complete copy without WAL dependencies
      this.db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`)

      log.info('Backup completed successfully')
    } catch (error) {
      log.error('Backup failed:', error)
      throw error
    }
  }

  public executeRaw(sql: string, params: any[] = []): any {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const stmt = this.db.prepare(sql)
      return params.length > 0 ? stmt.run(...params) : stmt.run()
    } catch (error) {
      log.error('Execute failed:', error)
      throw error
    }
  }

  public queryRaw<T = any>(sql: string, params: any[] = []): T[] {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const stmt = this.db.prepare(sql)
      return (params.length > 0 ? stmt.all(...params) : stmt.all()) as T[]
    } catch (error) {
      log.error('Query failed:', error)
      throw error
    }
  }

  public queryOneRaw<T = any>(sql: string, params: any[] = []): T | null {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const stmt = this.db.prepare(sql)
      const result = params.length > 0 ? stmt.get(...params) : stmt.get()
      return (result as T) || null
    } catch (error) {
      log.error('Query failed:', error)
      throw error
    }
  }

  public transaction<T>(fn: () => T): T {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return this.db.transaction(fn)()
  }
}

export default DatabaseService
export const db = DatabaseService.getInstance()
