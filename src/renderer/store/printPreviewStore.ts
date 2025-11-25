import { create } from 'zustand'

interface PrintPreviewState {
  isOpen: boolean
  previewHtml: string | null
  ticketId: number | null
  onPrint: (() => Promise<void>) | null
  openPreview: (html: string, ticketId: number, onPrint: () => Promise<void>) => void
  closePreview: () => void
}

export const usePrintPreviewStore = create<PrintPreviewState>((set) => ({
  isOpen: false,
  previewHtml: null,
  ticketId: null,
  onPrint: null,
  openPreview: (html, ticketId, onPrint) =>
    set({ isOpen: true, previewHtml: html, ticketId, onPrint }),
  closePreview: () =>
    set({ isOpen: false, previewHtml: null, ticketId: null, onPrint: null }),
}))
