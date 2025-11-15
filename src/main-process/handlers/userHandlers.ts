import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import UserRepository from '../services/database/repositories/UserRepository'
import log from 'electron-log'

ipcMain.handle(IPC_CHANNELS.USER_GET_ALL, async () => {
  try {
    return UserRepository.findAll()
  } catch (error) {
    log.error('USER_GET_ALL handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.USER_GET_BY_ID, async (_event, id) => {
  try {
    return UserRepository.findById(id)
  } catch (error) {
    log.error('USER_GET_BY_ID handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.USER_CREATE, async (_event, data) => {
  try {
    return await UserRepository.create(data)
  } catch (error) {
    log.error('USER_CREATE handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.USER_UPDATE, async (_event, data) => {
  try {
    return UserRepository.update(data)
  } catch (error) {
    log.error('USER_UPDATE handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.USER_DELETE, async (_event, id) => {
  try {
    return UserRepository.delete(id)
  } catch (error) {
    log.error('USER_DELETE handler error:', error)
    throw error
  }
})
