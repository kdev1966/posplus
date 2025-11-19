import { ipcMain, app } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import BackupService from '../services/backup/BackupService'
import AuthService from '../services/auth/AuthService'
import { ROLE_IDS } from '@shared/constants'
import log from 'electron-log'

// BACKUP: Create database backup
ipcMain.handle(IPC_CHANNELS.BACKUP_CREATE, async () => {
  try {
    // CRITICAL: Only Administrator role can create backups
    const currentUser = AuthService.getCurrentUser()
    if (!currentUser || currentUser.roleId !== ROLE_IDS.ADMIN) {
      throw new Error('Access denied: Administrator role required for backup creation')
    }

    log.info(`Backup creation initiated by ${currentUser.username} (Admin)`)
    const result = await BackupService.createBackup()

    if (result.success) {
      log.info(`Backup created successfully: ${result.filePath}`)
    } else {
      log.warn(`Backup failed: ${result.error}`)
    }

    return result
  } catch (error) {
    log.error('BACKUP_CREATE handler error:', error)
    throw error
  }
})

// RESTORE: Restore database from backup
ipcMain.handle(IPC_CHANNELS.BACKUP_RESTORE, async () => {
  try {
    // CRITICAL: Only Administrator role can restore backups
    const currentUser = AuthService.getCurrentUser()
    if (!currentUser || currentUser.roleId !== ROLE_IDS.ADMIN) {
      throw new Error('Access denied: Administrator role required for backup restoration')
    }

    log.info(`Backup restoration initiated by ${currentUser.username} (Admin)`)
    const result = await BackupService.restoreBackup()

    if (result.success && result.needsRestart) {
      log.info('Backup restored successfully - Application will restart')
      // Schedule app restart after a brief delay to allow UI to show success message
      setTimeout(() => {
        app.relaunch()
        app.exit(0)
      }, 2000)
    } else if (!result.success) {
      log.warn(`Backup restoration failed: ${result.error}`)
    }

    return result
  } catch (error) {
    log.error('BACKUP_RESTORE handler error:', error)
    throw error
  }
})

// GET INFO: Get current database information
ipcMain.handle(IPC_CHANNELS.BACKUP_GET_INFO, async () => {
  try {
    // CRITICAL: Only Administrator role can view backup info
    const currentUser = AuthService.getCurrentUser()
    if (!currentUser || currentUser.roleId !== ROLE_IDS.ADMIN) {
      throw new Error('Access denied: Administrator role required')
    }

    const info = BackupService.getDatabaseInfo()
    log.debug(`Database info requested: ${JSON.stringify(info)}`)
    return info
  } catch (error) {
    log.error('BACKUP_GET_INFO handler error:', error)
    throw error
  }
})
