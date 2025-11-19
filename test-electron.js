// Simple Electron test to verify basic functionality
const { app, BrowserWindow } = require('electron');
const path = require('path');

console.log('[TEST] Starting Electron test...');
console.log('[TEST] Node version:', process.version);
console.log('[TEST] Electron version:', process.versions.electron);
console.log('[TEST] Chrome version:', process.versions.chrome);

let mainWindow;

function createWindow() {
  console.log('[TEST] Creating window...');

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Disable for testing
    }
  });

  const testHtmlPath = path.join(__dirname, 'test-simple.html');
  console.log('[TEST] Loading test HTML from:', testHtmlPath);

  mainWindow.loadFile(testHtmlPath);
  mainWindow.webContents.openDevTools();

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[TEST] ✅ Page loaded successfully!');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[TEST] ❌ Failed to load:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  console.log('[TEST] App is ready');
  createWindow();
});

app.on('window-all-closed', () => {
  console.log('[TEST] All windows closed');
  app.quit();
});

console.log('[TEST] Waiting for app ready event...');
