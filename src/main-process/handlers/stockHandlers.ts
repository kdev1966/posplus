import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import StockRepository from '../services/database/repositories/StockRepository'
import AuthService from '../services/auth/AuthService'
import log from 'electron-log'

ipcMain.handle(IPC_CHANNELS.STOCK_ADJUST, async (_event, productId, quantity, type, notes) => {
  try {
    const user = AuthService.getCurrentUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    StockRepository.adjust(productId, quantity, type, user.id, undefined, notes)
    return true
  } catch (error) {
    log.error('STOCK_ADJUST handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.STOCK_GET_LOGS, async (_event, productId) => {
  try {
    if (productId) {
      return StockRepository.findByProduct(productId)
    }
    return StockRepository.findAll()
  } catch (error) {
    log.error('STOCK_GET_LOGS handler error:', error)
    throw error
  }
})
