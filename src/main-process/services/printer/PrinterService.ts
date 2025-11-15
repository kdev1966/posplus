import TicketRepository from '../database/repositories/TicketRepository'
import log from 'electron-log'
import { ThermalPrinter, PrinterTypes } from 'node-thermal-printer'

class PrinterService {
  private printer: ThermalPrinter | null = null
  private isConnected = false

  constructor() {
    this.initialize()
  }

  private async initialize() {
    try {
      // Initialize printer (USB or Network)
      this.printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: 'printer:auto', // Auto-detect printer
        characterSet: 'SLOVENIA' as any,
        removeSpecialCharacters: false,
        lineCharacter: '=',
        options: {
          timeout: 5000,
        },
      })

      this.isConnected = await this.testConnection()
      if (this.isConnected) {
        log.info('Printer initialized and connected')
      } else {
        log.warn('Printer initialized but not connected')
      }
    } catch (error) {
      log.error('Failed to initialize printer:', error)
      this.isConnected = false
    }
  }

  private async testConnection(): Promise<boolean> {
    if (!this.printer) return false

    try {
      await this.printer.isPrinterConnected()
      return true
    } catch (error) {
      return false
    }
  }

  async printTicket(ticketId: number): Promise<boolean> {
    if (!this.printer) {
      log.error('Printer not initialized')
      return false
    }

    try {
      const ticket = TicketRepository.findById(ticketId)
      if (!ticket) {
        log.error(`Ticket not found: ${ticketId}`)
        return false
      }

      log.info(`Printing ticket: ${ticket.ticketNumber}`)

      this.printer.clear()

      // Header
      this.printer.alignCenter()
      this.printer.setTextSize(1, 1)
      this.printer.bold(true)
      this.printer.println('POSPlus')
      this.printer.bold(false)
      this.printer.setTextNormal()
      this.printer.println('Point of Sale System')
      this.printer.drawLine()
      this.printer.newLine()

      // Ticket info
      this.printer.alignLeft()
      this.printer.println(`Ticket: ${ticket.ticketNumber}`)
      this.printer.println(`Date: ${new Date(ticket.createdAt).toLocaleString()}`)
      this.printer.println(`Cashier: User #${ticket.userId}`)
      this.printer.drawLine()
      this.printer.newLine()

      // Items
      for (const line of ticket.lines) {
        this.printer.println(`${line.productName}`)
        this.printer.println(
          `  ${line.quantity} x €${line.unitPrice.toFixed(2)} = €${line.totalAmount.toFixed(2)}`
        )
      }

      this.printer.newLine()
      this.printer.drawLine()

      // Totals
      this.printer.alignRight()
      this.printer.println(`Subtotal: €${ticket.subtotal.toFixed(2)}`)
      this.printer.println(`Tax: €${ticket.taxAmount.toFixed(2)}`)

      if (ticket.discountAmount > 0) {
        this.printer.println(`Discount: -€${ticket.discountAmount.toFixed(2)}`)
      }

      this.printer.newLine()
      this.printer.bold(true)
      this.printer.setTextSize(1, 1)
      this.printer.println(`TOTAL: €${ticket.totalAmount.toFixed(2)}`)
      this.printer.bold(false)
      this.printer.setTextNormal()

      this.printer.newLine()
      this.printer.drawLine()

      // Payments
      this.printer.alignLeft()
      this.printer.println('Payments:')
      for (const payment of ticket.payments) {
        this.printer.println(
          `  ${payment.method.toUpperCase()}: €${payment.amount.toFixed(2)}`
        )
      }

      this.printer.newLine()
      this.printer.drawLine()

      // Footer
      this.printer.alignCenter()
      this.printer.println('Thank you for your purchase!')
      this.printer.println('Please come again')
      this.printer.newLine()
      this.printer.newLine()
      this.printer.newLine()

      // Cut paper
      this.printer.cut()

      // Execute print
      await this.printer.execute()

      log.info(`Ticket printed successfully: ${ticket.ticketNumber}`)
      return true
    } catch (error) {
      log.error('Failed to print ticket:', error)
      return false
    }
  }

  async openDrawer(): Promise<boolean> {
    if (!this.printer) {
      log.error('Printer not initialized')
      return false
    }

    try {
      log.info('Opening cash drawer')
      this.printer.openCashDrawer()
      await this.printer.execute()
      log.info('Cash drawer opened')
      return true
    } catch (error) {
      log.error('Failed to open cash drawer:', error)
      return false
    }
  }

  async getStatus(): Promise<{ connected: boolean; ready: boolean }> {
    const connected = await this.testConnection()
    this.isConnected = connected

    return {
      connected,
      ready: connected,
    }
  }

  async reconnect(): Promise<boolean> {
    log.info('Attempting to reconnect printer')
    await this.initialize()
    return this.isConnected
  }
}

export default new PrinterService()
