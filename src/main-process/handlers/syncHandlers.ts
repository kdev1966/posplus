import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import SyncService from '../services/sync/SyncService'
import ZReportRepository from '../services/database/repositories/ZReportRepository'
import { requirePermission, requireAuth, getCurrentUser } from './handlerUtils'
import log from 'electron-log'

ipcMain.handle(IPC_CHANNELS.SYNC_START, async () => {
  try {
    requirePermission('system.admin')
    return await SyncService.startSync()
  } catch (error) {
    log.error('SYNC_START handler error:', error)
    return false
  }
})

ipcMain.handle(IPC_CHANNELS.SYNC_GET_STATUS, async () => {
  try {
    requireAuth()
    return SyncService.getStatus()
  } catch (error) {
    log.error('SYNC_GET_STATUS handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.SYNC_EXPORT, async (_event, startDate, endDate) => {
  try {
    requirePermission('report.export')
    return await SyncService.exportData(startDate, endDate)
  } catch (error) {
    log.error('SYNC_EXPORT handler error:', error)
    throw error
  }
})

// Report handlers
ipcMain.handle(IPC_CHANNELS.REPORT_Z, async (_event, sessionId) => {
  try {
    requirePermission('report.create')
    const user = getCurrentUser()
    return ZReportRepository.generate(sessionId, user.id)
  } catch (error) {
    log.error('REPORT_Z handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.REPORT_SALES, async (_event, startDate, endDate) => {
  try {
    requirePermission('report.read')
    return ZReportRepository.getSummary(startDate, endDate)
  } catch (error) {
    log.error('REPORT_SALES handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.REPORT_STOCK, async () => {
  try {
    requirePermission('report.read')
    // TODO: Implement stock report
    return {}
  } catch (error) {
    log.error('REPORT_STOCK handler error:', error)
    throw error
  }
})

// System handlers
ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_INFO, async () => {
  try {
    requireAuth()
    return {
      version: '1.0.0',
      platform: process.platform,
      arch: process.arch,
    }
  } catch (error) {
    log.error('SYSTEM_GET_INFO handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_LOGS, async () => {
  try {
    requirePermission('system.admin')
    // TODO: Return actual logs
    return []
  } catch (error) {
    log.error('SYSTEM_GET_LOGS handler error:', error)
    throw error
  }
})
