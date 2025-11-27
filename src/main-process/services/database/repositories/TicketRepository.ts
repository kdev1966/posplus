import Database from 'better-sqlite3'
import DatabaseService from '../db'
import { Ticket, TicketLine, Payment, CreateTicketDTO, PartialRefundLineDTO } from '@shared/types'
import log from 'electron-log'
import StockRepository from './StockRepository'
import P2PSyncService from '../../p2p/SyncService'

/**
 * TicketRepository with optimized batch loading to avoid N+1 queries.
 * Uses cached prepared statements for optimal performance.
 */
export class TicketRepository {
  // Cached prepared statements
  private _stmtFindById: Database.Statement | null = null
  private _stmtFindByTicketNumber: Database.Statement | null = null
  private _stmtFindBySession: Database.Statement | null = null
  private _stmtGetLines: Database.Statement | null = null
  private _stmtGetPayments: Database.Statement | null = null
  // Reserved for batch loading optimization
  // private _stmtGetLinesByTicketIds: Database.Statement | null = null
  // private _stmtGetPaymentsByTicketIds: Database.Statement | null = null
  private _stmtInsertTicket: Database.Statement | null = null
  private _stmtInsertLine: Database.Statement | null = null
  private _stmtInsertPayment: Database.Statement | null = null
  private _stmtGetProduct: Database.Statement | null = null
  private _stmtCountTodayTickets: Database.Statement | null = null
  private _stmtGetDailySales: Database.Statement | null = null
  private _stmtGetDailySalesToday: Database.Statement | null = null
  private _stmtGetTopProducts: Database.Statement | null = null

  private get db() {
    return DatabaseService.getInstance().getDatabase()
  }

  // Lazy statement getters
  private get stmtFindById(): Database.Statement {
    if (!this._stmtFindById) {
      this._stmtFindById = this.db.prepare('SELECT * FROM tickets WHERE id = ?')
    }
    return this._stmtFindById
  }

  private get stmtFindByTicketNumber(): Database.Statement {
    if (!this._stmtFindByTicketNumber) {
      this._stmtFindByTicketNumber = this.db.prepare('SELECT * FROM tickets WHERE ticket_number = ?')
    }
    return this._stmtFindByTicketNumber
  }

  private get stmtFindBySession(): Database.Statement {
    if (!this._stmtFindBySession) {
      this._stmtFindBySession = this.db.prepare('SELECT * FROM tickets WHERE session_id = ? ORDER BY created_at DESC')
    }
    return this._stmtFindBySession
  }

  private get stmtGetLines(): Database.Statement {
    if (!this._stmtGetLines) {
      this._stmtGetLines = this.db.prepare('SELECT * FROM ticket_lines WHERE ticket_id = ?')
    }
    return this._stmtGetLines
  }

  private get stmtGetPayments(): Database.Statement {
    if (!this._stmtGetPayments) {
      this._stmtGetPayments = this.db.prepare('SELECT * FROM payments WHERE ticket_id = ?')
    }
    return this._stmtGetPayments
  }

