import React, { useState } from 'react'
import { usePrintPreviewStore } from '../../store/printPreviewStore'
import { Button } from '../ui/Button'
import { useLanguageStore } from '../../store/languageStore'

export const PrintPreviewModal: React.FC = () => {
  const { isOpen, previewHtml, onPrint, closePreview } = usePrintPreviewStore()
  const { currentLanguage } = useLanguageStore()
  const [isPrinting, setIsPrinting] = useState(false)

  if (!isOpen || !previewHtml) return null

  const handlePrint = async () => {
    if (!onPrint) return
    setIsPrinting(true)
    try {
      await onPrint()
      closePreview()
    } catch (error) {
      console.error('Print failed:', error)
      alert(currentLanguage === 'fr' ? '❌ Échec de l\'impression' : '❌ فشل الطباعة')
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">
            {currentLanguage === 'fr' ? 'Aperçu avant impression' : 'معاينة قبل الطباعة'}
          </h3>
          <button
            onClick={closePreview}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 flex justify-center">
          <div className="bg-white rounded shadow-lg" style={{ width: '72mm' }}>
            <iframe
              srcDoc={previewHtml}
              style={{ width: '72mm', height: '400px', border: 'none' }}
              title="Aperçu ticket"
            />
          </div>
        </div>
        <div className="flex gap-3 p-4 border-t border-gray-700">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={closePreview}
            disabled={isPrinting}
          >
            {currentLanguage === 'fr' ? 'Annuler' : 'إلغاء'}
          </Button>
          <Button
            variant="success"
            className="flex-1"
            onClick={handlePrint}
            disabled={isPrinting}
          >
            {isPrinting ? '⏳' : '🖨️'} {currentLanguage === 'fr' ? 'Imprimer' : 'طباعة'}
          </Button>
        </div>
      </div>
    </div>
  )
}
