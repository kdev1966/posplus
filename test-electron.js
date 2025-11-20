// Minimal Electron test
console.log('Test script starting...');
const { app, BrowserWindow } = require('electron');
console.log('Electron loaded!', typeof app, typeof BrowserWindow);

app.whenReady().then(() => {
  console.log('App ready!');
  const win = new BrowserWindow({
    width: 800,
    height: 600,
  });
  win.loadURL('https://electronjs.org');
});
