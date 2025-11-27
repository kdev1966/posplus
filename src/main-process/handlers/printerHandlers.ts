import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import PrinterService from '../services/printer/PrinterService'
import { getPrinterConfig, setPrinterConfig } from '../utils/printerConfig'
import log from 'electron-log'
import { requirePermission, requireAuth } from './handlerUtils'

ipcMain.handle(IPC_CHANNELS.PRINTER_PRINT_TICKET, async (_event, ticketId: number, language: 'fr' | 'ar' = 'fr') => {
  try {
    requireAuth()
    const success = await PrinterService.printTicket(ticketId, language)
    return { success, error: success ? null : 'Failed to print ticket' }
  } catch (error: any) {
    log.error('PRINTER_PRINT_TICKET handler error:', error)
    const errorMessage = error?.message || 'Printer error occurred'
    return { success: false, error: errorMessage }
  }
})

ipcMain.handle(IPC_CHANNELS.PRINTER_PRINT_TEST, async () => {
  try {
    requireAuth()
    const success = await PrinterService.printTestTicket()
    return { success, error: success ? null : 'Failed to print test ticket' }
  } catch (error: any) {
    log.error('PRINTER_PRINT_TEST handler error:', error)
    const errorMessage = error?.message || 'Printer test error occurred'
    return { success: false, error: errorMessage }
  }
})

ipcMain.handle(IPC_CHANNELS.PRINTER_GET_TEST_PREVIEW, async () => {
  try {
    requireAuth()
    return PrinterService.getTestTicketHTML()
  } catch (error: any) {
    log.error('PRINTER_GET_TEST_PREVIEW handler error:', error)
    return ''
  }
})

ipcMain.handle(IPC_CHANNELS.PRINTER_GET_TICKET_PREVIEW, async (_event, ticketId: number, language: 'fr' | 'ar' = 'fr') => {
  try {
    requireAuth()
    return PrinterService.getTicketHTML(ticketId, language) || ''
  } catch (error: any) {
    log.error('PRINTER_GET_TICKET_PREVIEW handler error:', error)
    return ''
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

ipcMain.handle(IPC_CHANNELS.PRINTER_GET_CONFIG, async () => {
  try {
    requireAuth()
    return await getPrinterConfig()
  } catch (error: any) {
    log.error('PRINTER_GET_CONFIG handler error:', error)
    return {
      printerName: 'POS80 Printer',
      port: 'CP001',
      type: 'EPSON',
      error: error?.message,
    } as any
  }
})

ipcMain.handle(IPC_CHANNELS.PRINTER_SET_CONFIG, async (_event, cfg) => {
  try {
    requireAuth()
    await setPrinterConfig(cfg)
    return true
  } catch (error: any) {
    log.error('PRINTER_SET_CONFIG handler error:', error)
    return false
  }
})

ipcMain.handle(IPC_CHANNELS.PRINTER_RECONNECT, async () => {
  try {
    requireAuth()
    const success = await PrinterService.reconnect()
    return success
  } catch (error: any) {
    log.error('PRINTER_RECONNECT handler error:', error)
    return false
  }
})

// Z Report printing handlers
ipcMain.handle(IPC_CHANNELS.PRINTER_GET_ZREPORT_PREVIEW, async (_event, sessionId: number, language: 'fr' | 'ar' = 'fr') => {
  log.info(`PRINTER_GET_ZREPORT_PREVIEW called: sessionId=${sessionId}, language=${language}`)
  try {
    requireAuth()
    const html = PrinterService.getZReportHTML(sessionId, language)
    log.info(`PRINTER_GET_ZREPORT_PREVIEW result: ${html ? `${html.length} chars` : 'null'}`)
    return html || ''
  } catch (error: any) {
    log.error('PRINTER_GET_ZREPORT_PREVIEW handler error:', error)
    return ''
  }
})

ipcMain.handle(IPC_CHANNELS.PRINTER_PRINT_ZREPORT, async (_event, sessionId: number, language: 'fr' | 'ar' = 'fr') => {
  try {
    requireAuth()
    const success = await PrinterService.printZReport(sessionId, language)
    return { success, error: success ? null : 'Failed to print Z Report' }
  } catch (error: any) {
    log.error('PRINTER_PRINT_ZREPORT handler error:', error)
    const errorMessage = error?.message || 'Z Report print error occurred'
    return { success: false, error: errorMessage }
  }
})
