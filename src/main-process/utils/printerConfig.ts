import fs from 'fs'
import path from 'path'
import { app } from 'electron'

export interface PrinterConfig {
  printerName: string
  port: string
  type?: string
}

const defaultConfigPath = path.resolve(__dirname, '../../../../config/printer.json')

function userConfigPath(): string {
  try {
    return path.join(app.getPath('userData'), 'printer.json')
  } catch (err) {
    // Fallback to process cwd if app not available (tests/dev)
    return path.join(process.cwd(), 'config', 'printer.json')
  }
}

export async function getPrinterConfig(): Promise<PrinterConfig> {
  const userPath = userConfigPath()

  try {
    if (fs.existsSync(userPath)) {
      const raw = fs.readFileSync(userPath, 'utf-8')
      return JSON.parse(raw)
    }
  } catch (err) {
    // ignore and fallback
  }

  try {
    if (fs.existsSync(defaultConfigPath)) {
      const raw = fs.readFileSync(defaultConfigPath, 'utf-8')
      return JSON.parse(raw)
    }
  } catch (err) {
    // ignore
  }

  // Final fallback
  return {
    printerName: 'POS80 Printer',
    port: 'CP001',
    type: 'EPSON',
  }
}

export async function setPrinterConfig(cfg: PrinterConfig): Promise<void> {
  const userPath = userConfigPath()
  try {
    const dir = path.dirname(userPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(userPath, JSON.stringify(cfg, null, 2), 'utf-8')
  } catch (err) {
    throw err
  }
}
