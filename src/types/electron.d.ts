import { IpcRendererEvent } from 'electron'

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        send: (channel: string, data?: any) => void
        on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => () => void
        removeAllListeners: (channel: string) => void
      }
    }
  }
}

export {}
