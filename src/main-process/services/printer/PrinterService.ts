import TicketRepository from '../database/repositories/TicketRepository'
import log from 'electron-log'
import { ThermalPrinter, PrinterTypes } from 'node-thermal-printer'
import StandardPrinterService from './StandardPrinterService'

class PrinterService {
  private printer: ThermalPrinter | null = null
  private isConnected = false
  private useStandardPrinter = false

  constructor() {
    this.initialize()
  }

  private async initialize() {
    try {
      // Try thermal printer interfaces first (for Windows POS with thermal printer)
      const interfaces = [
        'printer:POS80 Printer',  // Exact name
        '//./CP001',              // Direct port access
        '\\\\.\\CP001',           // Windows path format
      ]

      log.info('Initializing printer: Trying thermal printer interfaces first')

      for (const printerInterface of interfaces) {
        try {
          log.info(`Attempting thermal interface: ${printerInterface}`)

          this.printer = new ThermalPrinter({
            type: PrinterTypes.EPSON,
            interface: printerInterface,
            characterSet: 'SLOVENIA' as any,
            removeSpecialCharacters: false,
            lineCharacter: '=',
            options: {
              timeout: 5000,
            },
          })

          this.isConnected = await this.testConnection()
          if (this.isConnected) {
            log.info(`Thermal printer connected successfully using interface: ${printerInterface}`)
            this.useStandardPrinter = false
            return
          }
        } catch (err) {
          log.warn(`Thermal interface ${printerInterface} failed:`, err)
          continue
        }
      }

      // If thermal printer failed, try standard printer (macOS laser/PDF)
      log.info('Thermal printer not found, trying standard printer service')
      const standardStatus = await StandardPrinterService.getStatus()

      if (standardStatus.connected) {
        log.info('Standard printer service connected successfully')
        this.isConnected = true
        this.useStandardPrinter = true
        return
      }

      // If we get here, all interfaces failed
      log.error('All printer interfaces failed (thermal and standard)')
      this.isConnected = false
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
    if (!this.isConnected) {
      log.error('Printer not initialized')
      return false
    }

    // Delegate to standard printer if using it
    if (this.useStandardPrinter) {
      log.info('Using standard printer service for ticket printing')
      return await StandardPrinterService.printTicket(ticketId)
    }

    // Otherwise use thermal printer
    if (!this.printer) {
      log.error('Thermal printer not initialized')
      return false
    }

    try {
      const ticket = TicketRepository.findById(ticketId)
      if (!ticket) {
        log.error(`Ticket not found: ${ticketId}`)
        return false
      }

      log.info(`Printing ticket (thermal): ${ticket.ticketNumber}`)

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
          `  ${line.quantity} x ${line.unitPrice.toFixed(3)} DT = ${line.totalAmount.toFixed(3)} DT`
        )
      }

      this.printer.newLine()
      this.printer.drawLine()

      // Totals
      this.printer.alignRight()
      this.printer.println(`Subtotal: ${ticket.subtotal.toFixed(3)} DT`)

      if (ticket.discountAmount > 0) {
        this.printer.println(`Discount: -${ticket.discountAmount.toFixed(3)} DT`)
      }

      this.printer.newLine()
      this.printer.bold(true)
      this.printer.setTextSize(1, 1)
      this.printer.println(`TOTAL: ${ticket.totalAmount.toFixed(3)} DT`)
      this.printer.bold(false)
      this.printer.setTextNormal()

      this.printer.newLine()
      this.printer.drawLine()

      // Payments
      this.printer.alignLeft()
      this.printer.println('Payments:')
      for (const payment of ticket.payments) {
        this.printer.println(
          `  ${payment.method.toUpperCase()}: ${payment.amount.toFixed(3)} DT`
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
      log.info('Sending print job to printer...')
      try {
        const result = await this.printer.execute()
        log.info('Print command executed, result:', result)

        // Force clear buffer after execution
        this.printer.clear()

        log.info(`Ticket printed successfully: ${ticket.ticketNumber}`)
        return true
      } catch (execError) {
        log.error('Execute failed:', execError)
        throw execError
      }
    } catch (error) {
      log.error('Failed to print ticket:', error)
      return false
    }
  }

  async printTestTicket(): Promise<boolean> {
    if (!this.isConnected) {
      log.error('Printer not initialized')
      return false
    }

    // Delegate to standard printer if using it
    if (this.useStandardPrinter) {
      log.info('Using standard printer service for test ticket')
      return await StandardPrinterService.printTestTicket()
    }

    // Otherwise use thermal printer
    if (!this.printer) {
      log.error('Thermal printer not initialized')
      return false
    }

    try {
      log.info('Printing test ticket (thermal)')

      this.printer.clear()

      // Header
      this.printer.alignCenter()
      this.printer.setTextSize(1, 1)
      this.printer.bold(true)
      this.printer.println('POSPlus - TEST TICKET')
      this.printer.bold(false)
      this.printer.setTextNormal()
      this.printer.println('Point of Sale System')
      this.printer.drawLine()
      this.printer.newLine()

      // Test info
      this.printer.alignLeft()
      this.printer.println(`Test Date: ${new Date().toLocaleString()}`)
      this.printer.println('Printer Type: Thermal 80mm')
      this.printer.println('Character Set: SLOVENIA')
      this.printer.drawLine()
      this.printer.newLine()

      // Sample items
      this.printer.println('Sample Product 1')
      this.printer.println('  2 x 5.500 DT = 11.000 DT')
      this.printer.newLine()
      this.printer.println('Sample Product 2')
      this.printer.println('  1 x 3.250 DT = 3.250 DT')
      this.printer.newLine()
      this.printer.println('Sample Product 3')
      this.printer.println('  3 x 2.000 DT = 6.000 DT')

      this.printer.newLine()
      this.printer.drawLine()

      // Totals
      this.printer.alignRight()
      this.printer.println('Subtotal: 20.250 DT')
      this.printer.println('Discount: -2.000 DT')

      this.printer.newLine()
      this.printer.bold(true)
      this.printer.setTextSize(1, 1)
      this.printer.println('TOTAL: 18.250 DT')
      this.printer.bold(false)
      this.printer.setTextNormal()

      this.printer.newLine()
      this.printer.drawLine()

      // Payment info
      this.printer.alignLeft()
      this.printer.println('Payment Method: CASH')
      this.printer.println('Amount Paid: 20.000 DT')
      this.printer.println('Change: 1.750 DT')

      this.printer.newLine()
      this.printer.drawLine()

      // Footer
      this.printer.alignCenter()
      this.printer.println('This is a test ticket')
      this.printer.println('Printer test successful!')
      this.printer.newLine()
      this.printer.println('POSPlus v1.0.0')
      this.printer.newLine()
      this.printer.newLine()
      this.printer.newLine()

      // Cut paper
      this.printer.cut()

      // Execute print
      log.info('Sending test print job to printer...')
      try {
        const result = await this.printer.execute()
        log.info('Test print command executed, result:', result)

        // Force clear buffer after execution
        this.printer.clear()

        log.info('Test ticket printed successfully')
        return true
      } catch (execError) {
        log.error('Test print execute failed:', execError)
        throw execError
      }
    } catch (error) {
      log.error('Failed to print test ticket:', error)
      return false
    }
  }

  async openDrawer(): Promise<boolean> {
    if (!this.isConnected) {
      log.error('Printer not initialized')
      return false
    }

    // Delegate to standard printer if using it (will return false)
    if (this.useStandardPrinter) {
      log.warn('Cash drawer not supported on standard printers')
      return await StandardPrinterService.openDrawer()
    }

    if (!this.printer) {
      log.error('Thermal printer not initialized')
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
