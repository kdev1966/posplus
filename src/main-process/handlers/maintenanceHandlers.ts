import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import { repairTicketPayments, checkTicketPayments } from '../services/database/utils/repairTicketPayments'
import log from 'electron-log'
import { ROLE_IDS } from '@shared/constants'
import AuthService from '../services/auth/AuthService'

ipcMain.handle(IPC_CHANNELS.MAINTENANCE_REPAIR_PAYMENTS, async (_event, ticketId?: number) => {
  try {
    // CRITICAL: Only Administrator role can repair payments (modifies financial data)
    const currentUser = AuthService.getCurrentUser()
    if (!currentUser || currentUser.roleId !== ROLE_IDS.ADMIN) {
      throw new Error('Access denied: Administrator role required for payment repair')
    }

    log.info(`Payment repair initiated by ${currentUser.username} (Admin)`)
    log.info('Starting payment repair...', ticketId ? `for ticket ${ticketId}` : 'for all tickets')
    const result = repairTicketPayments(ticketId)
    log.info(`Payment repair completed: ${result.fixed} tickets fixed`)
    return result
  } catch (error) {
    log.error('MAINTENANCE_REPAIR_PAYMENTS handler error:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.MAINTENANCE_CHECK_PAYMENTS, async () => {
  try {
    // CRITICAL: Only Administrator role can check payment discrepancies
    const currentUser = AuthService.getCurrentUser()
    if (!currentUser || currentUser.roleId !== ROLE_IDS.ADMIN) {
      throw new Error('Access denied: Administrator role required for payment check')
    }

    log.info('Checking for payment discrepancies...')
    const issues = checkTicketPayments()
    log.info(`Found ${issues.length} tickets with payment issues`)
    return issues
  } catch (error) {
    log.error('MAINTENANCE_CHECK_PAYMENTS handler error:', error)
    throw error
  }
})
