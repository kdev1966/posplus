import DatabaseService from '../db'
import { Ticket, TicketLine, Payment, CreateTicketDTO } from '@shared/types'
import log from 'electron-log'
import StockRepository from './StockRepository'
import P2PSyncService from '../../p2p/SyncService'

export class TicketRepository {
  private get db() {
    return DatabaseService.getInstance().getDatabase()
  }

  private mapTicketFromDb(dbTicket: any): Ticket {
    return {
      id: dbTicket.id,
      ticketNumber: dbTicket.ticket_number,
      userId: dbTicket.user_id,
      customerId: dbTicket.customer_id,
      subtotal: dbTicket.subtotal,
      discountAmount: dbTicket.discount_amount,
      totalAmount: dbTicket.total_amount,
      status: dbTicket.status,
      sessionId: dbTicket.session_id,
      createdAt: dbTicket.created_at,
      updatedAt: dbTicket.updated_at,
      lines: [],
      payments: [],
    }
  }

  private mapTicketLineFromDb(dbLine: any): TicketLine {
    return {
      id: dbLine.id,
      ticketId: dbLine.ticket_id,
      productId: dbLine.product_id,
      productName: dbLine.product_name,
      productSku: dbLine.product_sku,
      quantity: dbLine.quantity,
      unitPrice: dbLine.unit_price,
      discountRate: dbLine.discount_rate || 0,
      discountAmount: dbLine.discount_amount,
      totalAmount: dbLine.total_amount,
      createdAt: dbLine.created_at,
    }
  }

  private mapPaymentFromDb(dbPayment: any): Payment {
    return {
      id: dbPayment.id,
      ticketId: dbPayment.ticket_id,
      method: dbPayment.method,
      amount: dbPayment.amount,
      reference: dbPayment.reference,
      createdAt: dbPayment.created_at,
    }
  }

  findAll(filters?: { startDate?: string; endDate?: string; status?: string }): Ticket[] {
    try {
      let sql = 'SELECT * FROM tickets WHERE 1=1'
      const params: any[] = []

      if (filters?.startDate) {
        sql += ' AND DATE(created_at) >= DATE(?)'
        params.push(filters.startDate)
      }
      if (filters?.endDate) {
        sql += ' AND DATE(created_at) <= DATE(?)'
        params.push(filters.endDate)
      }
      if (filters?.status) {
        sql += ' AND status = ?'
        params.push(filters.status)
      }

      sql += ' ORDER BY created_at DESC'

      const stmt = this.db.prepare(sql)
      const tickets = stmt.all(...params) as Ticket[]

      // Load lines and payments for each ticket
      return tickets.map((ticket) => this.loadTicketDetails(ticket))
    } catch (error) {
      log.error('TicketRepository.findAll failed:', error)
      throw error
    }
  }

  findById(id: number): Ticket | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM tickets WHERE id = ?')
      const ticket = stmt.get(id) as Ticket | undefined

      if (!ticket) {
        return null
      }

