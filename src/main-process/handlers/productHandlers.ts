import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import ProductRepository from '../services/database/repositories/ProductRepository'
import log from 'electron-log'
import { requirePermission } from './handlerUtils'

ipcMain.handle(IPC_CHANNELS.PRODUCT_GET_ALL, async () => {
  try {
    requirePermission('product.read')
    return ProductRepository.findAll()
  } catch (error) {
    log.error('PRODUCT_GET_ALL handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.PRODUCT_GET_BY_ID, async (_event, id) => {
  try {
    requirePermission('product.read')
    return ProductRepository.findById(id)
  } catch (error) {
    log.error('PRODUCT_GET_BY_ID handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.PRODUCT_GET_BY_BARCODE, async (_event, barcode) => {
  try {
    requirePermission('product.read')
    return ProductRepository.findByBarcode(barcode)
  } catch (error) {
    log.error('PRODUCT_GET_BY_BARCODE handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.PRODUCT_SEARCH, async (_event, query) => {
  try {
    requirePermission('product.read')
    return ProductRepository.search(query)
  } catch (error) {
    log.error('PRODUCT_SEARCH handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.PRODUCT_CREATE, async (_event, data) => {
  try {
    requirePermission('product.create')
    return ProductRepository.create(data)
  } catch (error) {
    log.error('PRODUCT_CREATE handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.PRODUCT_UPDATE, async (_event, data) => {
  try {
    requirePermission('product.update')
    return ProductRepository.update(data)
  } catch (error) {
    log.error('PRODUCT_UPDATE handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.PRODUCT_DELETE, async (_event, id) => {
  try {
    requirePermission('product.delete')
    return ProductRepository.delete(id)
  } catch (error) {
    log.error('PRODUCT_DELETE handler error:', error)
    throw error
  }
})
