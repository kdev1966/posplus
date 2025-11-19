import TicketRepository from '../database/repositories/TicketRepository'
import log from 'electron-log'
// Do not import `node-thermal-printer` at module load time — require it lazily
// inside `initialize()` when a printer configuration exists. This avoids
// import-time side effects in environments without printer drivers.
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

class PrinterService {
  private printer: any | null = null
  private isConnected = false

  constructor() {
    this.initialize()
  }

  private async initialize() {
    try {
      // Check for explicit printer configuration before initializing.
      // We accept either an env var `PRINTER_INTERFACE` or a `printer.json`
      // file stored in the userData directory.
      const userData = app?.getPath ? app.getPath('userData') : process.cwd()
      const configPath = path.join(userData, 'printer.json')

      let config: any = null
      if (process.env.PRINTER_INTERFACE) {
        config = { interface: process.env.PRINTER_INTERFACE, type: process.env.PRINTER_TYPE }
      } else if (fs.existsSync(configPath)) {
        try {
          const raw = fs.readFileSync(configPath, 'utf8')
          config = JSON.parse(raw)
        } catch (err) {
          log.warn('Failed to read printer.json, will skip printer initialization', err)
        }
      }

      if (!config || !config.interface) {
        log.info('No printer configuration found (env or printer.json). Skipping printer initialization.')
        this.printer = null
        this.isConnected = false
        return
      }

      // Initialize printer (USB or Network) with provided config.
      // Require the library lazily to avoid errors when no drivers are present.
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ntp = require('node-thermal-printer')
        const ThermalPrinter = ntp.ThermalPrinter
        const PrinterTypes = ntp.PrinterTypes

        this.printer = new ThermalPrinter({
          type: (config.type as any) || PrinterTypes.EPSON,
          interface: config.interface,
          characterSet: (config.characterSet as any) || 'SLOVENIA',
          removeSpecialCharacters: config.removeSpecialCharacters ?? false,
          lineCharacter: config.lineCharacter || '=',
          options: Object.assign({ timeout: 5000 }, config.options || {}),
        })
      } catch (err) {
        log.error('Failed to require/initialize node-thermal-printer, skipping printer init', err)
        this.printer = null
        this.isConnected = false
        return
      }

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
