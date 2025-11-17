import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import PrinterService from '../services/printer/PrinterService'
import log from 'electron-log'
import { requirePermission, requireAuth } from './handlerUtils'

ipcMain.handle(IPC_CHANNELS.PRINTER_PRINT_TICKET, async (_event, ticketId) => {
  try {
    requireAuth()
    const success = await PrinterService.printTicket(ticketId)
    return { success, error: success ? null : 'Failed to print ticket' }
  } catch (error: any) {
    log.error('PRINTER_PRINT_TICKET handler error:', error)
    const errorMessage = error?.message || 'Printer error occurred'
    return { success: false, error: errorMessage }
  }
})

ipcMain.handle(IPC_CHANNELS.PRINTER_OPEN_DRAWER, async () => {
  try {
    requirePermission('session.update')
    const success = await PrinterService.openDrawer()
    return { success, error: success ? null : 'Failed to open cash drawer' }
  } catch (error: any) {
    log.error('PRINTER_OPEN_DRAWER handler error:', error)
    const errorMessage = error?.message || 'Failed to open cash drawer'
    return { success: false, error: errorMessage }
  }
})

ipcMain.handle(IPC_CHANNELS.PRINTER_GET_STATUS, async () => {
  try {
    requireAuth()
    return await PrinterService.getStatus()
  } catch (error: any) {
    log.error('PRINTER_GET_STATUS handler error:', error)
    return {
      connected: false,
      ready: false,
      error: error?.message || 'Unable to get printer status',
    }
  }
})