  private get stmtInsertTicket(): Database.Statement {
    if (!this._stmtInsertTicket) {
      this._stmtInsertTicket = this.db.prepare(`
        INSERT INTO tickets (
          ticket_number, user_id, customer_id, session_id,
          subtotal, discount_amount, total_amount, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
    }
    return this._stmtInsertTicket
  }

  private get stmtInsertLine(): Database.Statement {
    if (!this._stmtInsertLine) {
      this._stmtInsertLine = this.db.prepare(`
        INSERT INTO ticket_lines (
          ticket_id, product_id, product_name, product_sku,
          quantity, unit_price, discount_amount, total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
    }
    return this._stmtInsertLine
  }

  private get stmtInsertPayment(): Database.Statement {
    if (!this._stmtInsertPayment) {
      this._stmtInsertPayment = this.db.prepare(`
        INSERT INTO payments (ticket_id, method, amount, reference)
        VALUES (?, ?, ?, ?)
      `)
    }
    return this._stmtInsertPayment
  }

  private get stmtGetProduct(): Database.Statement {
    if (!this._stmtGetProduct) {
      this._stmtGetProduct = this.db.prepare('SELECT name, sku, stock FROM products WHERE id = ?')
    }
    return this._stmtGetProduct
  }

  private get stmtCountTodayTickets(): Database.Statement {
    if (!this._stmtCountTodayTickets) {
      this._stmtCountTodayTickets = this.db.prepare(`
        SELECT COUNT(*) as count FROM tickets WHERE DATE(created_at) = DATE('now')
      `)
    }
    return this._stmtCountTodayTickets
  }

  private get stmtGetDailySales(): Database.Statement {
    if (!this._stmtGetDailySales) {
      this._stmtGetDailySales = this.db.prepare('SELECT * FROM v_daily_sales WHERE sale_date = ?')
    }
    return this._stmtGetDailySales
  }

  private get stmtGetDailySalesToday(): Database.Statement {
    if (!this._stmtGetDailySalesToday) {
      this._stmtGetDailySalesToday = this.db.prepare("SELECT * FROM v_daily_sales WHERE sale_date = DATE('now')")
    }
    return this._stmtGetDailySalesToday
  }

  private get stmtGetTopProducts(): Database.Statement {
    if (!this._stmtGetTopProducts) {
      this._stmtGetTopProducts = this.db.prepare('SELECT * FROM v_top_products LIMIT ?')
    }
    return this._stmtGetTopProducts
  }

  // Mapper functions
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
      createdAt: this.convertUtcToLocal(dbTicket.created_at),
      updatedAt: this.convertUtcToLocal(dbTicket.updated_at),
      lines: [],
      payments: [],
    }
  }

