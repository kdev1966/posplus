import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import CsvService from '../services/csv/CsvService'
import AuthService from '../services/auth/AuthService'
import { ROLE_IDS } from '@shared/constants'
import log from 'electron-log'

// EXCEL: Generate template file
ipcMain.handle(IPC_CHANNELS.EXCEL_GENERATE_TEMPLATE, async () => {
  try {
    // CRITICAL: Only Administrator role can generate templates
    const currentUser = AuthService.getCurrentUser()
    if (!currentUser || currentUser.roleId !== ROLE_IDS.ADMIN) {
      throw new Error('Access denied: Administrator role required for template generation')
    }

    log.info(`CSV template generation initiated by ${currentUser.username} (Admin)`)
    const result = await CsvService.generateTemplate()

    if (result.success) {
      log.info(`Template generated successfully: ${result.filePath}`)
    } else {
      log.warn(`Template generation failed: ${result.error}`)
    }

    return result
  } catch (error) {
    log.error('EXCEL_GENERATE_TEMPLATE handler error:', error)
    throw error
  }
})

// EXCEL: Export current data to Excel
ipcMain.handle(IPC_CHANNELS.EXCEL_EXPORT_DATA, async () => {
  try {
    // CRITICAL: Only Administrator role can export data
    const currentUser = AuthService.getCurrentUser()
    if (!currentUser || currentUser.roleId !== ROLE_IDS.ADMIN) {
      throw new Error('Access denied: Administrator role required for data export')
    }

    log.info(`CSV export initiated by ${currentUser.username} (Admin)`)
    const result = await CsvService.exportData()

    if (result.success) {
      log.info(`Data exported successfully: ${result.filePath}`)
    } else {
      log.warn(`Export failed: ${result.error}`)
    }

    return result
  } catch (error) {
    log.error('EXCEL_EXPORT_DATA handler error:', error)
    throw error
  }
})

// EXCEL: Import data from Excel file
ipcMain.handle(IPC_CHANNELS.EXCEL_IMPORT_DATA, async () => {
  try {
    // CRITICAL: Only Administrator role can import data (modifies database)
    const currentUser = AuthService.getCurrentUser()
    if (!currentUser || currentUser.roleId !== ROLE_IDS.ADMIN) {
      throw new Error('Access denied: Administrator role required for data import')
    }

    log.info(`CSV import initiated by ${currentUser.username} (Admin)`)
    const result = await CsvService.importData()

    if (result.success) {
      log.info(
        `Import completed: ${result.categoriesImported} categories, ${result.productsImported} products`
      )
      if (result.errors && result.errors.length > 0) {
        log.warn(`Import completed with ${result.errors.length} errors`)
      }
    } else {
      log.warn(`Import failed: ${result.error}`)
    }

    return result
  } catch (error) {
    log.error('EXCEL_IMPORT_DATA handler error:', error)
    throw error
  }
})
