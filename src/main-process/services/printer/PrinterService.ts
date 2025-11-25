import TicketRepository from '../database/repositories/TicketRepository'
import StoreSettingsRepository from '../database/repositories/StoreSettingsRepository'
import log from 'electron-log'
import { ThermalPrinter, PrinterTypes, CharacterSet } from 'node-thermal-printer'
import { getPrinterConfig } from '../../utils/printerConfig'
import { BrowserWindow } from 'electron'

class PrinterService {
  private printer: ThermalPrinter | null = null
  private isConnected = false
  private lastError: string | null = null
  private initPromise: Promise<void>
  private isWindows = process.platform === 'win32'
  private windowsPrinterName: string | null = null

  constructor() {
    this.initPromise = this.initialize()
  }

  private async initialize(): Promise<void> {
    try {
      const cfg = await getPrinterConfig()

      // WINDOWS: Use Electron native printing with Windows printer spooler
      if (this.isWindows && cfg && cfg.printerName) {
        log.info('🪟 Windows platform detected - using Electron native printing')
        log.info(`   Printer name: ${cfg.printerName}`)

        this.windowsPrinterName = cfg.printerName
        this.isConnected = true
        this.lastError = null

        log.info('✅ Windows printer configured successfully')
        log.info('⚠️  Physical printing will be tested when you print a ticket')
        return
      }

      // NON-WINDOWS: Use node-thermal-printer with serial/parallel ports
      log.info('🐧 Non-Windows platform - using node-thermal-printer')

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
        ...configuredInterfaces,
        { interface: 'printer:POS80 Printer', type: PrinterTypes.EPSON },
        { interface: '\\\\.\\CP001', type: PrinterTypes.EPSON },
        { interface: '//./CP001', type: PrinterTypes.EPSON },
        { interface: 'CP001', type: PrinterTypes.EPSON },
        { interface: 'printer:POS80 Printer', type: PrinterTypes.STAR },
        { interface: '\\\\.\\CP001', type: PrinterTypes.STAR },
        { interface: '//./CP001', type: PrinterTypes.STAR },
      ]

      log.info(`Testing ${configurations.length} thermal printer configurations`)

      for (const config of configurations) {
        try {
          log.info(`Testing: interface="${config.interface}", type=${config.type}`)

          this.printer = new ThermalPrinter({
            type: config.type,
            interface: config.interface,
            characterSet: CharacterSet.PC850_MULTILINGUAL,
            removeSpecialCharacters: false,
            lineCharacter: '-',
            width: 48,
            options: {
              timeout: 5000,
            },
          })

          this.isConnected = await this.testConnection()
          log.info(`Connection test result: ${this.isConnected}`)

          if (this.isConnected) {
            log.info(`✅ Thermal printer connected: ${config.interface}`)
            log.info(`   Type: ${config.type}`)
            this.lastError = null
            return
          }
        } catch (err: any) {
          log.error(`✗ Configuration failed:`, {
            interface: config.interface,
            type: config.type,
            message: err.message,
          })
          this.lastError = (err as any)?.message || String(err)
          continue
        }
      }

      log.error('❌ All thermal printer interfaces failed')
      this.lastError = 'All thermal printer interfaces failed'
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

  private async printWithWindowsPrinter(html: string): Promise<boolean> {
    if (!this.windowsPrinterName) {
      log.error('Windows printer name not configured')
      return false
    }

    return new Promise((resolve) => {
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      })

      printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

      printWindow.webContents.on('did-finish-load', () => {
        printWindow.webContents.print(
          {
            silent: true,
            printBackground: false,
            deviceName: this.windowsPrinterName!,
            margins: {
              marginType: 'none',
            },
            pageSize: {
              width: 80000, // 80mm in microns
              height: 297000, // A4 height as max
            },
          },
          (success, failureReason) => {
            if (!success) {
              log.error('Windows print failed:', failureReason)
              this.lastError = failureReason || 'Print failed'
            } else {
              log.info('✅ Windows print completed successfully')
              this.lastError = null
            }

            printWindow.close()
            resolve(success)
          }
        )
      })
    })
  }

  private generateTicketHTML(ticket: any): string {
    // Get store settings
    const storeSettings = StoreSettingsRepository.getSettings()

    // Detect language from user preference or default to French
    const isArabic = false
    const storeName = isArabic ? storeSettings.storeNameAr : storeSettings.storeNameFr
    const ticketMessage = isArabic ? storeSettings.ticketMessageAr : storeSettings.ticketMessageFr

    // Compact item lines - single row per item
    const lines = ticket.lines
      .map(
        (line: any) =>
          `<tr>
            <td class="name">${line.productName}</td>
            <td class="qty">${line.quantity}</td>
            <td class="price">${line.totalAmount.toFixed(3)}</td>
          </tr>`
      )
      .join('')

    const payments = ticket.payments
      .map(
        (payment: any) =>
          `<tr>
            <td>${payment.method.toUpperCase()}</td>
            <td class="right">${payment.amount.toFixed(3)}</td>
          </tr>`
      )
      .join('')

    const formattedDate = new Date(ticket.createdAt).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })

    // Compact ticket optimized for 80mm thermal printer (48 chars width)
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@page { size: 72mm auto; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.2;
  width: 72mm;
  padding: 2mm;
  color: #000;
}
.center { text-align: center; }
.right { text-align: right; }
.bold { font-weight: bold; }
.line { border-top: 1px dashed #000; margin: 3px 0; }
.dbl { border-top: 1px solid #000; margin: 3px 0; }
.store { font-size: 14px; font-weight: bold; }
.big { font-size: 16px; font-weight: bold; }
table { width: 100%; border-collapse: collapse; }
td { padding: 1px 0; vertical-align: top; }
.name { max-width: 38mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.qty { width: 8mm; text-align: center; }
.price { width: 18mm; text-align: right; }
.info td { font-size: 11px; }
.total-box { background: #000; color: #fff; padding: 4px; margin: 4px 0; }
.small { font-size: 10px; color: #666; }
</style>
</head>
<body>
<div class="center">
<div class="store">${storeName || 'POS+'}</div>
${storeSettings.storePhone ? `<div class="small">${storeSettings.storePhone}</div>` : ''}
</div>
<div class="dbl"></div>
<table class="info">
<tr><td>N°</td><td class="right">${ticket.ticketNumber}</td></tr>
<tr><td>${formattedDate}</td><td class="right">#${ticket.userId}</td></tr>
</table>
<div class="line"></div>
<table>
<tr class="bold"><td>Article</td><td class="qty">Qté</td><td class="price">Prix</td></tr>
</table>
<div class="line"></div>
<table>${lines}</table>
<div class="line"></div>
<table>
<tr><td>Sous-total</td><td class="right">${ticket.subtotal.toFixed(3)}</td></tr>
${ticket.discountAmount > 0 ? `<tr><td>Remise</td><td class="right">-${ticket.discountAmount.toFixed(3)}</td></tr>` : ''}
</table>
<div class="total-box center">
<div>TOTAL</div>
<div class="big">${ticket.totalAmount.toFixed(3)} DT</div>
</div>
<table>${payments}</table>
<div class="line"></div>
<div class="center small">
${ticketMessage || 'Merci pour votre achat !'}
<br>POS+
</div>
</body>
</html>`
  }

  private generateTestTicketHTML(): string {
    const formattedDate = new Date().toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })

    const platform = process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux'

    // Compact test ticket optimized for 80mm thermal printer
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@page { size: 72mm auto; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.2;
  width: 72mm;
  padding: 2mm;
  color: #000;
}
.center { text-align: center; }
.right { text-align: right; }
.bold { font-weight: bold; }
.line { border-top: 1px dashed #000; margin: 3px 0; }
.dbl { border-top: 1px solid #000; margin: 3px 0; }
.store { font-size: 14px; font-weight: bold; }
.big { font-size: 16px; font-weight: bold; }
table { width: 100%; border-collapse: collapse; }
td { padding: 1px 0; vertical-align: top; }
.name { max-width: 38mm; }
.qty { width: 8mm; text-align: center; }
.price { width: 18mm; text-align: right; }
.total-box { background: #000; color: #fff; padding: 4px; margin: 4px 0; }
.small { font-size: 10px; color: #666; }
.test-badge { font-size: 11px; font-weight: bold; border: 1px solid #000; padding: 2px 6px; display: inline-block; margin: 4px 0; }
</style>
</head>
<body>
<div class="center">
<div class="store">POS+ TEST</div>
<div class="test-badge">TICKET DE TEST</div>
</div>
<div class="dbl"></div>
<table>
<tr><td>Date</td><td class="right">${formattedDate}</td></tr>
<tr><td>Imprimante</td><td class="right">80mm</td></tr>
<tr><td>Plateforme</td><td class="right">${platform}</td></tr>
</table>
<div class="line"></div>
<table>
<tr class="bold"><td>Article</td><td class="qty">Qté</td><td class="price">Prix</td></tr>
</table>
<div class="line"></div>
<table>
<tr><td class="name">Produit Test 1</td><td class="qty">2</td><td class="price">11.000</td></tr>
<tr><td class="name">Produit Test 2</td><td class="qty">1</td><td class="price">3.250</td></tr>
<tr><td class="name">Produit Test 3</td><td class="qty">3</td><td class="price">6.000</td></tr>
</table>
<div class="line"></div>
<table>
<tr><td>Sous-total</td><td class="right">20.250</td></tr>
<tr><td>Remise</td><td class="right">-2.000</td></tr>
</table>
<div class="total-box center">
<div>TOTAL</div>
<div class="big">18.250 DT</div>
</div>
<table>
<tr><td>ESPECES</td><td class="right">20.000</td></tr>
<tr><td>Monnaie</td><td class="right">1.750</td></tr>
</table>
<div class="line"></div>
<div class="center">
<div class="bold">Test OK!</div>
<div class="small">POS+</div>
</div>
</body>
</html>`
  }

  async printTicket(ticketId: number): Promise<boolean> {
    await this.initPromise

    if (!this.isConnected) {
      log.error('❌ Printer not connected - Cannot print ticket')
      return false
    }

    try {
      const ticket = TicketRepository.findById(ticketId)
      if (!ticket) {
        log.error(`Ticket not found: ${ticketId}`)
        return false
      }

      log.info(`Printing ticket: ${ticket.ticketNumber}`)

      // WINDOWS: Use Electron native printing
      if (this.isWindows && this.windowsPrinterName) {
        log.info(`🪟 Using Windows printer: ${this.windowsPrinterName}`)
        const html = this.generateTicketHTML(ticket)
        const success = await this.printWithWindowsPrinter(html)

        if (success) {
          log.info(`✅ Ticket printed successfully: ${ticket.ticketNumber}`)
        } else {
          log.error(`❌ Failed to print ticket: ${ticket.ticketNumber}`)
        }

        return success
      }

      // NON-WINDOWS: Use node-thermal-printer
      if (!this.printer) {
        log.error('❌ Thermal printer not available')
        return false
      }

      log.info(`Printing ticket (thermal): ${ticket.ticketNumber}`)

      // Get store settings
      const storeSettings = StoreSettingsRepository.getSettings()
      const isArabic = false // Can be enhanced to check user language preference
      const storeName = isArabic ? storeSettings.storeNameAr : storeSettings.storeNameFr
      const ticketMessage = isArabic ? storeSettings.ticketMessageAr : storeSettings.ticketMessageFr

      this.printer.clear()

      // Header with store info
      this.printer.alignCenter()
      this.printer.setTextSize(1, 1)
      this.printer.bold(true)
      if (storeName) {
        this.printer.println(storeName)
      } else {
        this.printer.println('POS+')
      }
      this.printer.bold(false)
      this.printer.setTextNormal()
      if (storeSettings.storePhone) {
        this.printer.println(storeSettings.storePhone)
      } else {
        this.printer.println('Point of Sale System')
      }
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

      // Footer with custom message
      this.printer.alignCenter()
      if (ticketMessage) {
        this.printer.println(ticketMessage)
      } else {
        this.printer.println('Thank you for your purchase!')
        this.printer.println('Please come again')
      }
      this.printer.newLine()
      this.printer.newLine()
      this.printer.newLine()

      // Cut paper
      this.printer.cut()

      // Execute print
      log.info('Sending print job to printer...')
      const result = await this.printer.execute()
      log.info('Print command executed, result:', result)

      // Force clear buffer after execution
      this.printer.clear()

      log.info(`Ticket printed successfully: ${ticket.ticketNumber}`)
      return true
    } catch (error) {
      log.error('Failed to print ticket:', error)
      this.lastError = (error as any)?.message || String(error)
      return false
    }
  }

  getTestTicketHTML(): string {
    return this.generateTestTicketHTML()
  }

  getTicketHTML(ticketId: number): string | null {
    try {
      const ticket = TicketRepository.findById(ticketId)
      if (!ticket) {
        log.error(`Ticket not found for preview: ${ticketId}`)
        return null
      }
      return this.generateTicketHTML(ticket)
    } catch (error) {
      log.error('Failed to generate ticket preview:', error)
      return null
    }
  }

  async printTestTicket(): Promise<boolean> {
    await this.initPromise

    if (!this.isConnected) {
      log.error('❌ Printer not connected - Cannot print test ticket')
      return false
    }

    try {
      log.info('Printing test ticket')

      // WINDOWS: Use Electron native printing
      if (this.isWindows && this.windowsPrinterName) {
        log.info(`🪟 Using Windows printer: ${this.windowsPrinterName}`)
        const html = this.generateTestTicketHTML()
        const success = await this.printWithWindowsPrinter(html)

        if (success) {
          log.info('✅ Test ticket printed successfully')
          log.info('⚠️  Check if ticket printed physically')
        } else {
          log.error('❌ Failed to print test ticket')
        }

        return success
      }

      // NON-WINDOWS: Use node-thermal-printer
      if (!this.printer) {
        log.error('❌ Thermal printer not available')
        return false
      }

      log.info('Printing test ticket (thermal)')

      this.printer.clear()

      // Header
      this.printer.alignCenter()
      this.printer.setTextSize(1, 1)
      this.printer.bold(true)
      this.printer.println('POS+ - TEST TICKET')
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
      this.printer.println('POS+ v1.0.0')
      this.printer.newLine()
      this.printer.newLine()
      this.printer.newLine()

      // Cut paper
      this.printer.cut()

      // Execute print
      log.info('Sending test print job to printer...')
      const result = await this.printer.execute()
      log.info('Test print command executed, result:', result)

      // Force clear buffer after execution
      this.printer.clear()

      log.info('✅ Print commands sent successfully')
      log.info('⚠️  Check if ticket printed physically')
      return true
    } catch (error) {
      log.error('Failed to print test ticket:', error)
      this.lastError = (error as any)?.message || String(error)
      return false
    }
  }

  async openDrawer(): Promise<boolean> {
    await this.initPromise

    if (!this.isConnected) {
      log.error('❌ Printer not connected - Cannot open cash drawer')
      return false
    }

    // WINDOWS: Cash drawer control via Windows spooler not supported
    if (this.isWindows && this.windowsPrinterName) {
      log.warn('⚠️  Cash drawer control not available via Windows printing')
      log.warn('   Cash drawer can only be opened via ESC/POS commands on direct port connection')
      this.lastError = 'Cash drawer control not available on Windows'
      return false
    }

    // NON-WINDOWS: Use node-thermal-printer
    if (!this.printer) {
      log.error('❌ Thermal printer not available')
      return false
    }

    try {
      log.info('Opening cash drawer')
      this.printer.openCashDrawer()
      await this.printer.execute()

      // Force clear buffer after execution
      this.printer.clear()

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

    // Clean up old printer instance to prevent resource leaks
    if (this.printer) {
      try {
        this.printer.clear()
      } catch (err) {
        log.warn('Failed to clear old printer buffer during reconnect:', err)
      }
      this.printer = null
    }

    // Reset state
    this.isConnected = false
    this.lastError = null
    this.windowsPrinterName = null

    // Reinitialize with new promise
    this.initPromise = this.initialize()
    await this.initPromise

    return this.isConnected
  }
}

export default new PrinterService()
