import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import PrinterService from '../services/printer/PrinterService'
import log from 'electron-log'

ipcMain.handle(IPC_CHANNELS.PRINTER_PRINT_TICKET, async (_event, ticketId) => {
  try {
    return await PrinterService.printTicket(ticketId)
  } catch (error) {
    log.error('PRINTER_PRINT_TICKET handler error:', error)
    return false
  }
})

ipcMain.handle(IPC_CHANNELS.PRINTER_OPEN_DRAWER, async () => {
  try {
    return await PrinterService.openDrawer()
  } catch (error) {
    log.error('PRINTER_OPEN_DRAWER handler error:', error)
    return false
  }
})

ipcMain.handle(IPC_CHANNELS.PRINTER_GET_STATUS, async () => {
  try {
    return await PrinterService.getStatus()
  } catch (error) {
    log.error('PRINTER_GET_STATUS handler error:', error)
    return { connected: false, ready: false }
  }
})
