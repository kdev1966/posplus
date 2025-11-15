import TicketRepository from '../database/repositories/TicketRepository'
import { Ticket, CreateTicketDTO } from '@shared/types'
import log from 'electron-log'

class TicketService {
  async createTicket(data: CreateTicketDTO): Promise<Ticket> {
    try {
      log.info(`Creating ticket for user ${data.userId}`)
      const ticket = TicketRepository.create(data)
      log.info(`Ticket created: ${ticket.ticketNumber} (ID: ${ticket.id})`)
      return ticket
    } catch (error) {
      log.error('Failed to create ticket:', error)
      throw error
    }
  }

  async getTicketById(id: number): Promise<Ticket | null> {
    try {
      return TicketRepository.findById(id)
    } catch (error) {
      log.error('Failed to get ticket:', error)
      throw error
    }
  }

  async getAllTickets(filters?: {
    startDate?: string
    endDate?: string
    status?: string
  }): Promise<Ticket[]> {
    try {
      return TicketRepository.findAll(filters)
    } catch (error) {
      log.error('Failed to get tickets:', error)
      throw error
    }
  }

  async getTicketsBySession(sessionId: number): Promise<Ticket[]> {
    try {
      return TicketRepository.findBySession(sessionId)
    } catch (error) {
      log.error('Failed to get tickets by session:', error)
      throw error
    }
  }

  async cancelTicket(id: number, reason: string): Promise<boolean> {
    try {
      log.info(`Cancelling ticket ${id}`)
      const result = TicketRepository.cancel(id, reason)
      log.info(`Ticket ${id} cancelled`)
      return result
    } catch (error) {
      log.error('Failed to cancel ticket:', error)
      throw error
    }
  }

  async refundTicket(id: number, reason: string): Promise<boolean> {
    try {
      log.info(`Refunding ticket ${id}`)
      const result = TicketRepository.refund(id, reason)
      log.info(`Ticket ${id} refunded`)
      return result
    } catch (error) {
      log.error('Failed to refund ticket:', error)
      throw error
    }
  }

  async getDailySales(date?: string): Promise<any> {
    try {
      return TicketRepository.getDailySales(date)
    } catch (error) {
      log.error('Failed to get daily sales:', error)
      throw error
    }
  }

  async getTopProducts(limit = 10): Promise<any[]> {
    try {
      return TicketRepository.getTopProducts(limit)
    } catch (error) {
      log.error('Failed to get top products:', error)
      throw error
    }
  }
}

export default new TicketService()
