import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

type CartItem = {
  nom: string
  quantite: number
  prix: number
  total: number
}

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel: string, data?: any) => {
      // whitelist channels
      const validChannels = ['update-customer-display', 'from-renderer']
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data)
      }
    },
    on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => {
      const validChannels = ['cart-updated', 'from-main']
      if (validChannels.includes(channel)) {
        const wrapped = (_event: IpcRendererEvent, ...args: any[]) => listener(_event, ...args)
        ipcRenderer.on(channel, wrapped)
        return () => ipcRenderer.removeListener(channel, wrapped)
      }
      return () => {}
    },
    removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
  },
})

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
