import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import log from 'electron-log'
import TicketRepository from '../database/repositories/TicketRepository'

const execAsync = promisify(exec)

/**
 * Standard Printer Service for non-thermal printers (Laser, Inkjet, PDF)
 * Uses system print commands (lp on macOS/Linux, print on Windows)
 */
class StandardPrinterService {
  private isConnected = false
  private printerName: string | null = null
  private initPromise: Promise<void>

  constructor() {
    this.initPromise = this.initialize()
  }

  private async initialize(): Promise<void> {
    try {
      log.info('StandardPrinter: Initializing standard printer service')

      if (process.platform === 'darwin') {
        // macOS - use lpstat to find default printer
        const { stdout } = await execAsync('lpstat -d')
        const match = stdout.match(/system default destination: (.+)/)
        if (match) {
          this.printerName = match[1].trim()
          log.info(`StandardPrinter: Found default printer: ${this.printerName}`)
          this.isConnected = true
        } else {
          log.warn('StandardPrinter: No default printer found')
          this.isConnected = false
        }
      } else if (process.platform === 'win32') {
        // Windows - use wmic or PowerShell
        try {
          const { stdout } = await execAsync('wmic printer where default=true get name /value')
          const match = stdout.match(/Name=(.+)/)
          if (match) {
            this.printerName = match[1].trim()
            log.info(`StandardPrinter: Found default printer: ${this.printerName}`)
            this.isConnected = true
          }
        } catch (error) {
          log.warn('StandardPrinter: Failed to get Windows default printer:', error)
          this.isConnected = false
        }
      }
    } catch (error) {
      log.error('StandardPrinter: Failed to initialize:', error)
      this.isConnected = false
    }
  }

  private generateTextReceipt(ticket: any): string {
    const lines: string[] = []
    const width = 80 // Character width for receipt

    // Helper functions
    const center = (text: string) => {
      const padding = Math.max(0, Math.floor((width - text.length) / 2))
      return ' '.repeat(padding) + text
    }

    const leftRight = (left: string, right: string) => {
      const spacing = Math.max(1, width - left.length - right.length)
      return left + ' '.repeat(spacing) + right
    }

    const line = () => '='.repeat(width)

    // Header
    lines.push('')
    lines.push(center('POSPlus'))
    lines.push(center('Point of Sale System'))
    lines.push(line())
    lines.push('')

    // Ticket info
    lines.push(`Ticket: ${ticket.ticketNumber}`)
    lines.push(`Date: ${new Date(ticket.createdAt).toLocaleString()}`)
    lines.push(`Cashier: User #${ticket.userId}`)
    lines.push(line())
    lines.push('')

    // Items
    for (const item of ticket.lines) {
      lines.push(item.productName)
      lines.push(leftRight(
        `  ${item.quantity} x ${item.unitPrice.toFixed(3)} DT`,
        `${item.totalAmount.toFixed(3)} DT`
      ))
    }

    lines.push('')
    lines.push(line())

    // Totals
    lines.push(leftRight('Subtotal:', `${ticket.subtotal.toFixed(3)} DT`))

    if (ticket.discountAmount > 0) {
      lines.push(leftRight('Discount:', `-${ticket.discountAmount.toFixed(3)} DT`))
    }

    lines.push('')
    lines.push(leftRight('TOTAL:', `${ticket.totalAmount.toFixed(3)} DT`))
    lines.push('')
    lines.push(line())

    // Payments
    lines.push('Payments:')
    for (const payment of ticket.payments) {
      lines.push(leftRight(
        `  ${payment.method.toUpperCase()}:`,
        `${payment.amount.toFixed(3)} DT`
      ))
    }

    lines.push('')
    lines.push(line())

    // Footer
    lines.push(center('Thank you for your purchase!'))
    lines.push(center('Please come again'))
    lines.push('')
    lines.push('')

    return lines.join('\n')
  }

  private generateTestReceipt(): string {
    const lines: string[] = []
    const width = 80

    const center = (text: string) => {
      const padding = Math.max(0, Math.floor((width - text.length) / 2))
      return ' '.repeat(padding) + text
    }

    const leftRight = (left: string, right: string) => {
      const spacing = Math.max(1, width - left.length - right.length)
      return left + ' '.repeat(spacing) + right
    }

    const line = () => '='.repeat(width)

    // Header
    lines.push('')
    lines.push(center('POSPlus - TEST TICKET'))
    lines.push(center('Point of Sale System'))
    lines.push(line())
    lines.push('')

    // Test info
    lines.push(`Test Date: ${new Date().toLocaleString()}`)
    lines.push('Printer Type: Standard (Laser/Inkjet/PDF)')
    lines.push(`Printer Name: ${this.printerName || 'Unknown'}`)
    lines.push(line())
    lines.push('')

    // Sample items
    lines.push('Sample Product 1')
    lines.push(leftRight('  2 x 5.500 DT', '11.000 DT'))
    lines.push('')
    lines.push('Sample Product 2')
    lines.push(leftRight('  1 x 3.250 DT', '3.250 DT'))
    lines.push('')
    lines.push('Sample Product 3')
    lines.push(leftRight('  3 x 2.000 DT', '6.000 DT'))

    lines.push('')
    lines.push(line())

    // Totals
    lines.push(leftRight('Subtotal:', '20.250 DT'))
    lines.push(leftRight('Discount:', '-2.000 DT'))
    lines.push('')
    lines.push(leftRight('TOTAL:', '18.250 DT'))

    lines.push('')
    lines.push(line())

    // Payment info
    lines.push('Payment Method: CASH')
    lines.push('Amount Paid: 20.000 DT')
    lines.push('Change: 1.750 DT')

    lines.push('')
    lines.push(line())

    // Footer
    lines.push(center('This is a test ticket'))
    lines.push(center('Printer test successful!'))
    lines.push('')
    lines.push(center('POSPlus v1.0.0'))
    lines.push('')
    lines.push('')

    return lines.join('\n')
  }

