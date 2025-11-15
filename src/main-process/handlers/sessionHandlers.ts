import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import SessionRepository from '../services/database/repositories/SessionRepository'
import log from 'electron-log'

ipcMain.handle(IPC_CHANNELS.SESSION_OPEN, async (_event, userId, openingCash) => {
  try {
    return SessionRepository.open(userId, openingCash)
  } catch (error) {
    log.error('SESSION_OPEN handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.SESSION_CLOSE, async (_event, sessionId, closingCash) => {
  try {
    return SessionRepository.close(sessionId, closingCash)
  } catch (error) {
    log.error('SESSION_CLOSE handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.SESSION_GET_CURRENT, async () => {
  try {
    return SessionRepository.findCurrent()
  } catch (error) {
    log.error('SESSION_GET_CURRENT handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.SESSION_GET_BY_ID, async (_event, id) => {
  try {
    return SessionRepository.findById(id)
  } catch (error) {
    log.error('SESSION_GET_BY_ID handler error:', error)
    throw error
  }
})
