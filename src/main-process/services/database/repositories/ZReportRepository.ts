import DatabaseService from '../db'
import { ZReport } from '@shared/types'
import log from 'electron-log'

export class ZReportRepository {
  private db = DatabaseService.getInstance().getDatabase()

  findAll(): ZReport[] {
    try {
      const stmt = this.db.prepare('SELECT * FROM z_reports ORDER BY created_at DESC')
      return stmt.all() as ZReport[]
    } catch (error) {
      log.error('ZReportRepository.findAll failed:', error)
      throw error
    }
  }

  findById(id: number): ZReport | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM z_reports WHERE id = ?')
      return (stmt.get(id) as ZReport) || null
    } catch (error) {
      log.error('ZReportRepository.findById failed:', error)
      throw error
    }
  }

  findBySession(sessionId: number): ZReport | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM z_reports WHERE session_id = ?')
      return (stmt.get(sessionId) as ZReport) || null
    } catch (error) {
      log.error('ZReportRepository.findBySession failed:', error)
      throw error
    }
  }

  findByDateRange(startDate: string, endDate: string): ZReport[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM z_reports
        WHERE report_date BETWEEN ? AND ?
        ORDER BY report_date DESC
      `)
      return stmt.all(startDate, endDate) as ZReport[]
    } catch (error) {
      log.error('ZReportRepository.findByDateRange failed:', error)
      throw error
    }
  }

  generate(sessionId: number, userId: number): ZReport {
    const transaction = this.db.transaction(() => {
      try {
        // Check if report already exists
        const existing = this.findBySession(sessionId)
        if (existing) {
          throw new Error('Z Report already exists for this session')
        }

        // Get session data
        const sessionStmt = this.db.prepare('SELECT * FROM cash_sessions WHERE id = ?')
        const session = sessionStmt.get(sessionId) as any

        if (!session) {
          throw new Error('Session not found')
        }

        if (session.status !== 'closed') {
          throw new Error('Session must be closed before generating Z Report')
        }

        // Calculate totals from tickets
        const ticketsStmt = this.db.prepare(`
          SELECT
            COUNT(DISTINCT t.id) as ticket_count,
            COALESCE(SUM(t.subtotal), 0) as total_sales,
            COALESCE(SUM(t.discount_amount), 0) as total_discount,
            COALESCE(SUM(CASE WHEN p.method = 'cash' THEN p.amount ELSE 0 END), 0) as total_cash,
            COALESCE(SUM(CASE WHEN p.method = 'card' THEN p.amount ELSE 0 END), 0) as total_card,
            COALESCE(SUM(CASE WHEN p.method = 'transfer' THEN p.amount ELSE 0 END), 0) as total_transfer,
            COALESCE(SUM(CASE WHEN p.method = 'check' THEN p.amount ELSE 0 END), 0) as total_check,
            COALESCE(SUM(CASE WHEN p.method = 'other' THEN p.amount ELSE 0 END), 0) as total_other
          FROM tickets t
          LEFT JOIN payments p ON t.id = p.ticket_id
          WHERE t.session_id = ? AND t.status = 'completed'
        `)

        const totals = ticketsStmt.get(sessionId) as any

        // Insert Z Report
        const insertStmt = this.db.prepare(`
          INSERT INTO z_reports (
            session_id, user_id, total_sales, total_discount,
            total_cash, total_card, total_transfer, total_check, total_other,
            ticket_count, report_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE('now'))
        `)

        const result = insertStmt.run(
          sessionId,
          userId,
          totals.total_sales,
          totals.total_discount,
          totals.total_cash,
          totals.total_card,
          totals.total_transfer,
          totals.total_check,
          totals.total_other,
          totals.ticket_count
        )

        const zReport = this.findById(result.lastInsertRowid as number)
        if (!zReport) {
          throw new Error('Failed to generate Z Report')
        }

        log.info(`Z Report generated: ID ${zReport.id} for session ${sessionId}`)
        return zReport
      } catch (error) {
        log.error('ZReportRepository.generate transaction failed:', error)
        throw error
      }
    })

    return transaction()
  }

  getSummary(startDate: string, endDate: string): any {
    try {
      const stmt = this.db.prepare(`
        SELECT
          COUNT(*) as report_count,
          SUM(ticket_count) as total_tickets,
          SUM(total_sales) as total_sales,
          SUM(total_discount) as total_discount,
          SUM(total_cash) as total_cash,
          SUM(total_card) as total_card,
          SUM(total_transfer) as total_transfer,
          SUM(total_check) as total_check,
          SUM(total_other) as total_other
        FROM z_reports
        WHERE report_date BETWEEN ? AND ?
      `)
      return stmt.get(startDate, endDate)
    } catch (error) {
      log.error('ZReportRepository.getSummary failed:', error)
      throw error
    }
  }
}

export default new ZReportRepository()
