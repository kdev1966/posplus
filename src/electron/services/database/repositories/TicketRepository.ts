import DatabaseService from '../db'
import { Ticket, TicketLine, Payment, CreateTicketDTO } from '@shared/types'
import log from 'electron-log'

export class TicketRepository {
  private db = DatabaseService.getInstance().getDatabase()

  findAll(filters?: { startDate?: string; endDate?: string; status?: string }): Ticket[] {
    try {
      let sql = 'SELECT * FROM tickets WHERE 1=1'
      const params: any[] = []

      if (filters?.startDate) {
        sql += ' AND created_at >= ?'
        params.push(filters.startDate)
      }
      if (filters?.endDate) {
        sql += ' AND created_at <= ?'
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

        // Calculate totals
        let subtotal = 0
        let taxAmount = 0
        let discountAmount = 0

        data.lines.forEach((line) => {
          const lineSubtotal = line.quantity * line.unitPrice
          const lineTax = lineSubtotal * (data.lines[0]?.['taxRate'] || 0)
          const lineDiscount = line.discountAmount || 0

          subtotal += lineSubtotal
          taxAmount += lineTax
          discountAmount += lineDiscount
        })

        const totalAmount = subtotal + taxAmount - discountAmount

        // Insert ticket
        const ticketStmt = this.db.prepare(`
          INSERT INTO tickets (
            ticket_number, user_id, customer_id, session_id,
            subtotal, tax_amount, discount_amount, total_amount, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        const ticketResult = ticketStmt.run(
          ticketNumber,
          data.userId,
          data.customerId || null,
          data.sessionId,
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount,
          'completed'
        )

        const ticketId = ticketResult.lastInsertRowid as number

        // Insert ticket lines
        const lineStmt = this.db.prepare(`
          INSERT INTO ticket_lines (
            ticket_id, product_id, product_name, product_sku,
            quantity, unit_price, tax_rate, discount_amount, total_amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        for (const line of data.lines) {
          // Get product details
          const productStmt = this.db.prepare('SELECT name, sku, tax_rate FROM products WHERE id = ?')
          const product = productStmt.get(line.productId) as any

          const lineSubtotal = line.quantity * line.unitPrice
          const lineTax = lineSubtotal * product.tax_rate
          const lineDiscount = line.discountAmount || 0
          const lineTotal = lineSubtotal + lineTax - lineDiscount

          lineStmt.run(
            ticketId,
            line.productId,
            product.name,
            product.sku,
            line.quantity,
            line.unitPrice,
            product.tax_rate,
            lineDiscount,
            lineTotal
          )

          // Update product stock
          const updateStockStmt = this.db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?')
          updateStockStmt.run(line.quantity, line.productId)
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
        return ticket
      } catch (error) {
        log.error('TicketRepository.create transaction failed:', error)
        throw error
      }
    })

    return transaction()
  }

  cancel(id: number, reason: string): boolean {
    const transaction = this.db.transaction(() => {
      try {
        const ticket = this.findById(id)
        if (!ticket) {
          throw new Error('Ticket not found')
        }

        if (ticket.status !== 'completed') {
          throw new Error('Only completed tickets can be cancelled')
        }

        // Restore stock
        for (const line of ticket.lines) {
          const stmt = this.db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?')
          stmt.run(line.quantity, line.productId)
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

  refund(id: number, reason: string): boolean {
    const transaction = this.db.transaction(() => {
      try {
        const ticket = this.findById(id)
        if (!ticket) {
          throw new Error('Ticket not found')
        }

        if (ticket.status !== 'completed') {
          throw new Error('Only completed tickets can be refunded')
        }

        // Restore stock
        for (const line of ticket.lines) {
          const stmt = this.db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?')
          stmt.run(line.quantity, line.productId)
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

  private loadTicketDetails(ticket: Ticket): Ticket {
    // Load ticket lines
    const linesStmt = this.db.prepare('SELECT * FROM ticket_lines WHERE ticket_id = ?')
    const lines = linesStmt.all(ticket.id) as TicketLine[]

    // Load payments
    const paymentsStmt = this.db.prepare('SELECT * FROM payments WHERE ticket_id = ?')
    const payments = paymentsStmt.all(ticket.id) as Payment[]

    return {
      ...ticket,
      lines,
      payments,
    }
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

export default new TicketRepository()
