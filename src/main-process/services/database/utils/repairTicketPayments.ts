import DatabaseService from '../db'
import log from 'electron-log'

/**
 * Repair ticket payments by recalculating payment amounts based on ticket total
 * This fixes tickets where quantity was reduced but payment amounts weren't updated
 */
export function repairTicketPayments(ticketId?: number): { fixed: number; errors: string[] } {
  const db = DatabaseService.getInstance().getDatabase()
  let fixed = 0
  const errors: string[] = []

  const transaction = db.transaction(() => {
    try {
      // Get all completed tickets or a specific ticket
      const ticketsQuery = ticketId
        ? "SELECT * FROM tickets WHERE id = ? AND status = 'completed'"
        : "SELECT * FROM tickets WHERE status = 'completed'"

      const ticketsStmt = db.prepare(ticketsQuery)
      const tickets = ticketId ? ticketsStmt.all(ticketId) : ticketsStmt.all()

      log.info(`Checking ${tickets.length} tickets for payment discrepancies...`)

      for (const ticket of tickets as any[]) {
        // Get all payments for this ticket
        const paymentsStmt = db.prepare('SELECT * FROM payments WHERE ticket_id = ?')
        const payments = paymentsStmt.all(ticket.id) as any[]

        if (payments.length === 0) {
          continue
        }

        // Calculate total payment amount
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

        // Allow for small floating point differences (0.001 DT tolerance)
        const difference = Math.abs(totalPaid - ticket.total_amount)

        if (difference > 0.001) {
          log.warn(
            `Ticket ${ticket.ticket_number}: Payment mismatch detected. ` +
            `Total: ${ticket.total_amount} DT, Paid: ${totalPaid.toFixed(3)} DT, ` +
            `Difference: ${difference.toFixed(3)} DT`
          )

          // Calculate the correction ratio
          const correctionRatio = ticket.total_amount / totalPaid

          // Update each payment proportionally
          const updateStmt = db.prepare('UPDATE payments SET amount = ? WHERE id = ?')

          for (const payment of payments) {
            const newAmount = payment.amount * correctionRatio
            updateStmt.run(newAmount, payment.id)

            log.info(
              `  Payment ${payment.id} (${payment.method}): ` +
              `${payment.amount.toFixed(3)} DT → ${newAmount.toFixed(3)} DT`
            )
          }

          fixed++
          log.info(`✓ Fixed ticket ${ticket.ticket_number}`)
        }
      }

      log.info(`Repair complete: ${fixed} tickets fixed`)
    } catch (error) {
      log.error('repairTicketPayments failed:', error)
      errors.push(String(error))
      throw error
    }
  })

  try {
    transaction()
  } catch (error) {
    errors.push(String(error))
  }

  return { fixed, errors }
}

/**
 * Check for tickets with payment discrepancies without fixing them
 */
export function checkTicketPayments(): Array<{
  ticketId: number
  ticketNumber: string
  totalAmount: number
  totalPaid: number
  difference: number
}> {
  const db = DatabaseService.getInstance().getDatabase()
  const issues: Array<{
    ticketId: number
    ticketNumber: string
    totalAmount: number
    totalPaid: number
    difference: number
  }> = []

  try {
    const ticketsStmt = db.prepare("SELECT * FROM tickets WHERE status = 'completed'")
    const tickets = ticketsStmt.all() as any[]

    for (const ticket of tickets) {
      const paymentsStmt = db.prepare('SELECT * FROM payments WHERE ticket_id = ?')
      const payments = paymentsStmt.all(ticket.id) as any[]

      if (payments.length === 0) continue

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
      const difference = Math.abs(totalPaid - ticket.total_amount)

      if (difference > 0.001) {
        issues.push({
          ticketId: ticket.id,
          ticketNumber: ticket.ticket_number,
          totalAmount: ticket.total_amount,
          totalPaid,
          difference,
        })
      }
    }

    log.info(`Found ${issues.length} tickets with payment discrepancies`)
    return issues
  } catch (error) {
    log.error('checkTicketPayments failed:', error)
    return []
  }
}
