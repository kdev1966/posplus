import { IPCContract } from './base.contract';

export interface PrinterInfo {
  name: string;
  type: 'usb' | 'network' | 'serial';
  vendorId?: string;
  productId?: string;
  address?: string;
  port?: number;
}

export interface ReceiptData {
  saleId: string;
  saleNumber: string;
  date: string;
  cashier: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  amountPaid: number;
  change: number;
}

export const PrinterContracts = {
  GetPrinters: {
    channel: 'printer:getPrinters',
  } as IPCContract<void, PrinterInfo[]>,

  PrintReceipt: {
    channel: 'printer:printReceipt',
  } as IPCContract<ReceiptData, boolean>,

  PrintTest: {
    channel: 'printer:printTest',
  } as IPCContract<void, boolean>,

  OpenDrawer: {
    channel: 'printer:openDrawer',
  } as IPCContract<void, boolean>,
};