  private async printTextFile(content: string): Promise<boolean> {
    const tempDir = os.tmpdir()
    const tempFile = path.join(tempDir, `posplus-receipt-${Date.now()}.txt`)

    try {
      // Write content to temporary file
      fs.writeFileSync(tempFile, content, 'utf-8')
      log.info(`StandardPrinter: Created temp file: ${tempFile}`)

      if (process.platform === 'darwin') {
        // macOS - use lp command
        const printerArg = this.printerName ? `-d "${this.printerName}"` : ''
        const command = `lp ${printerArg} -o media=A4 -o fit-to-page "${tempFile}"`

        log.info(`StandardPrinter: Executing: ${command}`)
        const { stdout, stderr } = await execAsync(command)

        if (stderr) {
          log.warn(`StandardPrinter: lp stderr: ${stderr}`)
        }
        if (stdout) {
          log.info(`StandardPrinter: lp stdout: ${stdout}`)
        }

        log.info('StandardPrinter: Print job sent successfully')
        return true
      } else if (process.platform === 'win32') {
        // Windows - use print command
        const printerArg = this.printerName ? `/D:"${this.printerName}"` : ''
        const command = `print ${printerArg} "${tempFile}"`

        log.info(`StandardPrinter: Executing: ${command}`)
        const { stdout, stderr } = await execAsync(command)

        if (stderr) {
          log.warn(`StandardPrinter: print stderr: ${stderr}`)
        }
        if (stdout) {
          log.info(`StandardPrinter: print stdout: ${stdout}`)
        }

        log.info('StandardPrinter: Print job sent successfully')
        return true
      } else {
        log.error('StandardPrinter: Unsupported platform')
        return false
      }
    } catch (error) {
      log.error('StandardPrinter: Failed to print:', error)
      return false
    } finally {
      // Clean up temp file after a delay
      setTimeout(() => {
        try {
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile)
            log.info(`StandardPrinter: Cleaned up temp file: ${tempFile}`)
          }
        } catch (err) {
          log.warn(`StandardPrinter: Failed to clean up temp file:`, err)
        }
      }, 5000) // 5 second delay to ensure print job is spooled
    }
  }

  async printTicket(ticketId: number): Promise<boolean> {
    await this.initPromise // Wait for initialization

    if (!this.isConnected) {
      log.error('StandardPrinter: Printer not connected')
      return false
    }

    try {
      const ticket = TicketRepository.findById(ticketId)
      if (!ticket) {
        log.error(`StandardPrinter: Ticket not found: ${ticketId}`)
        return false
      }

      log.info(`StandardPrinter: Printing ticket: ${ticket.ticketNumber}`)
      const content = this.generateTextReceipt(ticket)
      return await this.printTextFile(content)
    } catch (error) {
      log.error('StandardPrinter: Failed to print ticket:', error)
      return false
    }
  }

  async printTestTicket(): Promise<boolean> {
    await this.initPromise // Wait for initialization

    if (!this.isConnected) {
      log.error('StandardPrinter: Printer not connected')
      return false
    }

    try {
      log.info('StandardPrinter: Printing test ticket')
      const content = this.generateTestReceipt()
      return await this.printTextFile(content)
    } catch (error) {
      log.error('StandardPrinter: Failed to print test ticket:', error)
      return false
    }
  }

  async openDrawer(): Promise<boolean> {
    await this.initPromise // Wait for initialization
    log.warn('StandardPrinter: Cash drawer not supported on standard printers')
    return false
  }

  async getStatus(): Promise<{ connected: boolean; ready: boolean }> {
    await this.initPromise // Wait for initialization
    return {
      connected: this.isConnected,
      ready: this.isConnected,
    }
  }

  async reconnect(): Promise<boolean> {
    log.info('StandardPrinter: Attempting to reconnect')
    await this.initialize()
    return this.isConnected
  }
}

export default new StandardPrinterService()
