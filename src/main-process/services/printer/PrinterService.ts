import TicketRepository from '../database/repositories/TicketRepository'
import StoreSettingsRepository from '../database/repositories/StoreSettingsRepository'
import ZReportRepository from '../database/repositories/ZReportRepository'
import SessionRepository from '../database/repositories/SessionRepository'
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

  private generateTicketHTML(ticket: any, language: 'fr' | 'ar' = 'fr'): string {
    // Get store settings
    const storeSettings = StoreSettingsRepository.getSettings()

    // Use language parameter to determine content
    const isArabic = language === 'ar'
    const storeName = isArabic ? storeSettings.storeNameAr : storeSettings.storeNameFr
    const ticketMessage = isArabic ? storeSettings.ticketMessageAr : storeSettings.ticketMessageFr

    // Compact item lines - single row per item
    // HTML order is logical (Name, Qty, Price) - CSS handles RTL display
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

    const formattedDate = new Date(ticket.createdAt).toLocaleString(isArabic ? 'ar-TN' : 'fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })

    // Labels based on language
    const labels = isArabic ? {
      article: 'المنتج',
      qty: 'الكمية',
      price: 'السعر',
      subtotal: 'المجموع الفرعي',
      discount: 'الخصم',
      total: 'المجموع',
      thanks: 'شكرا لزيارتكم!',
      cash: 'نقدا',
      card: 'بطاقة',
      check: 'شيك',
      change: 'الباقي'
    } : {
      article: 'Article',
      qty: 'Qté',
      price: 'Prix',
      subtotal: 'Sous-total',
      discount: 'Remise',
      total: 'TOTAL',
      thanks: 'Merci pour votre achat !',
      cash: 'ESPECES',
      card: 'CARTE',
      check: 'CHEQUE',
      change: 'Monnaie'
    }

    // Translate payment methods
    const translatePaymentMethod = (method: string) => {
      const m = method.toLowerCase()
      if (m === 'cash' || m === 'especes' || m === 'espèces') return labels.cash
      if (m === 'card' || m === 'carte') return labels.card
      if (m === 'check' || m === 'cheque' || m === 'chèque') return labels.check
      return method.toUpperCase()
    }

    // Process payments - for cash, show amount given and change
    // Only show ONE ESPECES line with the total cash given, then calculate change
    let paymentsHtml = ''
    let totalCashGiven = 0

    // First pass: calculate total cash and add non-cash payments
    ticket.payments.forEach((payment: any) => {
      const method = payment.method.toLowerCase()
      const isCash = method === 'cash' || method === 'especes' || method === 'espèces'

      if (isCash) {
        totalCashGiven += payment.amount
      } else {
        paymentsHtml += `<tr><td>${translatePaymentMethod(payment.method)}</td><td class="right">${payment.amount.toFixed(3)}</td></tr>`
      }
    })

    // Add single cash line if cash was used
    if (totalCashGiven > 0) {
      paymentsHtml += `<tr><td>${labels.cash}</td><td class="right">${totalCashGiven.toFixed(3)}</td></tr>`

      // Add change line if there's change to return
      const cashChange = totalCashGiven - ticket.totalAmount
      if (cashChange > 0.001) {
        paymentsHtml += `<tr><td>${labels.change}</td><td class="right">${cashChange.toFixed(3)}</td></tr>`
      }
    }

    // Compact ticket optimized for 80mm thermal printer (48 chars width)
    // Print area ~72mm (80mm - margins), using percentage-based columns
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@page { size: 72mm auto; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  width: 72mm;
  max-width: 72mm;
  margin: 0;
  overflow-x: hidden;
  direction: ltr;
}
body {
  font-family: ${isArabic ? "'Arial', 'Tahoma', sans-serif" : "'Courier New', monospace"};
  font-size: 12px;
  line-height: 1.2;
  padding: 2mm;
  color: #000;
}
.center { text-align: center; }
.right { text-align: right; }
.left { text-align: left; }
.bold { font-weight: bold; }
.line { border-top: 1px dashed #000; margin: 3px 0; }
.dbl { border-top: 1px solid #000; margin: 3px 0; }
.store { font-size: 14px; font-weight: bold; text-align: center; }
.phone { font-size: 11px; font-weight: bold; text-align: center; }
.big { font-size: 16px; font-weight: bold; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
td { padding: 1px 0; vertical-align: top; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.name { width: 50%; text-align: left; }
.qty { width: 20%; text-align: center; }
.price { width: 30%; text-align: right; }
.info td { font-size: 11px; width: 50%; }
.total-box { background: #000; color: #fff; padding: 4px; margin: 4px 0; font-weight: bold; text-align: center; }
.small { font-size: 10px; color: #666; }
.footer { font-size: 10px; font-weight: bold; text-align: center; }
${isArabic ? `.ar { direction: rtl; text-align: right; }` : ''}
</style>
</head>
<body>
<div class="center">
<div class="store">${storeName || 'POS+'}</div>
${storeSettings.storePhone ? `<div class="phone">${storeSettings.storePhone}</div>` : ''}
</div>
<div class="dbl"></div>
<table class="info">
<tr><td>${isArabic ? '<span class="ar">رقم</span>' : 'N°'}</td><td class="right">${ticket.ticketNumber}</td></tr>
<tr><td>${formattedDate}</td><td class="right">#${ticket.userId}</td></tr>
</table>
<div class="line"></div>
<table>
<tr class="bold"><td class="name">${isArabic ? `<span class="ar">${labels.article}</span>` : labels.article}</td><td class="qty">${isArabic ? `<span class="ar">${labels.qty}</span>` : labels.qty}</td><td class="price">${isArabic ? `<span class="ar">${labels.price}</span>` : labels.price}</td></tr>
</table>
<div class="line"></div>
<table>${lines}</table>
<div class="line"></div>
<table>
<tr><td>${isArabic ? `<span class="ar">${labels.subtotal}</span>` : labels.subtotal}</td><td class="right">${ticket.subtotal.toFixed(3)}</td></tr>
${ticket.discountAmount > 0 ? `<tr><td>${isArabic ? `<span class="ar">${labels.discount}</span>` : labels.discount}</td><td class="right">-${ticket.discountAmount.toFixed(3)}</td></tr>` : ''}
</table>
<div class="total-box center">
<div>${isArabic ? `<span class="ar">${labels.total}</span>` : labels.total}</div>
<div class="big">${ticket.totalAmount.toFixed(3)} ${isArabic ? 'د.ت' : 'DT'}</div>
</div>
<table>${paymentsHtml}</table>
<div class="line"></div>
<div class="center footer">
${isArabic ? `<span class="ar">${ticketMessage || labels.thanks}</span>` : (ticketMessage || labels.thanks)}
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
html, body {
  width: 72mm;
  max-width: 72mm;
  margin: 0;
  overflow: hidden;
}
body {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.2;
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
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
td { padding: 1px 0; vertical-align: top; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.name { width: 55%; }
.qty { width: 15%; text-align: center; }
.price { width: 30%; text-align: right; }
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

  async printTicket(ticketId: number, language: 'fr' | 'ar' = 'fr'): Promise<boolean> {
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

      log.info(`Printing ticket: ${ticket.ticketNumber} (language: ${language})`)

      // WINDOWS: Use Electron native printing
      if (this.isWindows && this.windowsPrinterName) {
        log.info(`🪟 Using Windows printer: ${this.windowsPrinterName}`)
        const html = this.generateTicketHTML(ticket, language)
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
      const isArabic = language === 'ar'
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

  getTicketHTML(ticketId: number, language: 'fr' | 'ar' = 'fr'): string | null {
    try {
      const ticket = TicketRepository.findById(ticketId)
      if (!ticket) {
        log.error(`Ticket not found for preview: ${ticketId}`)
        return null
      }
      return this.generateTicketHTML(ticket, language)
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

  // ============================================================================
  // Z REPORT PRINTING
  // ============================================================================

  private generateZReportHTML(zReport: any, session: any, language: 'fr' | 'ar' = 'fr'): string {
    const storeSettings = StoreSettingsRepository.getSettings()
    const isArabic = language === 'ar'
    const storeName = isArabic ? storeSettings.storeNameAr : storeSettings.storeNameFr

    const labels = isArabic ? {
      title: 'تقرير Z - إغلاق الجلسة',
      sessionInfo: 'معلومات الجلسة',
      sessionId: 'رقم الجلسة',
      openedAt: 'تاريخ الفتح',
      closedAt: 'تاريخ الإغلاق',
      openingCash: 'رصيد الافتتاح',
      closingCash: 'رصيد الإغلاق',
      salesSummary: 'ملخص المبيعات',
      totalTickets: 'عدد التذاكر',
      totalSales: 'إجمالي المبيعات',
      totalDiscount: 'إجمالي الخصومات',
      paymentMethods: 'طرق الدفع',
      cash: 'نقدا',
      card: 'بطاقة',
      transfer: 'تحويل',
      check: 'شيك',
      other: 'أخرى',
      cashReconciliation: 'مطابقة النقد',
      expectedCash: 'النقد المتوقع',
      actualCash: 'النقد الفعلي',
      difference: 'الفرق',
      generatedAt: 'تم إنشاء التقرير في'
    } : {
      title: 'RAPPORT Z - CLOTURE DE SESSION',
      sessionInfo: 'Informations Session',
      sessionId: 'Session N°',
      openedAt: 'Ouverture',
      closedAt: 'Fermeture',
      openingCash: 'Fond de caisse',
      closingCash: 'Caisse finale',
      salesSummary: 'Résumé des Ventes',
      totalTickets: 'Nombre de tickets',
      totalSales: 'Total ventes',
      totalDiscount: 'Total remises',
      paymentMethods: 'Modes de Paiement',
      cash: 'Espèces',
      card: 'Carte',
      transfer: 'Virement',
      check: 'Chèque',
      other: 'Autre',
      cashReconciliation: 'Réconciliation Caisse',
      expectedCash: 'Caisse attendue',
      actualCash: 'Caisse réelle',
      difference: 'Écart',
      generatedAt: 'Rapport généré le'
    }

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleString(isArabic ? 'ar-TN' : 'fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const expectedCash = session.openingCash + zReport.totalCash
    const difference = (session.closingCash || 0) - expectedCash

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  width: 80mm;
  padding: 3mm;
  direction: ${isArabic ? 'rtl' : 'ltr'};
}
.center { text-align: center; }
.bold { font-weight: bold; }
.big { font-size: 16px; }
.line { border-top: 1px dashed #000; margin: 5px 0; }
.double-line { border-top: 2px solid #000; margin: 5px 0; }
table { width: 100%; border-collapse: collapse; }
td { padding: 2px 0; }
td.right { text-align: ${isArabic ? 'left' : 'right'}; }
.section { margin: 8px 0; }
.section-title { font-weight: bold; margin-bottom: 4px; background: #eee; padding: 2px 4px; }
.total-row { font-weight: bold; font-size: 14px; }
.positive { color: #006400; }
.negative { color: #8B0000; }
</style>
</head>
<body>
<div class="center">
<div class="bold big">${storeName || 'POS+'}</div>
${storeSettings.storePhone ? `<div>${storeSettings.storePhone}</div>` : ''}
</div>
<div class="double-line"></div>
<div class="center bold big">${labels.title}</div>
<div class="line"></div>

<div class="section">
<div class="section-title">${labels.sessionInfo}</div>
<table>
<tr><td>${labels.sessionId}</td><td class="right">${session.id}</td></tr>
<tr><td>${labels.openedAt}</td><td class="right">${formatDate(session.startedAt)}</td></tr>
<tr><td>${labels.closedAt}</td><td class="right">${session.endedAt ? formatDate(session.endedAt) : '-'}</td></tr>
<tr><td>${labels.openingCash}</td><td class="right">${session.openingCash.toFixed(3)} DT</td></tr>
<tr><td>${labels.closingCash}</td><td class="right">${(session.closingCash || 0).toFixed(3)} DT</td></tr>
</table>
</div>

<div class="section">
<div class="section-title">${labels.salesSummary}</div>
<table>
<tr><td>${labels.totalTickets}</td><td class="right">${zReport.ticketCount}</td></tr>
<tr><td>${labels.totalSales}</td><td class="right bold">${zReport.totalSales.toFixed(3)} DT</td></tr>
<tr><td>${labels.totalDiscount}</td><td class="right">-${zReport.totalDiscount.toFixed(3)} DT</td></tr>
</table>
</div>

<div class="section">
<div class="section-title">${labels.paymentMethods}</div>
<table>
${zReport.totalCash > 0 ? `<tr><td>${labels.cash}</td><td class="right">${zReport.totalCash.toFixed(3)} DT</td></tr>` : ''}
${zReport.totalCard > 0 ? `<tr><td>${labels.card}</td><td class="right">${zReport.totalCard.toFixed(3)} DT</td></tr>` : ''}
${(zReport.totalTransfer || 0) > 0 ? `<tr><td>${labels.transfer}</td><td class="right">${(zReport.totalTransfer || 0).toFixed(3)} DT</td></tr>` : ''}
${(zReport.totalCheck || 0) > 0 ? `<tr><td>${labels.check}</td><td class="right">${(zReport.totalCheck || 0).toFixed(3)} DT</td></tr>` : ''}
${zReport.totalOther > 0 ? `<tr><td>${labels.other}</td><td class="right">${zReport.totalOther.toFixed(3)} DT</td></tr>` : ''}
</table>
</div>

<div class="section">
<div class="section-title">${labels.cashReconciliation}</div>
<table>
<tr><td>${labels.openingCash}</td><td class="right">${session.openingCash.toFixed(3)} DT</td></tr>
<tr><td>+ ${labels.cash}</td><td class="right">${zReport.totalCash.toFixed(3)} DT</td></tr>
<tr class="total-row"><td>= ${labels.expectedCash}</td><td class="right">${expectedCash.toFixed(3)} DT</td></tr>
</table>
<div class="line"></div>
<table>
<tr><td>${labels.actualCash}</td><td class="right">${(session.closingCash || 0).toFixed(3)} DT</td></tr>
<tr class="total-row"><td>${labels.difference}</td><td class="right ${difference >= 0 ? 'positive' : 'negative'}">${difference >= 0 ? '+' : ''}${difference.toFixed(3)} DT</td></tr>
</table>
</div>

<div class="double-line"></div>
<div class="center">
<div class="bold">${labels.generatedAt}</div>
<div>${formatDate(zReport.createdAt)}</div>
</div>
<div class="line"></div>
<div class="center">POS+ v1.0.0</div>
</body>
</html>`
  }

  getZReportHTML(sessionId: number, language: 'fr' | 'ar' = 'fr'): string | null {
    try {
      log.info(`getZReportHTML called for session: ${sessionId}, language: ${language}`)

      const zReport = ZReportRepository.findBySession(sessionId)
      log.info(`Z Report lookup result: ${zReport ? `found (ID: ${zReport.id})` : 'NOT FOUND'}`)

      if (!zReport) {
        log.error(`Z Report not found for session: ${sessionId}`)
        return null
      }

      const session = SessionRepository.findById(sessionId)
      log.info(`Session lookup result: ${session ? `found (ID: ${session.id})` : 'NOT FOUND'}`)

      if (!session) {
        log.error(`Session not found: ${sessionId}`)
        return null
      }

      const html = this.generateZReportHTML(zReport, session, language)
      log.info(`Generated HTML length: ${html?.length || 0}`)
      return html
    } catch (error) {
      log.error('Failed to generate Z Report preview:', error)
      return null
    }
  }

  async printZReport(sessionId: number, language: 'fr' | 'ar' = 'fr'): Promise<boolean> {
    await this.initPromise

    if (!this.isConnected) {
      log.error('❌ Printer not connected - Cannot print Z Report')
      return false
    }

    try {
      const zReport = ZReportRepository.findBySession(sessionId)
      if (!zReport) {
        log.error(`Z Report not found for session: ${sessionId}`)
        return false
      }

      const session = SessionRepository.findById(sessionId)
      if (!session) {
        log.error(`Session not found: ${sessionId}`)
        return false
      }

      log.info(`Printing Z Report for session: ${sessionId} (language: ${language})`)

      // WINDOWS: Use Electron native printing
      if (this.isWindows && this.windowsPrinterName) {
        log.info(`🪟 Using Windows printer: ${this.windowsPrinterName}`)
        const html = this.generateZReportHTML(zReport, session, language)
        const success = await this.printWithWindowsPrinter(html)

        if (success) {
          log.info(`✅ Z Report printed successfully for session: ${sessionId}`)
        } else {
          log.error(`❌ Failed to print Z Report for session: ${sessionId}`)
        }

        return success
      }

      // NON-WINDOWS: Use node-thermal-printer
      if (!this.printer) {
        log.error('❌ Thermal printer not available')
        return false
      }

      // For non-Windows, use HTML rendering via BrowserWindow
      const html = this.generateZReportHTML(zReport, session, language)
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
              margins: { marginType: 'none' },
              pageSize: { width: 80000, height: 297000 },
            },
            (success, failureReason) => {
              if (!success) {
                log.error('Z Report print failed:', failureReason)
                this.lastError = failureReason || 'Print failed'
              } else {
                log.info(`✅ Z Report printed successfully for session: ${sessionId}`)
                this.lastError = null
              }
              printWindow.close()
              resolve(success)
            }
          )
        })
      })
    } catch (error) {
      log.error('Failed to print Z Report:', error)
      this.lastError = (error as any)?.message || String(error)
      return false
    }
  }
}

export default new PrinterService()
