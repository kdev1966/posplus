import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import AuthService from '../services/auth/AuthService'
import log from 'electron-log'

// Login
ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN, async (_event, credentials) => {
  try {
    return await AuthService.login(credentials)
  } catch (error) {
    log.error('AUTH_LOGIN handler error:', error)
    return { success: false, error: 'Login failed' }
  }
})

// Logout
ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, async () => {
  try {
    await AuthService.logout()
  } catch (error) {
    log.error('AUTH_LOGOUT handler error:', error)
  }
})

// Check auth
ipcMain.handle(IPC_CHANNELS.AUTH_CHECK, async () => {
  try {
    return await AuthService.checkAuth()
  } catch (error) {
    log.error('AUTH_CHECK handler error:', error)
    return { success: false, error: 'Not authenticated' }
  }
})

// Change password
ipcMain.handle(IPC_CHANNELS.AUTH_CHANGE_PASSWORD, async (_event, oldPassword, newPassword) => {
  try {
    const user = AuthService.getCurrentUser()
    if (!user) {
      return false
    }
    return await AuthService.changePassword(user.id, oldPassword, newPassword)
  } catch (error) {
    log.error('AUTH_CHANGE_PASSWORD handler error:', error)
    return false
  }
})
