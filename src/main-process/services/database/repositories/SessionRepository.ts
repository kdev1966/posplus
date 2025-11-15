import DatabaseService from '../db'
import { CashSession } from '@shared/types'
import log from 'electron-log'

export class SessionRepository {
  private get db() {
    return DatabaseService.getInstance().getDatabase()
  }

  findAll(): CashSession[] {
    try {
      const stmt = this.db.prepare('SELECT * FROM cash_sessions ORDER BY started_at DESC')
      return stmt.all() as CashSession[]
    } catch (error) {
      log.error('SessionRepository.findAll failed:', error)
      throw error
    }
  }

  findById(id: number): CashSession | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM cash_sessions WHERE id = ?')
      return (stmt.get(id) as CashSession) || null
    } catch (error) {
      log.error('SessionRepository.findById failed:', error)
      throw error
    }
  }

  findCurrent(): CashSession | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM cash_sessions WHERE status = ? ORDER BY started_at DESC LIMIT 1')
      return (stmt.get('open') as CashSession) || null
    } catch (error) {
      log.error('SessionRepository.findCurrent failed:', error)
      throw error
    }
  }

  findCurrentByUser(userId: number): CashSession | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM cash_sessions WHERE user_id = ? AND status = ? ORDER BY started_at DESC LIMIT 1')
      return (stmt.get(userId, 'open') as CashSession) || null
    } catch (error) {
      log.error('SessionRepository.findCurrentByUser failed:', error)
      throw error
    }
  }

  findByUser(userId: number): CashSession[] {
    try {
      const stmt = this.db.prepare('SELECT * FROM cash_sessions WHERE user_id = ? ORDER BY started_at DESC')
      return stmt.all(userId) as CashSession[]
    } catch (error) {
      log.error('SessionRepository.findByUser failed:', error)
      throw error
    }
  }

  open(userId: number, openingCash: number): CashSession {
    try {
      // Check if user already has an open session
      const existingSession = this.findCurrentByUser(userId)
      if (existingSession) {
        throw new Error('User already has an open session')
      }

      const stmt = this.db.prepare(`
        INSERT INTO cash_sessions (user_id, opening_cash, status)
        VALUES (?, ?, 'open')
      `)

      const result = stmt.run(userId, openingCash)

      const session = this.findById(result.lastInsertRowid as number)
      if (!session) {
        throw new Error('Failed to open session')
      }

      log.info(`Session opened: ID ${session.id} by user ${userId}`)
      return session
    } catch (error) {
      log.error('SessionRepository.open failed:', error)
      throw error
    }
  }

  close(sessionId: number, closingCash: number): CashSession {
    const transaction = this.db.transaction(() => {
      try {
        const session = this.findById(sessionId)
        if (!session) {
          throw new Error('Session not found')
        }

        if (session.status === 'closed') {
          throw new Error('Session already closed')
        }

        // Calculate expected cash from tickets
        // Sum cash payments from completed tickets
        const completedStmt = this.db.prepare(`
          SELECT COALESCE(SUM(p.amount), 0) as total_cash
          FROM payments p
          JOIN tickets t ON p.ticket_id = t.id
          WHERE t.session_id = ? AND p.method = 'cash' AND t.status = 'completed'
        `)
        const completedResult = completedStmt.get(sessionId) as { total_cash: number }

        // Subtract cash refunded/cancelled (cash returned to customers)
        const refundedStmt = this.db.prepare(`
          SELECT COALESCE(SUM(p.amount), 0) as total_refunded
          FROM payments p
          JOIN tickets t ON p.ticket_id = t.id
          WHERE t.session_id = ? AND p.method = 'cash' AND t.status IN ('cancelled', 'refunded')
        `)
        const refundedResult = refundedStmt.get(sessionId) as { total_refunded: number }

        const expectedCash = session.openingCash + completedResult.total_cash - refundedResult.total_refunded

        const difference = closingCash - expectedCash

        // Update session
        const updateStmt = this.db.prepare(`
          UPDATE cash_sessions
          SET closing_cash = ?, expected_cash = ?, difference = ?, closed_at = CURRENT_TIMESTAMP, status = 'closed'
          WHERE id = ?
        `)

        updateStmt.run(closingCash, expectedCash, difference, sessionId)

        const updatedSession = this.findById(sessionId)
        if (!updatedSession) {
          throw new Error('Failed to close session')
        }

        log.info(`Session closed: ID ${sessionId} - Difference: ${difference}`)
        return updatedSession
      } catch (error) {
        log.error('SessionRepository.close transaction failed:', error)
        throw error
      }
    })

    return transaction()
  }

  getSessionStats(sessionId: number): any {
    try {
      const stmt = this.db.prepare(`
        SELECT
          COUNT(DISTINCT t.id) as ticket_count,
          COALESCE(SUM(t.total_amount), 0) as total_sales,
          COALESCE(SUM(CASE WHEN p.method = 'cash' THEN p.amount ELSE 0 END), 0) as total_cash,
          COALESCE(SUM(CASE WHEN p.method = 'card' THEN p.amount ELSE 0 END), 0) as total_card,
          COALESCE(SUM(CASE WHEN p.method = 'transfer' THEN p.amount ELSE 0 END), 0) as total_transfer,
          COALESCE(SUM(CASE WHEN p.method = 'check' THEN p.amount ELSE 0 END), 0) as total_check,
          COALESCE(SUM(CASE WHEN p.method = 'other' THEN p.amount ELSE 0 END), 0) as total_other
        FROM tickets t
        LEFT JOIN payments p ON t.id = p.ticket_id
        WHERE t.session_id = ? AND t.status = 'completed'
      `)

      return stmt.get(sessionId)
    } catch (error) {
      log.error('SessionRepository.getSessionStats failed:', error)
      throw error
    }
  }
}

export default new SessionRepository()
