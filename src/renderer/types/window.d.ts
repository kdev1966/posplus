export {}

declare global {
  interface Window {
    electron?: {
      isElectron: boolean
      ipcRenderer?: {
        on: (channel: string, func: (...args: any[]) => void) => () => void
        send: (channel: string, ...args: any[]) => void
      }
    }
  }
}
