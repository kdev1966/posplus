import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import TicketService from '../services/ticket/TicketService'
import log from 'electron-log'
import { requirePermission } from './handlerUtils'

ipcMain.handle(IPC_CHANNELS.TICKET_CREATE, async (_event, data) => {
  try {
    requirePermission('ticket.create')
    return await TicketService.createTicket(data)
  } catch (error) {
    log.error('TICKET_CREATE handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.TICKET_GET_BY_ID, async (_event, id) => {
  try {
    requirePermission('ticket.read')
    return await TicketService.getTicketById(id)
  } catch (error) {
    log.error('TICKET_GET_BY_ID handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.TICKET_GET_ALL, async (_event, filters) => {
  try {
    requirePermission('ticket.read')
    return await TicketService.getAllTickets(filters)
  } catch (error) {
    log.error('TICKET_GET_ALL handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.TICKET_GET_BY_SESSION, async (_event, sessionId) => {
  try {
    requirePermission('ticket.read')
    return await TicketService.getTicketsBySession(sessionId)
  } catch (error) {
    log.error('TICKET_GET_BY_SESSION handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.TICKET_UPDATE, async (_event, id, data) => {
  try {
    requirePermission('ticket.update')
    return await TicketService.updateTicket(id, data)
  } catch (error) {
    log.error('TICKET_UPDATE handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.TICKET_CANCEL, async (_event, id, reason) => {
  try {
    requirePermission('ticket.update')
    return await TicketService.cancelTicket(id, reason)
  } catch (error) {
    log.error('TICKET_CANCEL handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.TICKET_REFUND, async (_event, id, reason) => {
  try {
    requirePermission('ticket.update')
    return await TicketService.refundTicket(id, reason)
  } catch (error) {
    log.error('TICKET_REFUND handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.TICKET_PARTIAL_REFUND, async (_event, id, lines, reason) => {
  try {
    requirePermission('ticket.update')
    return await TicketService.partialRefundTicket(id, lines, reason)
  } catch (error) {
    log.error('TICKET_PARTIAL_REFUND handler error:', error)
    throw error
  }
})
