import { app, BrowserWindow, screen, ipcMain } from 'electron'
import path from 'path'
import log from 'electron-log'
import { db } from './services/database/db'

// Configure logging
log.transports.file.level = 'info'
log.transports.console.level = 'debug'

let mainWindow: BrowserWindow | null = null
let customerWindow: BrowserWindow | null = null

// Check if running in development mode
// Development = NODE_ENV is explicitly 'development'
// Production = NODE_ENV is not 'development' (undefined, 'production', etc.) OR app is packaged
const isDevelopment = process.env.NODE_ENV === 'development'

log.info(`Running in ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'} mode`)
log.info(`app.isPackaged: ${app.isPackaged}`)
log.info(`NODE_ENV: ${process.env.NODE_ENV}`)

function createWindow() {
  log.info('Creating main window...')

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Disable sandbox to allow preload script to load modules
      // In production, disable webSecurity to allow loading local files
      webSecurity: isDevelopment,
    },
    titleBarStyle: 'default',
    show: false,
  })

  // Load the app
  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:5173')
    // DevTools can be opened manually with Cmd+Option+I (macOS) or Ctrl+Shift+I (Windows/Linux)
    // mainWindow.webContents.openDevTools()
  } else {
    // In production, files are in app.asar or resources/app
    // Structure: app/dist/main/main-process/main.js and app/dist/renderer/index.html
    const appPath = app.getAppPath()
    const indexPath = path.join(appPath, 'dist', 'renderer', 'index.html')

    log.info(`App path: ${appPath}`)
    log.info(`Index path: ${indexPath}`)
    log.info(`File exists: ${require('fs').existsSync(indexPath)}`)

    // Use loadFile which properly handles relative paths in HTML
    mainWindow.loadFile(indexPath).catch(err => {
      log.error('Failed to load index.html:', err)
      log.error('Tried path:', indexPath)
    })

    // Open DevTools in production to debug
    mainWindow.webContents.openDevTools()
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    log.info('Window ready to show')
    mainWindow?.show()
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Debug: Log when page finishes loading
  mainWindow.webContents.on('did-finish-load', () => {
    log.info('Page finished loading successfully')
  })

  // Debug: Log navigation errors
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    log.error(`Failed to load: ${errorCode} - ${errorDescription}`)
  })

  // Debug: Console messages from renderer
  mainWindow.webContents.on('console-message', (_event, level, message) => {
    log.info(`Renderer console [${level}]: ${message}`)
  })

  // Debug: Check if window is actually showing content
  mainWindow.webContents.on('dom-ready', () => {
    log.info('DOM is ready')

    // Log the URL that was loaded
    const url = mainWindow?.webContents.getURL()
    log.info(`Current URL: ${url}`)

    // Execute JavaScript to check if React root exists
    mainWindow?.webContents.executeJavaScript(`
      (function() {
        const root = document.getElementById('root');
        const hasContent = root && root.innerHTML.length > 0;
        return {
          rootExists: !!root,
          hasContent: hasContent,
          innerHTML: root ? root.innerHTML.substring(0, 200) : 'NO ROOT',
          scripts: Array.from(document.scripts).map(s => s.src),
          stylesheets: Array.from(document.styleSheets).map(s => s.href)
        };
      })();
    `).then(result => {
      log.info('DOM inspection result:', JSON.stringify(result, null, 2))
    }).catch(err => {
      log.error('Failed to inspect DOM:', err)
    })
  })

  log.info('Main window created')
}

function createCustomerWindow() {
  log.info('Creating customer display window...')

  // Try to get external display dimensions first
  const displays = screen.getAllDisplays()
  log.info(`Available displays: ${displays.length}`)

  let targetDisplay = displays[0] // Default to primary display
  if (displays.length > 1) {
    // Find external display (not primary)
    targetDisplay = displays.find(display => !display.internal) || displays[1]
    log.info(`Using external display: ${targetDisplay.bounds.width}x${targetDisplay.bounds.height}`)
  } else {
    log.info('Only one display detected, using primary display')
  }

  customerWindow = new BrowserWindow({
    x: targetDisplay.bounds.x,
    y: targetDisplay.bounds.y,
    width: targetDisplay.bounds.width,
    height: targetDisplay.bounds.height,
    frame: false,
    fullscreen: true,
    kiosk: false, // Not kiosk mode, just fullscreen
    backgroundColor: '#0f172a',
    alwaysOnTop: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: isDevelopment,
    },
    show: false,
  })

  // Load the customer display route
  if (isDevelopment) {
    customerWindow.loadURL('http://localhost:5173/#/customer')
  } else {
    const appPath = app.getAppPath()
    const indexPath = path.join(appPath, 'dist', 'renderer', 'index.html')

    customerWindow.loadFile(indexPath, { hash: '/customer' }).catch(err => {
      log.error('Failed to load customer display:', err)
    })
  }

  customerWindow.once('ready-to-show', () => {
    log.info('Customer window ready to show')
    customerWindow?.show()
  })

  customerWindow.on('closed', () => {
    log.info('Customer window closed')
    customerWindow = null
  })

  log.info('Customer window created')
}

// App initialization
app.whenReady().then(() => {
  log.info('App is ready')

  // Initialize database
  try {
    db.initialize()
    log.info('Database initialized successfully')
  } catch (error) {
    log.error('Failed to initialize database:', error)
    app.quit()
    return
  }

  // Import handlers after app is ready
  require('./handlers/authHandlers')
  require('./handlers/userHandlers')
  require('./handlers/productHandlers')
  require('./handlers/categoryHandlers')
  require('./handlers/ticketHandlers')
  require('./handlers/sessionHandlers')
  require('./handlers/printerHandlers')
  require('./handlers/stockHandlers')
  require('./handlers/syncHandlers')
  require('./handlers/maintenanceHandlers')
  require('./handlers/backupHandlers')
  require('./handlers/excelHandlers')
  require('./handlers/appHandlers')
  log.info('IPC handlers registered')

  // Setup IPC for customer display
  ipcMain.on('update-customer-display', (_event, cart) => {
    log.info('Received cart update for customer display')
    if (customerWindow && !customerWindow.isDestroyed()) {
      customerWindow.webContents.send('customer-cart-updated', cart)
    }
  })

  // Setup IPC for payment completion
  ipcMain.on('customer-payment-complete', (_event, paymentData) => {
    log.info('Received payment completion for customer display:', paymentData)
    if (customerWindow && !customerWindow.isDestroyed()) {
      customerWindow.webContents.send('customer-payment-complete', paymentData)
    }
  })

  // Setup IPC for language change
  ipcMain.on('customer-language-change', (_event, language) => {
    log.info('Received language change for customer display:', language)
    if (customerWindow && !customerWindow.isDestroyed()) {
      customerWindow.webContents.send('customer-language-changed', language)
    }
  })

  createWindow()
  createCustomerWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      createCustomerWindow()
    }
  })
})

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Before quit - cleanup
app.on('before-quit', () => {
  log.info('App is quitting...')
  db.close()
})

// Handle errors
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error)
})

process.on('unhandledRejection', (error) => {
  log.error('Unhandled rejection:', error)
})

export { mainWindow }
