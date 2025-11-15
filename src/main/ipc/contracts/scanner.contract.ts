import { IPCContract } from './base.contract';

export interface ScannerDevice {
  path: string;
  vendorId: number;
  productId: number;
  manufacturer?: string;
  product?: string;
}

export const ScannerContracts = {
  GetDevices: {
    channel: 'scanner:getDevices',
  } as IPCContract<void, ScannerDevice[]>,

  StartListening: {
    channel: 'scanner:startListening',
  } as IPCContract<void, boolean>,

  StopListening: {
    channel: 'scanner:stopListening',
  } as IPCContract<void, boolean>,

  // Event: scanner:barcode-scanned
  // This is emitted from Main to Renderer when a barcode is scanned
};
