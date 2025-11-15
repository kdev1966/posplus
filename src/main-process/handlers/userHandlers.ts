import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import UserRepository from '../services/database/repositories/UserRepository'
import { requirePermission } from './handlerUtils'
import log from 'electron-log'

ipcMain.handle(IPC_CHANNELS.USER_GET_ALL, async () => {
  try {
    requirePermission('user.read')
    return UserRepository.findAll()
  } catch (error) {
    log.error('USER_GET_ALL handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.USER_GET_BY_ID, async (_event, id) => {
  try {
    requirePermission('user.read')
    return UserRepository.findById(id)
  } catch (error) {
    log.error('USER_GET_BY_ID handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.USER_CREATE, async (_event, data) => {
  try {
    requirePermission('user.create')
    return await UserRepository.create(data)
  } catch (error) {
    log.error('USER_CREATE handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.USER_UPDATE, async (_event, data) => {
  try {
    requirePermission('user.update')
    return UserRepository.update(data)
  } catch (error) {
    log.error('USER_UPDATE handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.USER_DELETE, async (_event, id) => {
  try {
    requirePermission('user.delete')
    return UserRepository.delete(id)
  } catch (error) {
    log.error('USER_DELETE handler error:', error)
    throw error
  }
})
