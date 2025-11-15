import { contextBridge, ipcRenderer } from 'electron';
import { IPCResponse } from '../main/ipc/contracts';

/**
 * Preload script - Exposes safe IPC API to renderer process
 * Uses contextBridge for secure communication
 */

// Define the API interface
export interface ElectronAPI {
  invoke: <T>(channel: string, data?: unknown) => Promise<IPCResponse<T>>;
  on: (channel: string, callback: (...args: unknown[]) => void) => void;
  off: (channel: string, callback: (...args: unknown[]) => void) => void;
}

// Create the API
const electronAPI: ElectronAPI = {
  /**
   * Invoke IPC call to main process
   */
  invoke: <T>(channel: string, data?: unknown): Promise<IPCResponse<T>> => {
    return ipcRenderer.invoke(channel, data);
  },

  /**
   * Listen to events from main process
   */
  on: (channel: string, callback: (...args: unknown[]) => void): void => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },

  /**
   * Remove event listener
   */
  off: (channel: string, callback: (...args: unknown[]) => void): void => {
    ipcRenderer.removeListener(channel, callback);
  },
};

// Expose the API to renderer process
contextBridge.exposeInMainWorld('electron', electronAPI);

// Type declaration for window object (to be used in renderer)
declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
