import { IPCResponse } from '@shared/types/models';

/**
 * IPC Client for communicating with Main process
 * Provides type-safe API calls
 */

class IPCClient {
  /**
   * Invoke IPC call
   */
  async invoke<T>(channel: string, data?: unknown): Promise<T> {
    const response: IPCResponse<T> = await window.electron.invoke(channel, data);

    if (!response.success) {
      throw new Error(response.error?.message || 'Unknown error');
    }

    return response.data as T;
  }

  /**
   * Listen to IPC events
   */
  on(channel: string, callback: (...args: unknown[]) => void): void {
    window.electron.on(channel, callback);
  }

  /**
   * Remove IPC event listener
   */
  off(channel: string, callback: (...args: unknown[]) => void): void {
    window.electron.off(channel, callback);
  }
}

export const ipcClient = new IPCClient();
export default ipcClient;