  private convertUtcToLocal(utcDateStr: string): string {
    if (!utcDateStr) return ''
    const utcDate = new Date(utcDateStr + 'Z')
    return utcDate.toISOString()
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
      createdAt: this.convertUtcToLocal(dbLine.created_at),
    }
  }

  private mapPaymentFromDb(dbPayment: any): Payment {
    return {
      id: dbPayment.id,
      ticketId: dbPayment.ticket_id,
      method: dbPayment.method,
      amount: dbPayment.amount,
      reference: dbPayment.reference,
      createdAt: this.convertUtcToLocal(dbPayment.created_at),
    }
  }

  /**
   * Batch load lines and payments for multiple tickets to avoid N+1 queries.
   * This is the key optimization - we load all related data in 2 queries instead of 2*N queries.
   */
  private loadTicketDetailsBatch(tickets: Ticket[]): Ticket[] {
    if (tickets.length === 0) return tickets

    const ticketIds = tickets.map(t => t.id)

    // Build placeholders for IN clause
    const placeholders = ticketIds.map(() => '?').join(',')

    // Batch load all lines for all tickets in ONE query
    const linesStmt = this.db.prepare(`
      SELECT * FROM ticket_lines WHERE ticket_id IN (${placeholders}) ORDER BY ticket_id, id
    `)
    const allLines = linesStmt.all(...ticketIds) as any[]

    // Batch load all payments for all tickets in ONE query
    const paymentsStmt = this.db.prepare(`
      SELECT * FROM payments WHERE ticket_id IN (${placeholders}) ORDER BY ticket_id, id
    `)
    const allPayments = paymentsStmt.all(...ticketIds) as any[]

    // Group lines and payments by ticket_id using Map for O(1) lookup
    const linesByTicketId = new Map<number, TicketLine[]>()
    const paymentsByTicketId = new Map<number, Payment[]>()

    for (const line of allLines) {
      const ticketId = line.ticket_id
      if (!linesByTicketId.has(ticketId)) {
        linesByTicketId.set(ticketId, [])
      }
      linesByTicketId.get(ticketId)!.push(this.mapTicketLineFromDb(line))
    }

    for (const payment of allPayments) {
      const ticketId = payment.ticket_id
      if (!paymentsByTicketId.has(ticketId)) {
        paymentsByTicketId.set(ticketId, [])
      }
      paymentsByTicketId.get(ticketId)!.push(this.mapPaymentFromDb(payment))
    }

    // Assign lines and payments to each ticket
    for (const ticket of tickets) {
      ticket.lines = linesByTicketId.get(ticket.id) || []
      ticket.payments = paymentsByTicketId.get(ticket.id) || []
    }

    return tickets
  }

  /**
   * Load details for a single ticket.
   */
  private loadTicketDetails(dbTicket: any): Ticket {
    const ticket = this.mapTicketFromDb(dbTicket)

    const dbLines = this.stmtGetLines.all(ticket.id) as any[]
    ticket.lines = dbLines.map(line => this.mapTicketLineFromDb(line))

    const dbPayments = this.stmtGetPayments.all(ticket.id) as any[]
    ticket.payments = dbPayments.map(payment => this.mapPaymentFromDb(payment))

    return ticket
  }

  findAll(filters?: { startDate?: string; endDate?: string; status?: string; limit?: number; offset?: number }): Ticket[] {
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

      // Add pagination if specified
      if (filters?.limit !== undefined) {
        sql += ' LIMIT ? OFFSET ?'
        params.push(filters.limit, filters.offset || 0)
      }

      const stmt = this.db.prepare(sql)
      const dbTickets = stmt.all(...params) as any[]

      // Map to Ticket objects
      const tickets = dbTickets.map(t => this.mapTicketFromDb(t))

      // Batch load all lines and payments - eliminates N+1 queries
      return this.loadTicketDetailsBatch(tickets)
    } catch (error) {
      log.error('TicketRepository.findAll failed:', error)
      throw error
    }
  }

  /**
   * Get total count of tickets for pagination
   */
  count(filters?: { startDate?: string; endDate?: string; status?: string }): number {
    try {
      let sql = 'SELECT COUNT(*) as count FROM tickets WHERE 1=1'
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

      const stmt = this.db.prepare(sql)
      const result = stmt.get(...params) as { count: number }
      return result.count
    } catch (error) {
      log.error('TicketRepository.count failed:', error)
      throw error
    }
  }

  findById(id: number): Ticket | null {
    try {
      const dbTicket = this.stmtFindById.get(id) as any
      if (!dbTicket) return null
      return this.loadTicketDetails(dbTicket)
    } catch (error) {
      log.error('TicketRepository.findById failed:', error)
      throw error
    }
  }

  findByTicketNumber(ticketNumber: string): Ticket | null {
    try {
      const dbTicket = this.stmtFindByTicketNumber.get(ticketNumber) as any
      if (!dbTicket) return null
      return this.loadTicketDetails(dbTicket)
    } catch (error) {
      log.error('TicketRepository.findByTicketNumber failed:', error)
      throw error
    }
  }

  findBySession(sessionId: number): Ticket[] {
    try {
      const dbTickets = this.stmtFindBySession.all(sessionId) as any[]
      const tickets = dbTickets.map(t => this.mapTicketFromDb(t))
      return this.loadTicketDetailsBatch(tickets)
    } catch (error) {
      log.error('TicketRepository.findBySession failed:', error)
      throw error
    }
  }

  create(data: CreateTicketDTO): Ticket {
    const transaction = this.db.transaction(() => {
      try {
        const ticketNumber = this.generateTicketNumber()

        let subtotal = 0
        let discountAmount = 0

        data.lines.forEach((line) => {
          const lineSubtotal = line.quantity * line.unitPrice
          const lineDiscount = line.discountAmount || 0
          subtotal += lineSubtotal
          discountAmount += lineDiscount
        })

        const totalAmount = subtotal - discountAmount

        const ticketResult = this.stmtInsertTicket.run(
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

        for (const line of data.lines) {
          const product = this.stmtGetProduct.get(line.productId) as any

          if (!product) {
            throw new Error(`Product not found: ${line.productId}`)
          }

          if (product.stock < line.quantity) {
            throw new Error(
              `Insufficient stock for product "${product.name}". Available: ${product.stock}, Required: ${line.quantity}`
            )
          }

          const lineSubtotal = line.quantity * line.unitPrice
          const lineDiscount = line.discountAmount || 0
          const lineTotal = lineSubtotal - lineDiscount

          this.stmtInsertLine.run(
            ticketId,
            line.productId,
            product.name,
            product.sku,
            line.quantity,
            line.unitPrice,
            lineDiscount,
            lineTotal
          )

          StockRepository.adjust(
            line.productId,
            line.quantity,
            'sale',
            data.userId,
            ticketNumber,
            `Vente ticket ${ticketNumber}`
          )
        }

        for (const payment of data.payments) {
          this.stmtInsertPayment.run(
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

        try {
          P2PSyncService.syncTicket(ticket)
          log.info(`P2P: Ticket ${ticket.ticketNumber} synchronized with peers`)
        } catch (error) {
          log.error('P2P: Failed to sync ticket:', error)
        }

        return ticket
      } catch (error) {
        log.error('TicketRepository.create transaction failed:', error)
        throw error
      }
    })

    return transaction()
  }

  createFromSync(ticketData: any): Ticket {
    const transaction = this.db.transaction(() => {
      try {
        log.info(`P2P: Creating ticket from sync: ${ticketData.ticketNumber}`)

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

        const lineStmt = this.db.prepare(`
          INSERT INTO ticket_lines (
            ticket_id, product_id, product_name, product_sku,
            quantity, unit_price, discount_amount, total_amount, created_at
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

  partialRefund(id: number, linesToRefund: PartialRefundLineDTO[], reason: string, userId?: number): boolean {
    const transaction = this.db.transaction(() => {
      try {
        const ticket = this.findById(id)
        if (!ticket) {
          throw new Error('Ticket not found')
        }

        if (ticket.status !== 'completed' && ticket.status !== 'partially_refunded') {
          throw new Error('Only completed or partially refunded tickets can be refunded')
        }

        let totalRefundAmount = 0
        const lineUpdates: Array<{ lineId: number; newQuantity: number; refundAmount: number }> = []

        for (const refundLine of linesToRefund) {
          const originalLine = ticket.lines.find((l) => l.id === refundLine.lineId)
          if (!originalLine) {
            throw new Error(`Line ${refundLine.lineId} not found in ticket`)
          }

          if (refundLine.quantity <= 0 || refundLine.quantity > originalLine.quantity) {
            throw new Error(`Invalid refund quantity for line ${refundLine.lineId}`)
          }

          const lineRefundAmount = (originalLine.totalAmount / originalLine.quantity) * refundLine.quantity
          totalRefundAmount += lineRefundAmount

          const newQuantity = originalLine.quantity - refundLine.quantity

          lineUpdates.push({
            lineId: refundLine.lineId,
            newQuantity,
            refundAmount: lineRefundAmount,
          })

          StockRepository.adjust(
            originalLine.productId,
            refundLine.quantity,
            'return',
            userId || ticket.userId,
            ticket.ticketNumber,
            `Remboursement partiel ticket ${ticket.ticketNumber}: ${reason}`
          )
        }

        const updateLineStmt = this.db.prepare(`
          UPDATE ticket_lines SET quantity = ?, total_amount = ? WHERE id = ?
        `)
        const deleteLineStmt = this.db.prepare('DELETE FROM ticket_lines WHERE id = ?')

        for (const update of lineUpdates) {
          const originalLine = ticket.lines.find((l) => l.id === update.lineId)!

          if (update.newQuantity === 0) {
            deleteLineStmt.run(update.lineId)
          } else {
            const newTotalAmount = (originalLine.totalAmount / originalLine.quantity) * update.newQuantity
            updateLineStmt.run(update.newQuantity, newTotalAmount, update.lineId)
          }
        }

        const recalcTotalsStmt = this.db.prepare(`
          SELECT COALESCE(SUM(total_amount), 0) as subtotal, COUNT(*) as line_count
          FROM ticket_lines WHERE ticket_id = ?
        `)
        const totals = recalcTotalsStmt.get(id) as { subtotal: number; line_count: number }

        const newSubtotal = totals.subtotal
        const newTotalAmount = totals.subtotal
        const allLinesRefunded = totals.line_count === 0
        const newStatus = allLinesRefunded ? 'refunded' : 'partially_refunded'

        const updateStmt = this.db.prepare(`
          UPDATE tickets SET subtotal = ?, total_amount = ?, status = ?, notes = ? WHERE id = ?
        `)
        const result = updateStmt.run(newSubtotal, newTotalAmount, newStatus, reason, id)

        log.info(
          `Ticket partially refunded: ${ticket.ticketNumber} (ID: ${ticket.id}) - Refund amount: ${totalRefundAmount.toFixed(3)} DT`
        )
        return result.changes > 0
      } catch (error) {
        log.error('TicketRepository.partialRefund transaction failed:', error)
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

        const oldTotalAmount = ticket.totalAmount
        const newTotalAmount = data.totalAmount
        const amountDifference = oldTotalAmount - newTotalAmount

        const ticketStmt = this.db.prepare(`
          UPDATE tickets SET subtotal = ?, discount_amount = ?, total_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `)
        ticketStmt.run(data.subtotal, data.discountAmount, data.totalAmount, id)

        const lineStmt = this.db.prepare(`
          UPDATE ticket_lines SET quantity = ?, discount_rate = ?, discount_amount = ?, total_amount = ? WHERE id = ?
        `)

        for (const line of data.lines) {
          const originalLine = ticket.lines.find(l => l.id === line.id)
          if (originalLine && originalLine.quantity !== line.quantity) {
            const quantityDiff = line.quantity - originalLine.quantity

            if (quantityDiff > 0) {
              StockRepository.adjust(
                line.productId,
                quantityDiff,
                'sale',
                ticket.userId,
                ticket.ticketNumber,
                `Modification ticket ${ticket.ticketNumber} - augmentation quantité`
              )
            } else {
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

        if (amountDifference > 0.001 && ticket.payments.length > 0) {
          const reductionRatio = newTotalAmount / oldTotalAmount
          const paymentStmt = this.db.prepare('UPDATE payments SET amount = ? WHERE id = ?')

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

  private generateTicketNumber(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')

    const result = this.stmtCountTodayTickets.get() as { count: number }
    const sequence = String(result.count + 1).padStart(4, '0')

    return `T${year}${month}${day}-${sequence}`
  }

  getDailySales(date?: string): any {
    try {
      if (date) {
        return this.stmtGetDailySales.get(date)
      }
      return this.stmtGetDailySalesToday.get()
    } catch (error) {
      log.error('TicketRepository.getDailySales failed:', error)
      throw error
    }
  }

  getTopProducts(limit = 10): any[] {
    try {
      return this.stmtGetTopProducts.all(limit) as any[]
    } catch (error) {
      log.error('TicketRepository.getTopProducts failed:', error)
      throw error
    }
  }

  clearStatementCache(): void {
    this._stmtFindById = null
    this._stmtFindByTicketNumber = null
    this._stmtFindBySession = null
    this._stmtGetLines = null
    this._stmtGetPayments = null
    // this._stmtGetLinesByTicketIds = null
    // this._stmtGetPaymentsByTicketIds = null
    this._stmtInsertTicket = null
    this._stmtInsertLine = null
    this._stmtInsertPayment = null
    this._stmtGetProduct = null
    this._stmtCountTodayTickets = null
    this._stmtGetDailySales = null
    this._stmtGetDailySalesToday = null
    this._stmtGetTopProducts = null
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
  createFromSync: function(data: any) { return this.instance.createFromSync(data) },
  update: function(id: number, data: { lines: TicketLine[]; subtotal: number; discountAmount: number; totalAmount: number }) { return this.instance.update(id, data) },
  cancel: function(id: number, reason: string, userId?: number) { return this.instance.cancel(id, reason, userId) },
  refund: function(id: number, reason: string, userId?: number) { return this.instance.refund(id, reason, userId) },
  partialRefund: function(id: number, lines: PartialRefundLineDTO[], reason: string, userId?: number) { return this.instance.partialRefund(id, lines, reason, userId) },
  getDailySales: function(date?: string) { return this.instance.getDailySales(date) },
  getTopProducts: function(limit?: number) { return this.instance.getTopProducts(limit) },
  count: function(filters?: any) { return this.instance.count(filters) },
  clearStatementCache: function() { return this.instance.clearStatementCache() }
}
