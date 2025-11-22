import TicketRepository from '../database/repositories/TicketRepository'
import log from 'electron-log'
import { ThermalPrinter, PrinterTypes, CharacterSet } from 'node-thermal-printer'
import { getPrinterConfig } from '../../utils/printerConfig'

class PrinterService {
  private printer: ThermalPrinter | null = null
  private isConnected = false
  private lastError: string | null = null
  private initPromise: Promise<void>

  constructor() {
    this.initPromise = this.initialize()
  }

  private async initialize(): Promise<void> {
    try {
      // Try thermal printer interfaces for all platforms (Windows, macOS, Linux)
      // POS80 is a generic ESC/POS thermal printer
      // Priority: configured printer name/port interface (best for sending data) > fallback interfaces
      const cfg = await getPrinterConfig()

      const configuredInterfaces = [] as { interface: string; type: any }[]
      if (cfg && cfg.printerName) {
        configuredInterfaces.push({ interface: `printer:${cfg.printerName}`, type: PrinterTypes.EPSON })
      }
      if (cfg && cfg.port) {
        configuredInterfaces.push({ interface: `\\\\.\\${cfg.port}`, type: PrinterTypes.EPSON })
        configuredInterfaces.push({ interface: `//./${cfg.port}`, type: PrinterTypes.EPSON })
        configuredInterfaces.push({ interface: `${cfg.port}`, type: PrinterTypes.EPSON })
      }

      const configurations = [
        // Configured first
        ...configuredInterfaces,
        // Defaults / fallbacks
        { interface: 'printer:POS80 Printer', type: PrinterTypes.EPSON },
        { interface: '\\\\.\\CP001', type: PrinterTypes.EPSON },
        { interface: '//./CP001', type: PrinterTypes.EPSON },
        { interface: 'CP001', type: PrinterTypes.EPSON },
        // Fallback: Try STAR if EPSON doesn't work
        { interface: 'printer:POS80 Printer', type: PrinterTypes.STAR },
        { interface: '\\\\.\\CP001', type: PrinterTypes.STAR },
        { interface: '//./CP001', type: PrinterTypes.STAR },
      ]

      log.info('Initializing printer: Trying thermal printer configurations')
      log.info(`Total configurations to test: ${configurations.length}`)

      for (const config of configurations) {
        try {
          log.info(`Testing: interface="${config.interface}", type=${config.type}`)

          this.printer = new ThermalPrinter({
            type: config.type,
            interface: config.interface,
            characterSet: CharacterSet.PC850_MULTILINGUAL,
            removeSpecialCharacters: false,
            lineCharacter: '-',
            width: 48,  // 80mm paper = 48 characters
            options: {
              timeout: 5000,
            },
          })

          log.info(`Created ThermalPrinter instance`)

          // Test connection
          this.isConnected = await this.testConnection()
          log.info(`Connection test result: ${this.isConnected}`)

          if (!this.isConnected) {
            log.info(`isPrinterConnected returned false for interface: ${config.interface}`)
          }

          if (this.isConnected) {
            // Connection test passed - save this configuration
            log.info(`✅ Thermal printer interface connected: ${config.interface}`)
            log.info(`   Type: ${config.type}`)
            log.info(`⚠️  Physical printing capability cannot be verified automatically`)
            log.info(`   Please test manually using "Print Test Ticket" button`)

            // Physical printing capability cannot be verified automatically
            // User must test manually using "Print Test Ticket" button
            return
          } else {
            log.warn(`✗ Connection test failed`)
            this.lastError = `Connection test failed for interface ${config.interface}`
          }
        } catch (err: any) {
          log.error(`✗ Configuration failed:`, {
            interface: config.interface,
            type: config.type,
            message: err.message,
            code: err.code,
          })
          this.lastError = (err as any)?.message || String(err)
          continue
        }
      }

      // ❌ DO NOT FALLBACK TO STANDARD PRINTER ON WINDOWS
      // StandardPrinterService uses 'print' command which sends raw text
      // Thermal printers require ESC/POS binary commands
      log.error('❌ All thermal printer interfaces failed')
      this.lastError = 'All thermal printer interfaces failed'
      log.error('THERMAL PRINTER REQUIRED: Application cannot use standard printer')
      log.error('Please check:')
      log.error('  1. Printer name is exactly: "POS80 Printer"')
      log.error('  2. Printer port is: CP001')
      log.error('  3. Printer is powered on and ready')
      log.error('  4. Driver is installed correctly')

      this.isConnected = false
    } catch (error) {
      log.error('Failed to initialize printer:', error)
      this.lastError = (error as any)?.message || String(error)
      this.isConnected = false
    }
  }

  private async testConnection(): Promise<boolean> {
    if (!this.printer) return false

    try {
      await this.printer.isPrinterConnected()
      return true
    } catch (error) {
      this.lastError = (error as any)?.message || String(error)
      return false
    }
  }

  async printTicket(ticketId: number): Promise<boolean> {
    await this.initPromise

    // Require thermal printer
    if (!this.isConnected || !this.printer) {
      log.error('❌ Thermal printer not connected - Cannot print ticket')
      log.error('Please check printer connection and restart application')
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
      this.lastError = (error as any)?.message || String(error)
      return false
    }
  }

  async printTestTicket(): Promise<boolean> {
    await this.initPromise

    // Require thermal printer
    if (!this.isConnected || !this.printer) {
      log.error('❌ Thermal printer not connected - Cannot print test ticket')
      log.error('Please check printer connection and restart application')
      return false
    }

    try {
      log.info('Printing test ticket (thermal)')
      log.info('⚠️  If ticket prints successfully, printer is working correctly')

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
      this.printer.println('Character Set: PC850 Multilingual')
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

        log.info('✅ Print commands sent successfully')
        log.info('⚠️  Check if ticket printed physically - if yes, printer is working')
        return true
      } catch (execError) {
        log.error('Test print execute failed:', execError)
        this.lastError = (execError as any)?.message || String(execError)
        throw execError
      }
    } catch (error) {
      log.error('Failed to print test ticket:', error)
      this.lastError = (error as any)?.message || String(error)
      return false
    }
  }

  async openDrawer(): Promise<boolean> {
    await this.initPromise

    // Require thermal printer
    if (!this.isConnected || !this.printer) {
      log.error('❌ Thermal printer not connected - Cannot open cash drawer')
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
      this.lastError = (error as any)?.message || String(error)
      return false
    }
  }

  async getStatus(): Promise<{ connected: boolean; ready: boolean; error?: string | null }> {
    await this.initPromise

    // Report connection status based on interface connection test
    // Note: Physical printing capability can only be verified by manual test
    const connected = this.isConnected

    return {
      connected,
      ready: connected,
      error: this.lastError,
    }
  }

  async reconnect(): Promise<boolean> {
    log.info('Attempting to reconnect printer')
    await this.initialize()
    return this.isConnected
  }
}

export default new PrinterService()