      return this.loadTicketDetails(ticket)
    } catch (error) {
      log.error('TicketRepository.findById failed:', error)
      throw error
    }
  }

  findByTicketNumber(ticketNumber: string): Ticket | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM tickets WHERE ticket_number = ?')
      const ticket = stmt.get(ticketNumber) as Ticket | undefined

      if (!ticket) {
        return null
      }

      return this.loadTicketDetails(ticket)
    } catch (error) {
      log.error('TicketRepository.findByTicketNumber failed:', error)
      throw error
    }
  }

  findBySession(sessionId: number): Ticket[] {
    try {
      const stmt = this.db.prepare('SELECT * FROM tickets WHERE session_id = ? ORDER BY created_at DESC')
      const tickets = stmt.all(sessionId) as Ticket[]

      return tickets.map((ticket) => this.loadTicketDetails(ticket))
    } catch (error) {
      log.error('TicketRepository.findBySession failed:', error)
      throw error
    }
  }

  create(data: CreateTicketDTO): Ticket {
    const transaction = this.db.transaction(() => {
      try {
        // Generate ticket number
        const ticketNumber = this.generateTicketNumber()

        // Calculate totals - TTC pricing (tax included)
        let subtotal = 0
        let discountAmount = 0

        data.lines.forEach((line) => {
          const lineSubtotal = line.quantity * line.unitPrice
          const lineDiscount = line.discountAmount || 0

          subtotal += lineSubtotal
          discountAmount += lineDiscount
        })

        const totalAmount = subtotal - discountAmount

        // Insert ticket
        const ticketStmt = this.db.prepare(`
          INSERT INTO tickets (
            ticket_number, user_id, customer_id, session_id,
            subtotal, discount_amount, total_amount, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)

        const ticketResult = ticketStmt.run(
          ticketNumber,
          data.userId,
          data.customerId || null,
          data.sessionId,
          subtotal,
          discountAmount,
          totalAmount,
          'completed'
        )

        const ticketId = ticketResult.lastInsertRowid as number

        // Insert ticket lines
        const lineStmt = this.db.prepare(`
          INSERT INTO ticket_lines (
            ticket_id, product_id, product_name, product_sku,
            quantity, unit_price, discount_amount, total_amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)

        for (const line of data.lines) {
          // Get product details including current stock
          const productStmt = this.db.prepare('SELECT name, sku, stock FROM products WHERE id = ?')
          const product = productStmt.get(line.productId) as any

          if (!product) {
            throw new Error(`Product not found: ${line.productId}`)
          }

          // Check if sufficient stock is available
          if (product.stock < line.quantity) {
            throw new Error(
              `Insufficient stock for product "${product.name}". Available: ${product.stock}, Required: ${line.quantity}`
            )
          }

          const lineSubtotal = line.quantity * line.unitPrice
          const lineDiscount = line.discountAmount || 0
          const lineTotal = lineSubtotal - lineDiscount

          lineStmt.run(
            ticketId,
            line.productId,
            product.name,
            product.sku,
            line.quantity,
            line.unitPrice,
            lineDiscount,
            lineTotal
          )

          // Update product stock with audit trail using StockRepository
          StockRepository.adjust(
            line.productId,
            line.quantity,
            'sale',
            data.userId,
            ticketNumber,
            `Vente ticket ${ticketNumber}`
          )
        }

        // Insert payments
        const paymentStmt = this.db.prepare(`
          INSERT INTO payments (ticket_id, method, amount, reference)
          VALUES (?, ?, ?, ?)
        `)

        for (const payment of data.payments) {
          paymentStmt.run(
            ticketId,
            payment.method,
            payment.amount,
            payment.reference || null
          )
        }

        const ticket = this.findById(ticketId)
        if (!ticket) {
          throw new Error('Failed to create ticket')
        }

        log.info(`Ticket created: ${ticket.ticketNumber} (ID: ${ticket.id})`)

        // Synchronize with P2P peers
        try {
          P2PSyncService.syncTicket(ticket)
          log.info(`P2P: Ticket ${ticket.ticketNumber} synchronized with peers`)
        } catch (error) {
          log.error('P2P: Failed to sync ticket:', error)
          // Ne pas bloquer la création si la sync échoue
        }

        return ticket
      } catch (error) {
        log.error('TicketRepository.create transaction failed:', error)
        throw error
      }
    })

    return transaction()
  }

  // Méthode pour créer un ticket depuis sync P2P (pas de re-broadcast)
  createFromSync(ticketData: any): Ticket {
    const transaction = this.db.transaction(() => {
      try {
        log.info(`P2P: Creating ticket from sync: ${ticketData.ticketNumber}`)

        // Insert ticket
        const ticketStmt = this.db.prepare(`
          INSERT INTO tickets (
            ticket_number, user_id, customer_id, session_id,
            subtotal, discount_amount, total_amount, status,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        const ticketResult = ticketStmt.run(
          ticketData.ticketNumber,
          ticketData.userId,
          ticketData.customerId || null,
          ticketData.sessionId,
          ticketData.subtotal,
          ticketData.discountAmount,
          ticketData.totalAmount,
          ticketData.status || 'completed',
          ticketData.createdAt,
          ticketData.updatedAt
        )

        const ticketId = ticketResult.lastInsertRowid as number

        // Insert ticket lines
        const lineStmt = this.db.prepare(`
          INSERT INTO ticket_lines (
            ticket_id, product_id, product_name, product_sku,
            quantity, unit_price, discount_amount, total_amount,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        for (const line of ticketData.lines) {
          lineStmt.run(
            ticketId,
            line.productId,
            line.productName,
            line.productSku,
            line.quantity,
            line.unitPrice,
            line.discountAmount || 0,
            line.totalAmount,
            line.createdAt
          )
        }

        // Insert payments
        const paymentStmt = this.db.prepare(`
          INSERT INTO payments (ticket_id, method, amount, reference, created_at)
          VALUES (?, ?, ?, ?, ?)
        `)

        for (const payment of ticketData.payments) {
          paymentStmt.run(
            ticketId,
            payment.method,
            payment.amount,
            payment.reference || null,
            payment.createdAt
          )
        }

        const ticket = this.findById(ticketId)
        if (!ticket) {
          throw new Error('Failed to create ticket from sync')
        }

        log.info(`P2P: Ticket ${ticket.ticketNumber} created from sync successfully`)
        return ticket
      } catch (error) {
        log.error('TicketRepository.createFromSync failed:', error)
        throw error
      }
    })

    return transaction()
  }

  cancel(id: number, reason: string, userId?: number): boolean {
    const transaction = this.db.transaction(() => {
      try {
        const ticket = this.findById(id)
        if (!ticket) {
          throw new Error('Ticket not found')
        }

        if (ticket.status !== 'completed') {
          throw new Error('Only completed tickets can be cancelled')
        }

        // Restore stock with audit trail
        for (const line of ticket.lines) {
          StockRepository.adjust(
            line.productId,
            line.quantity,
            'return',
            userId || ticket.userId,
            ticket.ticketNumber,
            `Annulation ticket ${ticket.ticketNumber}: ${reason}`
          )
        }

        // Update ticket status
        const updateStmt = this.db.prepare('UPDATE tickets SET status = ?, notes = ? WHERE id = ?')
        const result = updateStmt.run('cancelled', reason, id)

        log.info(`Ticket cancelled: ${ticket.ticketNumber} (ID: ${ticket.id})`)
        return result.changes > 0
      } catch (error) {
        log.error('TicketRepository.cancel transaction failed:', error)
        throw error
      }
    })

    return transaction()
  }

  refund(id: number, reason: string, userId?: number): boolean {
    const transaction = this.db.transaction(() => {
      try {
        const ticket = this.findById(id)
        if (!ticket) {
          throw new Error('Ticket not found')
        }

        if (ticket.status !== 'completed') {
          throw new Error('Only completed tickets can be refunded')
        }

        // Restore stock with audit trail
        for (const line of ticket.lines) {
          StockRepository.adjust(
            line.productId,
            line.quantity,
            'return',
            userId || ticket.userId,
            ticket.ticketNumber,
            `Remboursement ticket ${ticket.ticketNumber}: ${reason}`
          )
        }

        // Update ticket status
        const updateStmt = this.db.prepare('UPDATE tickets SET status = ?, notes = ? WHERE id = ?')
        const result = updateStmt.run('refunded', reason, id)

        log.info(`Ticket refunded: ${ticket.ticketNumber} (ID: ${ticket.id})`)
        return result.changes > 0
      } catch (error) {
        log.error('TicketRepository.refund transaction failed:', error)
        throw error
      }
    })

    return transaction()
  }

  update(id: number, data: { lines: TicketLine[]; subtotal: number; discountAmount: number; totalAmount: number }): Ticket {
    const transaction = this.db.transaction(() => {
      try {
        const ticket = this.findById(id)
        if (!ticket) {
          throw new Error('Ticket not found')
        }

        if (ticket.status !== 'completed') {
          throw new Error('Only completed tickets can be updated')
        }

        // Calculate the difference between old and new total amounts
        const oldTotalAmount = ticket.totalAmount
        const newTotalAmount = data.totalAmount
        const amountDifference = oldTotalAmount - newTotalAmount

        // Update ticket totals
        const ticketStmt = this.db.prepare(`
          UPDATE tickets
          SET subtotal = ?, discount_amount = ?, total_amount = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        ticketStmt.run(data.subtotal, data.discountAmount, data.totalAmount, id)

        // Update ticket lines
        const lineStmt = this.db.prepare(`
          UPDATE ticket_lines
          SET quantity = ?, discount_rate = ?, discount_amount = ?, total_amount = ?
          WHERE id = ?
        `)

        for (const line of data.lines) {
          // Calculate stock difference
          const originalLine = ticket.lines.find(l => l.id === line.id)
          if (originalLine && originalLine.quantity !== line.quantity) {
            const quantityDiff = line.quantity - originalLine.quantity

            if (quantityDiff > 0) {
              // More items sold - reduce stock
              StockRepository.adjust(
                line.productId,
                quantityDiff,
                'sale',
                ticket.userId,
                ticket.ticketNumber,
                `Modification ticket ${ticket.ticketNumber} - augmentation quantité`
              )
            } else {
              // Fewer items sold - restore stock
              StockRepository.adjust(
                line.productId,
                Math.abs(quantityDiff),
                'return',
                ticket.userId,
                ticket.ticketNumber,
                `Modification ticket ${ticket.ticketNumber} - réduction quantité`
              )
            }
          }

          lineStmt.run(line.quantity, line.discountRate, line.discountAmount, line.totalAmount, line.id)
        }

        // Update payment amounts proportionally if total amount changed
        if (amountDifference > 0.001 && ticket.payments.length > 0) {
          // Calculate the reduction ratio
          const reductionRatio = newTotalAmount / oldTotalAmount

          // Update each payment proportionally
          const paymentStmt = this.db.prepare(`
            UPDATE payments
            SET amount = ?
            WHERE id = ?
          `)

          for (const payment of ticket.payments) {
            const newPaymentAmount = payment.amount * reductionRatio
            paymentStmt.run(newPaymentAmount, payment.id)
            log.info(`Payment ${payment.id} updated: ${payment.amount} DT → ${newPaymentAmount.toFixed(3)} DT (${payment.method})`)
          }

          log.info(`Ticket ${ticket.ticketNumber}: Total amount reduced from ${oldTotalAmount} DT to ${newTotalAmount} DT`)
        }

        const updatedTicket = this.findById(id)
        if (!updatedTicket) {
          throw new Error('Failed to update ticket')
        }

        log.info(`Ticket updated: ${updatedTicket.ticketNumber} (ID: ${updatedTicket.id})`)
        return updatedTicket
      } catch (error) {
        log.error('TicketRepository.update transaction failed:', error)
        throw error
      }
    })

    return transaction()
  }

  private loadTicketDetails(dbTicket: any): Ticket {
    // Map the ticket from DB format to TypeScript format
    const ticket = this.mapTicketFromDb(dbTicket)

    // Load ticket lines
    const linesStmt = this.db.prepare('SELECT * FROM ticket_lines WHERE ticket_id = ?')
    const dbLines = linesStmt.all(ticket.id) as any[]
    ticket.lines = dbLines.map((line) => this.mapTicketLineFromDb(line))

    // Load payments
    const paymentsStmt = this.db.prepare('SELECT * FROM payments WHERE ticket_id = ?')
    const dbPayments = paymentsStmt.all(ticket.id) as any[]
    ticket.payments = dbPayments.map((payment) => this.mapPaymentFromDb(payment))

    return ticket
  }

  private generateTicketNumber(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')

    // Get today's ticket count
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM tickets
      WHERE DATE(created_at) = DATE('now')
    `)
    const result = stmt.get() as { count: number }
    const sequence = String(result.count + 1).padStart(4, '0')

    return `T${year}${month}${day}-${sequence}`
  }

  getDailySales(date?: string): any {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM v_daily_sales
        WHERE ${date ? 'sale_date = ?' : "sale_date = DATE('now')"}
      `)
      return date ? stmt.get(date) : stmt.get()
    } catch (error) {
      log.error('TicketRepository.getDailySales failed:', error)
      throw error
    }
  }

  getTopProducts(limit = 10): any[] {
    try {
      const stmt = this.db.prepare('SELECT * FROM v_top_products LIMIT ?')
      return stmt.all(limit) as any[]
    } catch (error) {
      log.error('TicketRepository.getTopProducts failed:', error)
      throw error
    }
  }
}

let instance: TicketRepository | null = null
export default {
  get instance() {
    if (!instance) {
      instance = new TicketRepository()
    }
    return instance
  },
  findAll: function(filters?: any) { return this.instance.findAll(filters) },
  findById: function(id: number) { return this.instance.findById(id) },
  findByTicketNumber: function(ticketNumber: string) { return this.instance.findByTicketNumber(ticketNumber) },
  findBySession: function(sessionId: number) { return this.instance.findBySession(sessionId) },
  create: function(data: CreateTicketDTO) { return this.instance.create(data) },
  update: function(id: number, data: { lines: TicketLine[]; subtotal: number; discountAmount: number; totalAmount: number }) { return this.instance.update(id, data) },
  cancel: function(id: number, reason: string, userId?: number) { return this.instance.cancel(id, reason, userId) },
  refund: function(id: number, reason: string, userId?: number) { return this.instance.refund(id, reason, userId) },
  getDailySales: function(date?: string) { return this.instance.getDailySales(date) },
  getTopProducts: function(limit?: number) { return this.instance.getTopProducts(limit) }
}
