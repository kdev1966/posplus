// API initialization - provides window.api for both Electron and web environments
import { createMockApi } from './mockApi'
import type { IPCApi } from '@shared/types'

// Check if we're running in Electron or web browser
const isElectron = !!(window as any).electron

// Initialize window.api if it doesn't exist (web development mode)
if (!isElectron && !(window as any).api) {
  console.log('[API] Running in web mode - using mock API')
  ;(window as any).api = createMockApi()
} else if (isElectron) {
  console.log('[API] Running in Electron mode - using real IPC API')
}

// Export type-safe api accessor
export const api: IPCApi = (window as any).api
