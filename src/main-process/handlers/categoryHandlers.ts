import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import CategoryRepository from '../services/database/repositories/CategoryRepository'
import log from 'electron-log'

ipcMain.handle(IPC_CHANNELS.CATEGORY_GET_ALL, async () => {
  try {
    return CategoryRepository.findAll()
  } catch (error) {
    log.error('CATEGORY_GET_ALL handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.CATEGORY_GET_BY_ID, async (_event, id) => {
  try {
    return CategoryRepository.findById(id)
  } catch (error) {
    log.error('CATEGORY_GET_BY_ID handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.CATEGORY_CREATE, async (_event, data) => {
  try {
    return CategoryRepository.create(data)
  } catch (error) {
    log.error('CATEGORY_CREATE handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.CATEGORY_UPDATE, async (_event, data) => {
  try {
    return CategoryRepository.update(data)
  } catch (error) {
    log.error('CATEGORY_UPDATE handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.CATEGORY_DELETE, async (_event, id) => {
  try {
    return CategoryRepository.delete(id)
  } catch (error) {
    log.error('CATEGORY_DELETE handler error:', error)
    throw error
  }
})
