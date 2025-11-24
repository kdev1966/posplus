import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import StoreSettingsRepository from '../services/database/repositories/StoreSettingsRepository'
import log from 'electron-log'
import { requireAuth } from './handlerUtils'

// Get store settings
ipcMain.handle(IPC_CHANNELS.STORE_SETTINGS_GET, async () => {
  try {
    requireAuth()
    return StoreSettingsRepository.getSettings()
  } catch (error: any) {
    log.error('STORE_SETTINGS_GET handler error:', error)
    throw error
  }
})

// Update store settings
ipcMain.handle(IPC_CHANNELS.STORE_SETTINGS_UPDATE, async (_event, data) => {
  try {
    requireAuth()
    return StoreSettingsRepository.updateSettings(data)
  } catch (error: any) {
    log.error('STORE_SETTINGS_UPDATE handler error:', error)
    throw error
  }
})

log.info('Store settings handlers registered')
