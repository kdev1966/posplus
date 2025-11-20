import { ipcMain, app, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import log from 'electron-log'

ipcMain.handle(IPC_CHANNELS.APP_QUIT, async () => {
  try {
    log.info('Quit application requested')

    // Close all windows first
    const windows = BrowserWindow.getAllWindows()
    log.info(`Closing ${windows.length} window(s)`)
    windows.forEach(window => {
      if (!window.isDestroyed()) {
        window.close()
      }
    })

    // Force quit the application
    app.quit()
  } catch (error) {
    log.error('APP_QUIT handler error:', error)
    throw error
  }
})
