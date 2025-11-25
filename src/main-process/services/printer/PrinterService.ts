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
    // For now, we'll use French as default. Can be enhanced to detect from user settings.
    const isArabic = false // Can be enhanced to check user language preference
    const storeName = isArabic ? storeSettings.storeNameAr : storeSettings.storeNameFr
    const ticketMessage = isArabic ? storeSettings.ticketMessageAr : storeSettings.ticketMessageFr

    const lines = ticket.lines
      .map(
        (line: any, index: number) =>
          `<tr class="item-row ${index % 2 === 0 ? 'even' : 'odd'}">
            <td class="item-name">${line.productName}</td>
          </tr>
          <tr class="item-row ${index % 2 === 0 ? 'even' : 'odd'}">
            <td class="item-details">
              <span class="qty">${line.quantity} ×</span>
              <span class="price">${line.unitPrice.toFixed(3)} DT</span>
            </td>
            <td class="item-total">${line.totalAmount.toFixed(3)} DT</td>
          </tr>`
      )
      .join('')

    const payments = ticket.payments
      .map(
        (payment: any) =>
          `<tr>
            <td class="payment-method">${payment.method.toUpperCase()}</td>
            <td class="payment-amount">${payment.amount.toFixed(3)} DT</td>
          </tr>`
      )
      .join('')

    const formattedDate = new Date(ticket.createdAt).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Arial', sans-serif;
            font-size: 11px;
            line-height: 1.5;
            margin: 0;
            padding: 4mm 3mm;
            width: 74mm;
            color: #1a1a1a;
            background: white;
          }

          /* Header Styles */
          .header {
            text-align: center;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #000;
          }

          .store-name {
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
            text-transform: uppercase;
          }

          .store-info {
            font-size: 10px;
            color: #444;
            margin-bottom: 2px;
          }

          .brand-badge {
            display: inline-block;
            background: linear-gradient(135deg, #22D3EE 0%, #3B82F6 50%, #8B5CF6 100%);
            color: white;
            font-weight: 600;
            font-size: 9px;
            padding: 2px 8px;
            border-radius: 3px;
            margin-top: 4px;
            letter-spacing: 1px;
          }

          /* Ticket Info */
          .ticket-info {
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px dashed #999;
          }

          .info-row {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            margin-bottom: 3px;
          }

          .info-label {
            color: #666;
            font-weight: 500;
          }

          .info-value {
            font-weight: 600;
            color: #000;
          }

          /* Items Section */
          .items-section {
            margin: 10px 0;
          }

          .items-header {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            color: #666;
            border-bottom: 1px solid #000;
            padding-bottom: 4px;
            margin-bottom: 6px;
          }

          .items-table {
            width: 100%;
            border-collapse: collapse;
          }

          .item-row {
            border-bottom: 1px dotted #ddd;
          }

          .item-row.even {
            background: #f9f9f9;
          }

          .item-name {
            font-weight: 600;
            font-size: 11px;
            padding: 4px 4px 2px 4px;
            color: #000;
          }

          .item-details {
            padding: 2px 4px 4px 8px;
            font-size: 10px;
            color: #555;
          }

          .qty {
            font-weight: 600;
            margin-right: 4px;
          }

          .price {
            color: #666;
          }

          .item-total {
            text-align: right;
            font-weight: 700;
            font-size: 11px;
            padding: 2px 4px 4px 4px;
            vertical-align: bottom;
          }

          /* Totals Section */
          .totals-section {
            margin: 10px 0;
            padding: 8px 0;
            border-top: 1px dashed #999;
          }

          .totals-table {
            width: 100%;
            border-collapse: collapse;
          }

          .totals-table td {
            padding: 3px 4px;
            font-size: 11px;
          }

          .totals-label {
            color: #666;
            font-weight: 500;
          }

          .totals-value {
            text-align: right;
            font-weight: 600;
          }

          .discount-row {
            color: #e63946;
          }

          /* Total Amount */
          .total-amount {
            margin: 10px 0;
            padding: 10px;
            background: #000;
            color: white;
            text-align: center;
            border-radius: 4px;
          }

          .total-label {
            font-size: 11px;
            font-weight: 500;
            letter-spacing: 1px;
            margin-bottom: 2px;
          }

          .total-value {
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 0.5px;
          }

          /* Payments Section */
          .payments-section {
            margin: 10px 0;
            padding: 8px 0;
            border-top: 1px dashed #999;
          }

          .payments-header {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            color: #666;
            margin-bottom: 6px;
          }

          .payments-table {
            width: 100%;
            border-collapse: collapse;
          }

          .payments-table td {
            padding: 3px 4px;
            font-size: 11px;
          }

          .payment-method {
            font-weight: 600;
            color: #000;
          }

          .payment-amount {
            text-align: right;
            font-weight: 600;
            color: #22C55E;
          }

          /* Footer */
          .footer {
            margin-top: 12px;
            padding-top: 8px;
            border-top: 2px solid #000;
            text-align: center;
          }

          .footer-message {
            font-size: 11px;
            font-weight: 600;
            color: #000;
            margin-bottom: 6px;
            line-height: 1.4;
          }

          .footer-info {
            font-size: 9px;
            color: #666;
            margin-top: 8px;
          }

          .powered-by {
            font-size: 8px;
            color: #999;
            margin-top: 6px;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <div class="store-name">${storeName || 'POS+'}</div>
          ${storeSettings.storePhone ? `<div class="store-info">${storeSettings.storePhone}</div>` : ''}
          <div class="brand-badge">POS+</div>
        </div>

        <!-- Ticket Info -->
        <div class="ticket-info">
          <div class="info-row">
            <span class="info-label">N° Ticket</span>
            <span class="info-value">${ticket.ticketNumber}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Date & Heure</span>
            <span class="info-value">${formattedDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Caissier(ère)</span>
            <span class="info-value">Utilisateur #${ticket.userId}</span>
          </div>
        </div>

        <!-- Items -->
        <div class="items-section">
          <div class="items-header">Articles</div>
          <table class="items-table">
            ${lines}
          </table>
        </div>

        <!-- Totals -->
        <div class="totals-section">
          <table class="totals-table">
            <tr>
              <td class="totals-label">Sous-total</td>
              <td class="totals-value">${ticket.subtotal.toFixed(3)} DT</td>
            </tr>
            ${
              ticket.discountAmount > 0
                ? `<tr class="discount-row">
                    <td class="totals-label">Remise</td>
                    <td class="totals-value">-${ticket.discountAmount.toFixed(3)} DT</td>
                  </tr>`
                : ''
            }
          </table>
        </div>

        <!-- Total Amount -->
        <div class="total-amount">
          <div class="total-label">TOTAL À PAYER</div>
          <div class="total-value">${ticket.totalAmount.toFixed(3)} DT</div>
        </div>

        <!-- Payments -->
        <div class="payments-section">
          <div class="payments-header">Paiements</div>
          <table class="payments-table">
            ${payments}
          </table>
        </div>

        <!-- Footer -->
        <div class="footer">
          ${ticketMessage ? `<div class="footer-message">${ticketMessage}</div>` : '<div class="footer-message">Merci pour votre achat !<br>À bientôt</div>'}
          <div class="footer-info">Conservez ce ticket comme preuve d'achat</div>
          <div class="powered-by">Powered by POS+ • www.posplus.tn</div>
        </div>

        <br><br>
      </body>
      </html>
    `
  }

  private generateTestTicketHTML(): string {
    const formattedDate = new Date().toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Arial', sans-serif;
            font-size: 11px;
            line-height: 1.5;
            margin: 0;
            padding: 4mm 3mm;
            width: 74mm;
            color: #1a1a1a;
            background: white;
          }

          .header {
            text-align: center;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #000;
          }

          .store-name {
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
            text-transform: uppercase;
          }

          .store-info {
            font-size: 10px;
            color: #444;
            margin-bottom: 2px;
          }

          .test-badge {
            display: inline-block;
            background: linear-gradient(135deg, #22D3EE 0%, #3B82F6 50%, #8B5CF6 100%);
            color: white;
            font-weight: 600;
            font-size: 9px;
            padding: 2px 8px;
            border-radius: 3px;
            margin-top: 4px;
            letter-spacing: 1px;
          }

          .ticket-info {
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px dashed #999;
          }

          .info-row {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            margin-bottom: 3px;
          }

          .info-label {
            color: #666;
            font-weight: 500;
          }

          .info-value {
            font-weight: 600;
            color: #000;
          }

          .items-section {
            margin: 10px 0;
          }

          .items-header {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            color: #666;
            border-bottom: 1px solid #000;
            padding-bottom: 4px;
            margin-bottom: 6px;
          }

          .items-table {
            width: 100%;
            border-collapse: collapse;
          }

          .item-row {
            border-bottom: 1px dotted #ddd;
          }

          .item-row.even {
            background: #f9f9f9;
          }

          .item-name {
            font-weight: 600;
            font-size: 11px;
            padding: 4px 4px 2px 4px;
            color: #000;
          }

          .item-details {
            padding: 2px 4px 4px 8px;
            font-size: 10px;
            color: #555;
          }

          .qty {
            font-weight: 600;
            margin-right: 4px;
          }

          .price {
            color: #666;
          }

          .item-total {
            text-align: right;
            font-weight: 700;
            font-size: 11px;
            padding: 2px 4px 4px 4px;
            vertical-align: bottom;
          }

          .totals-section {
            margin: 10px 0;
            padding: 8px 0;
            border-top: 1px dashed #999;
          }

          .totals-table {
            width: 100%;
            border-collapse: collapse;
          }

          .totals-table td {
            padding: 3px 4px;
            font-size: 11px;
          }

          .totals-label {
            color: #666;
            font-weight: 500;
          }

          .totals-value {
            text-align: right;
            font-weight: 600;
          }

          .discount-row {
            color: #e63946;
          }

          .total-amount {
            margin: 10px 0;
            padding: 10px;
            background: #000;
            color: white;
            text-align: center;
            border-radius: 4px;
          }

          .total-label {
            font-size: 11px;
            font-weight: 500;
            letter-spacing: 1px;
            margin-bottom: 2px;
          }

          .total-value {
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 0.5px;
          }

          .payments-section {
            margin: 10px 0;
            padding: 8px 0;
            border-top: 1px dashed #999;
          }

          .payments-header {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            color: #666;
            margin-bottom: 6px;
          }

          .payments-table {
            width: 100%;
            border-collapse: collapse;
          }

          .payments-table td {
            padding: 3px 4px;
            font-size: 11px;
          }

          .payment-method {
            font-weight: 600;
            color: #000;
          }

          .payment-amount {
            text-align: right;
            font-weight: 600;
            color: #22C55E;
          }

          .footer {
            margin-top: 12px;
            padding-top: 8px;
            border-top: 2px solid #000;
            text-align: center;
          }

          .footer-message {
            font-size: 11px;
            font-weight: 600;
            color: #000;
            margin-bottom: 6px;
            line-height: 1.4;
          }

          .footer-info {
            font-size: 9px;
            color: #666;
            margin-top: 8px;
          }

          .powered-by {
            font-size: 8px;
            color: #999;
            margin-top: 6px;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <div class="store-name">POS+ TEST</div>
          <div class="store-info">Test d'impression thermique</div>
          <div class="test-badge">TEST TICKET</div>
        </div>

        <!-- Ticket Info -->
        <div class="ticket-info">
          <div class="info-row">
            <span class="info-label">Date & Heure</span>
            <span class="info-value">${formattedDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Type d'imprimante</span>
            <span class="info-value">Thermique 80mm</span>
          </div>
          <div class="info-row">
            <span class="info-label">Plateforme</span>
            <span class="info-value">${process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux'}</span>
          </div>
        </div>

        <!-- Items -->
        <div class="items-section">
          <div class="items-header">Articles de test</div>
          <table class="items-table">
            <tr class="item-row even">
              <td class="item-name">Produit Test 1</td>
            </tr>
            <tr class="item-row even">
              <td class="item-details">
                <span class="qty">2 ×</span>
                <span class="price">5.500 DT</span>
              </td>
              <td class="item-total">11.000 DT</td>
            </tr>
            <tr class="item-row odd">
              <td class="item-name">Produit Test 2</td>
            </tr>
            <tr class="item-row odd">
              <td class="item-details">
                <span class="qty">1 ×</span>
                <span class="price">3.250 DT</span>
              </td>
              <td class="item-total">3.250 DT</td>
            </tr>
            <tr class="item-row even">
              <td class="item-name">Produit Test 3</td>
            </tr>
            <tr class="item-row even">
              <td class="item-details">
                <span class="qty">3 ×</span>
                <span class="price">2.000 DT</span>
              </td>
              <td class="item-total">6.000 DT</td>
            </tr>
          </table>
        </div>

        <!-- Totals -->
        <div class="totals-section">
          <table class="totals-table">
            <tr>
              <td class="totals-label">Sous-total</td>
              <td class="totals-value">20.250 DT</td>
            </tr>
            <tr class="discount-row">
              <td class="totals-label">Remise</td>
              <td class="totals-value">-2.000 DT</td>
            </tr>
          </table>
        </div>

        <!-- Total Amount -->
        <div class="total-amount">
          <div class="total-label">TOTAL À PAYER</div>
          <div class="total-value">18.250 DT</div>
        </div>

        <!-- Payments -->
        <div class="payments-section">
          <div class="payments-header">Paiements</div>
          <table class="payments-table">
            <tr>
              <td class="payment-method">ESPÈCES</td>
              <td class="payment-amount">20.000 DT</td>
            </tr>
          </table>
          <div class="info-row" style="margin-top: 6px;">
            <span class="info-label">Monnaie rendue</span>
            <span class="info-value">1.750 DT</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div class="footer-message">✅ Test d'impression réussi !<br>Imprimante opérationnelle</div>
          <div class="footer-info">Ce ticket est un test système</div>
          <div class="powered-by">Powered by POS+ • www.posplus.tn</div>
        </div>

        <br><br>
      </body>
      </html>
    `
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
