import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import SessionRepository from '../services/database/repositories/SessionRepository'
import log from 'electron-log'
import { requirePermission } from './handlerUtils'

ipcMain.handle(IPC_CHANNELS.SESSION_OPEN, async (_event, userId, openingCash) => {
  try {
    requirePermission('session.manage')
    return SessionRepository.open(userId, openingCash)
  } catch (error) {
    log.error('SESSION_OPEN handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.SESSION_CLOSE, async (_event, sessionId, closingCash) => {
  try {
    requirePermission('session.manage')
    return SessionRepository.close(sessionId, closingCash)
  } catch (error) {
    log.error('SESSION_CLOSE handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.SESSION_GET_CURRENT, async () => {
  try {
    requirePermission('session.manage')
    return SessionRepository.findCurrent()
  } catch (error) {
    log.error('SESSION_GET_CURRENT handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.SESSION_GET_BY_ID, async (_event, id) => {
  try {
    requirePermission('session.manage')
    return SessionRepository.findById(id)
  } catch (error) {
    log.error('SESSION_GET_BY_ID handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.SESSION_GET_STATS, async (_event, sessionId) => {
  try {
    requirePermission('session.manage')
    return SessionRepository.getSessionStats(sessionId)
  } catch (error) {
    log.error('SESSION_GET_STATS handler error:', error)
    throw error
  }
})
