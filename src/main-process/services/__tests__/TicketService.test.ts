import TicketService from '../ticket/TicketService'
import DatabaseService from '../database/db'

describe('TicketService', () => {
  beforeAll(() => {
    DatabaseService.getInstance().initialize()
  })

  afterAll(() => {
    DatabaseService.getInstance().close()
  })

  describe('createTicket', () => {
    it('should create a ticket', async () => {
      const ticketData = {
        userId: 1,
        sessionId: 1,
        lines: [
          {
            productId: 1,
            quantity: 2,
            unitPrice: 10.00,
          },
        ],
        payments: [
          {
            method: 'cash' as const,
            amount: 20.00,
          },
        ],
      }

      const ticket = await TicketService.createTicket(ticketData)

      expect(ticket).toBeDefined()
      expect(ticket.id).toBeDefined()
      expect(ticket.ticketNumber).toBeDefined()
      expect(ticket.lines).toHaveLength(1)
      expect(ticket.payments).toHaveLength(1)
    })
  })

  describe('getTicketById', () => {
    it('should get a ticket by id', async () => {
      const ticket = await TicketService.getTicketById(1)
      expect(ticket).toBeDefined()
    })
  })

  describe('getAllTickets', () => {
    it('should get all tickets', async () => {
      const tickets = await TicketService.getAllTickets()
      expect(Array.isArray(tickets)).toBe(true)
    })

    it('should filter tickets by date', async () => {
      const tickets = await TicketService.getAllTickets({
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      })
      expect(Array.isArray(tickets)).toBe(true)
    })
  })
})
