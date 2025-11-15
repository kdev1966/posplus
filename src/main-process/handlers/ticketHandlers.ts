import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import TicketService from '../services/ticket/TicketService'
import log from 'electron-log'

ipcMain.handle(IPC_CHANNELS.TICKET_CREATE, async (_event, data) => {
  try {
    return await TicketService.createTicket(data)
  } catch (error) {
    log.error('TICKET_CREATE handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.TICKET_GET_BY_ID, async (_event, id) => {
  try {
    return await TicketService.getTicketById(id)
  } catch (error) {
    log.error('TICKET_GET_BY_ID handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.TICKET_GET_ALL, async (_event, filters) => {
  try {
    return await TicketService.getAllTickets(filters)
  } catch (error) {
    log.error('TICKET_GET_ALL handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.TICKET_GET_BY_SESSION, async (_event, sessionId) => {
  try {
    return await TicketService.getTicketsBySession(sessionId)
  } catch (error) {
    log.error('TICKET_GET_BY_SESSION handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.TICKET_CANCEL, async (_event, id, reason) => {
  try {
    return await TicketService.cancelTicket(id, reason)
  } catch (error) {
    log.error('TICKET_CANCEL handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.TICKET_REFUND, async (_event, id, reason) => {
  try {
    return await TicketService.refundTicket(id, reason)
  } catch (error) {
    log.error('TICKET_REFUND handler error:', error)
    throw error
  }
})
