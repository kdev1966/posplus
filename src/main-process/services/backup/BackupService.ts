import { dialog } from 'electron'
import fs from 'fs'
import log from 'electron-log'
import DatabaseService from '../database/db'

class BackupService {
  /**
   * Get the current database file path
   */
  private getDatabasePath(): string {
    return DatabaseService.getInstance().getDatabasePath()
  }

  /**
   * Create a backup of the database to a user-selected location
   * @returns Object with success status and file path or error message
   */
  async createBackup(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      // Generate backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '')
      const defaultFileName = `posplus_backup_${timestamp}.db`

      // Open save dialog to let user choose backup location
      const result = await dialog.showSaveDialog({
        title: 'Sauvegarder la base de données',
        defaultPath: defaultFileName,
        filters: [
          { name: 'Database Files', extensions: ['db'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        log.info('Backup canceled by user')
        return { success: false, error: 'Backup canceled' }
      }

      const backupPath = result.filePath

      // Use better-sqlite3's native backup method for consistent backup
      await DatabaseService.getInstance().backup(backupPath)

      log.info(`Database backed up successfully to: ${backupPath}`)
      return { success: true, filePath: backupPath }
    } catch (error) {
      log.error('Backup failed:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Restore database from a backup file
   * @returns Object with success status and error message if failed
   */
  async restoreBackup(): Promise<{ success: boolean; error?: string; needsRestart?: boolean }> {
    try {
      // Open file dialog to let user select backup file
      const result = await dialog.showOpenDialog({
        title: 'Restaurer la base de données',
        properties: ['openFile'],
        filters: [
          { name: 'Database Files', extensions: ['db'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled || result.filePaths.length === 0) {
        log.info('Restore canceled by user')
        return { success: false, error: 'Restore canceled' }
      }

      const backupFilePath = result.filePaths[0]

      // Validate that the selected file exists
      if (!fs.existsSync(backupFilePath)) {
        log.error('Backup file not found:', backupFilePath)
        return { success: false, error: 'Backup file not found' }
      }

      const dbPath = this.getDatabasePath()

      // Create a safety backup of current database before restoring
      const safetyBackupPath = dbPath + '.before-restore'
      if (fs.existsSync(dbPath)) {
        // Use native backup method for safety backup
        await DatabaseService.getInstance().backup(safetyBackupPath)
        log.info(`Safety backup created: ${safetyBackupPath}`)
      }

      // Close current database connection
      DatabaseService.getInstance().close()

      // Copy backup file to database location
      fs.copyFileSync(backupFilePath, dbPath)

      // Also delete WAL and SHM files if they exist
      const walPath = dbPath + '-wal'
      const shmPath = dbPath + '-shm'
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath)
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath)

      log.info(`Database restored successfully from: ${backupFilePath}`)

      // The application needs to be restarted to reinitialize the database connection
      return { success: true, needsRestart: true }
    } catch (error) {
      log.error('Restore failed:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Get information about the current database
   */
  getDatabaseInfo(): { path: string; size: number; exists: boolean } {
    const dbPath = this.getDatabasePath()
    const exists = fs.existsSync(dbPath)
    const size = exists ? fs.statSync(dbPath).size : 0

    return {
      path: dbPath,
      size,
      exists
    }
  }
}

export default new BackupService()
