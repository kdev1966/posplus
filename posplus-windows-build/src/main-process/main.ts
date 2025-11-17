import { app, BrowserWindow } from 'electron'
import path from 'path'
import log from 'electron-log'
import { db } from './services/database/db'

// Configure logging
log.transports.file.level = 'info'
log.transports.console.level = 'debug'

let mainWindow: BrowserWindow | null = null

const isDevelopment = process.env.NODE_ENV === 'development'

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
      sandbox: true,
      webSecurity: true,
    },
    titleBarStyle: 'default',
    show: false,
  })

  // Load the app
  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'))
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

  log.info('Main window created')
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
  log.info('IPC handlers registered')

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
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
