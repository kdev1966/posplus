import { app, BrowserWindow, screen, ipcMain, Menu } from 'electron'
import path from 'path'
import url from 'url'
import log from 'electron-log'

log.transports.file.level = 'info'

let mainWindow: BrowserWindow | null = null
let customerWindow: BrowserWindow | null = null

const isDevelopment = process.env.NODE_ENV === 'development'

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const appPath = app.getAppPath()
  const indexPath = path.join(appPath, 'dist', 'renderer', 'index.html')

  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadURL(url.pathToFileURL(indexPath).toString())
  }

  // keep for debugging when needed
  if (isDevelopment || process.env.OPEN_DEVTOOLS === 'true') {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createCustomerWindow() {
  const appPath = app.getAppPath()
  const indexPath = path.join(appPath, 'dist', 'renderer', 'index.html')

  customerWindow = new BrowserWindow({
    width: 1024,
    height: 600,
    frame: false,
    transparent: true,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alwaysOnTop: false,
    kiosk: false,
    fullscreen: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Try to place on the second monitor if available
  try {
    const displays = screen.getAllDisplays()
    const externalDisplay = displays[1] || displays.find(d => d.bounds.x !== 0 || d.bounds.y !== 0)
    if (externalDisplay && customerWindow) {
      customerWindow.setBounds(externalDisplay.bounds)
    }
  } catch (err) {
    log.warn('Could not position customer window on external display', err)
  }

  // Load the same index but with a hash route so renderer shows customer UI
  const indexUrl = isDevelopment
    ? 'http://localhost:5173/#/customer'
    : `${url.pathToFileURL(indexPath).toString()}#/customer`

  customerWindow.loadURL(indexUrl).catch(err => log.error('Failed to load customer URL', err))

  customerWindow.on('closed', () => (customerWindow = null))
}

app.whenReady().then(() => {
  // Remove default menu for a clean kiosk-like experience
  try {
    Menu.setApplicationMenu(null)
  } catch (err) {
    log.warn('Failed to remove application menu', err)
  }

  createMainWindow()
  createCustomerWindow()

  // Handlers
  ipcMain.on('update-customer-display', (_event, cart) => {
    if (customerWindow && customerWindow.webContents) {
      customerWindow.webContents.send('cart-updated', cart)
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
