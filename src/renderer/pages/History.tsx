import React, { useEffect, useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Ticket } from '@shared/types'
import { useLanguageStore } from '../store/languageStore'
import { formatCurrency } from '../utils/currency'

export const History: React.FC = () => {
  const { t } = useLanguageStore()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loadingTicket, setLoadingTicket] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedLines, setEditedLines] = useState<{ [key: number]: { quantity: number; discountRate: number } }>({})
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [isPartialRefundModalOpen, setIsPartialRefundModalOpen] = useState(false)
  const [ticketToRefund, setTicketToRefund] = useState<Ticket | null>(null)
  const [ticketToCancel, setTicketToCancel] = useState<Ticket | null>(null)
  const [ticketToPartialRefund, setTicketToPartialRefund] = useState<Ticket | null>(null)
  const [refundReason, setRefundReason] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [partialRefundReason, setPartialRefundReason] = useState('')
  const [selectedLines, setSelectedLines] = useState<{ [lineId: number]: number }>({}) // lineId -> quantity to refund

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const filters: { startDate?: string; endDate?: string } = {}
      if (startDate) filters.startDate = startDate
      if (endDate) filters.endDate = endDate

      const data = await window.api.getAllTickets(filters)
      setTickets(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    } catch (error) {
      console.error('Failed to load history:', error)
    }
    setLoading(false)
  }

  const handleFilter = () => {
    loadHistory()
  }

  const handleClearFilter = () => {
    setStartDate('')
    setEndDate('')
    setTimeout(() => loadHistory(), 0)
  }

  const filteredTickets = tickets
  const totalSales = filteredTickets.reduce((sum, ticket) => {
    if (ticket.status === 'completed' || ticket.status === 'partially_refunded') {
      return sum + ticket.totalAmount
    }
    return sum
  }, 0)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusTranslation = (status: string) => {
    switch (status) {
      case 'completed':
        return t('completed')
      case 'cancelled':
        return t('cancelled')
      case 'refunded':
        return t('refunded')
      case 'partially_refunded':
        return t('partiallyRefunded')
      case 'pending':
        return t('pending')
      default:
        return status
    }
  }

  const getPaymentMethodTranslation = (method: string) => {
    switch (method) {
      case 'cash':
        return t('cash')
      case 'card':
        return t('card')
      case 'mixed':
        return t('mixed')
      default:
        return method
    }
  }

  const handlePrintTicket = async (ticketId: number) => {
    try {
      const result = await window.api.printTicket(ticketId)
      // Ne pas afficher d'alert en cas de succès pour ne pas alourdir l'expérience utilisateur
      // Afficher uniquement en cas d'échec
      if (!result) {
        alert(t('ticketPrintError') + '\n\n' + t('checkPrinterConnection'))
      }
    } catch (error: any) {
      console.error('Failed to print ticket:', error)
      const errorMsg = error?.message || error?.toString() || t('ticketPrintError')
      alert(t('ticketPrintError') + '\n\n' + errorMsg + '\n\n' + t('checkPrinterSettings'))
    }
  }

  const handleViewTicket = async (ticketId: number) => {
    setLoadingTicket(true)
    setIsEditMode(false)
    try {
      const ticket = await window.api.getTicketById(ticketId)
      if (ticket) {
        setSelectedTicket(ticket)
        setIsModalOpen(true)
      } else {
        alert(t('ticketNotFound'))
      }
    } catch (error) {
      console.error('Failed to load ticket details:', error)
      alert(t('ticketLoadError'))
    }
    setLoadingTicket(false)
  }

  const handleEditTicket = async (ticketId: number) => {
    setLoadingTicket(true)
    setIsEditMode(true)
    try {
      const ticket = await window.api.getTicketById(ticketId)
      if (ticket) {
        setSelectedTicket(ticket)
        setIsModalOpen(true)
      } else {
        alert(t('ticketNotFound'))
      }
    } catch (error) {
      console.error('Failed to load ticket details:', error)
      alert(t('ticketLoadError'))
    }
    setLoadingTicket(false)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedTicket(null)
    setIsEditMode(false)
    setEditedLines({})
  }

  const handleLineEdit = (lineId: number, field: 'quantity' | 'discountRate', value: number) => {
    setEditedLines(prev => ({
      ...prev,
      [lineId]: {
        ...prev[lineId],
        [field]: value
      }
    }))
  }

  const handleSaveTicket = async () => {
    if (!selectedTicket) return

    try {
      // Calculate new totals based on edited lines
      const updatedLines = selectedTicket.lines.map(line => {
        const edited = editedLines[line.id]
        if (edited) {
          const quantity = edited.quantity ?? line.quantity
          const discountRate = edited.discountRate ?? line.discountRate
          const subtotal = line.unitPrice * quantity
          const discountAmount = subtotal * (discountRate / 100)
          const totalAmount = subtotal - discountAmount

          return {
            ...line,
            quantity,
            discountRate,
            discountAmount,
            totalAmount
          }
        }
        return line
      })

      const subtotal = updatedLines.reduce((sum, line) => sum + (line.unitPrice * line.quantity), 0)
      const totalDiscountAmount = updatedLines.reduce((sum, line) => sum + line.discountAmount, 0)
      const totalAmount = subtotal - totalDiscountAmount

      // Update ticket in database (we'll need to add this API method)
      await window.api.updateTicket(selectedTicket.id, {
        lines: updatedLines,
        subtotal,
        discountAmount: totalDiscountAmount,
        totalAmount
      })

      alert(t('ticketUpdateSuccess'))
      closeModal()
      loadHistory()
    } catch (error) {
      console.error('Failed to update ticket:', error)
      alert(t('ticketUpdateError'))
    }
  }

  const handleRefundTicket = (ticket: Ticket) => {
    if (ticket.status !== 'completed') {
      alert(t('cannotRefundTicket'))
      return
    }
    setTicketToRefund(ticket)
    setIsRefundModalOpen(true)
  }

  const confirmRefund = async () => {
    if (!ticketToRefund || !refundReason.trim()) {
      alert(t('pleaseEnterReason'))
      return
    }

    try {
      const success = await window.api.refundTicket(ticketToRefund.id, refundReason)
      if (success) {
        alert(t('ticketRefundSuccess'))
        setIsRefundModalOpen(false)
        setTicketToRefund(null)
        setRefundReason('')
        loadHistory()
      }
    } catch (error: any) {
      console.error('Failed to refund ticket:', error)
      alert(error?.message || t('errorOccurred'))
    }
  }

  const handleCancelTicket = (ticket: Ticket) => {
    if (ticket.status !== 'completed') {
      alert(t('cannotCancelTicket'))
      return
    }
    setTicketToCancel(ticket)
    setIsCancelModalOpen(true)
  }

  const confirmCancel = async () => {
    if (!ticketToCancel || !cancelReason.trim()) {
      alert(t('pleaseEnterReason'))
      return
    }

    try {
      const success = await window.api.cancelTicket(ticketToCancel.id, cancelReason)
      if (success) {
        alert(t('ticketCancelSuccess'))
        setIsCancelModalOpen(false)
        setTicketToCancel(null)
        setCancelReason('')
        loadHistory()
      }
    } catch (error: any) {
      console.error('Failed to cancel ticket:', error)
      alert(error?.message || t('errorOccurred'))
    }
  }

  const handlePartialRefund = (ticket: Ticket) => {
    if (ticket.status !== 'completed' && ticket.status !== 'partially_refunded') {
      alert(t('cannotRefundTicket'))
      return
    }
    setTicketToPartialRefund(ticket)
    setSelectedLines({})
    setPartialRefundReason('')
    setIsPartialRefundModalOpen(true)
  }

  const toggleLineSelection = (lineId: number, maxQuantity: number) => {
    setSelectedLines((prev) => {
      const newSelection = { ...prev }
      if (newSelection[lineId]) {
        delete newSelection[lineId]
      } else {
        newSelection[lineId] = maxQuantity
      }
      return newSelection
    })
  }

  const updateLineQuantity = (lineId: number, quantity: number) => {
    setSelectedLines((prev) => ({
      ...prev,
      [lineId]: quantity,
    }))
  }

  const calculateRefundAmount = () => {
    if (!ticketToPartialRefund) return 0
    let total = 0
    for (const [lineIdStr, quantity] of Object.entries(selectedLines)) {
      const lineId = parseInt(lineIdStr)
      const line = ticketToPartialRefund.lines.find((l) => l.id === lineId)
      if (line) {
        const unitPrice = line.totalAmount / line.quantity
        total += unitPrice * quantity
      }
    }
    return total
  }

  const confirmPartialRefund = async () => {
    if (!ticketToPartialRefund || !partialRefundReason.trim()) {
      alert(t('pleaseEnterReason'))
      return
    }

    if (Object.keys(selectedLines).length === 0) {
      alert(t('pleaseSelectProducts'))
      return
    }

    try {
      const lines = Object.entries(selectedLines).map(([lineIdStr, quantity]) => ({
        lineId: parseInt(lineIdStr),
        quantity,
      }))

      const success = await window.api.partialRefundTicket(
        ticketToPartialRefund.id,
        lines,
        partialRefundReason
      )

      if (success) {
        alert(t('ticketPartialRefundSuccess'))
        setIsPartialRefundModalOpen(false)
        setTicketToPartialRefund(null)
        setPartialRefundReason('')
        setSelectedLines({})
        loadHistory()
      }
    } catch (error: any) {
      console.error('Failed to partially refund ticket:', error)
      alert(error?.message || t('errorOccurred'))
    }
  }

  return (
    <Layout>
      <div className="space-y-6 fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('historyTitle')}</h1>
            <p className="text-gray-400">{t('viewPastTransactions')}</p>
          </div>
        </div>

        {/* Date filters and sales total */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('startDate')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('endDate')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleFilter}
                className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                {t('filter')}
              </button>
              <button
                onClick={handleClearFilter}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {t('clear')}
              </button>
            </div>
            <div className="flex items-end">
              <div className="w-full bg-gradient-to-r from-primary-500/20 to-primary-600/20 border border-primary-500/30 rounded-lg p-3">
                <p className="text-sm text-gray-400 mb-1">{t('totalSales')}</p>
                <p className="text-2xl font-bold text-primary-300">{formatCurrency(totalSales)}</p>
              </div>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" />
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('ticketId')}</th>
                    <th>{t('date')}</th>
                    <th>{t('items')}</th>
                    <th>{t('total')}</th>
                    <th>{t('paymentMethod')}</th>
                    <th>{t('status')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td className="font-mono text-sm">#{ticket.ticketNumber}</td>
                      <td className="text-sm">{formatDate(ticket.createdAt)}</td>
                      <td>{ticket.lines?.length || 0} {t('items')}</td>
                      <td className="font-semibold text-primary-300">{formatCurrency(ticket.totalAmount)}</td>
                      <td className="capitalize">
                        {ticket.payments && ticket.payments.length > 0
                          ? getPaymentMethodTranslation(ticket.payments[0].method)
                          : 'N/A'}
                      </td>
                      <td>
                        <Badge
                          variant={
                            ticket.status === 'completed'
                              ? 'success'
                              : ticket.status === 'cancelled'
                              ? 'danger'
                              : ticket.status === 'refunded'
                              ? 'warning'
                              : ticket.status === 'partially_refunded'
                              ? 'warning'
                              : 'info'
                          }
                        >
                          {getStatusTranslation(ticket.status)}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className="text-primary-400 hover:text-primary-300"
                            onClick={() => handleViewTicket(ticket.id)}
                            disabled={loadingTicket}
                          >
                            {t('view')}
                          </button>
                          <button
                            className="text-blue-400 hover:text-blue-300"
                            onClick={() => handleEditTicket(ticket.id)}
                            disabled={loadingTicket || ticket.status !== 'completed'}
                          >
                            {t('edit')}
                          </button>
                          <button
                            className="text-gray-400 hover:text-gray-300"
                            onClick={() => handlePrintTicket(ticket.id)}
                          >
                            {t('print')}
                          </button>
                          {(ticket.status === 'completed' || ticket.status === 'partially_refunded') && (
                            <>
                              <button
                                className="text-yellow-400 hover:text-yellow-300"
                                onClick={() => handlePartialRefund(ticket)}
                              >
                                {t('partialRefund')}
                              </button>
                              <button
                                className="text-orange-400 hover:text-orange-300"
                                onClick={() => handleRefundTicket(ticket)}
                              >
                                {t('refund')}
                              </button>
                              <button
                                className="text-red-400 hover:text-red-300"
                                onClick={() => handleCancelTicket(ticket)}
                              >
                                {t('cancelTicket')}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {!loading && tickets.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📜</div>
              <h3 className="text-xl font-semibold text-white mb-2">{t('noTransactionsYet')}</h3>
              <p className="text-gray-400">{t('salesHistoryWillAppear')}</p>
            </div>
          </Card>
        )}
      </div>

      {/* Modal de visualisation du ticket */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={selectedTicket ? `${t('ticketId')} #${selectedTicket.ticketNumber}${isEditMode ? ' - ' + t('ticketEdit') : ''}` : t('ticketDetails')}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              {t('cancel')}
            </Button>
            {isEditMode && (
              <Button variant="primary" onClick={handleSaveTicket}>
                {t('save')}
              </Button>
            )}
          </>
        }
      >
        {selectedTicket && (
          <div className="space-y-4">
            {/* Informations générales */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">{t('date')}</p>
                <p className="text-white font-medium">{formatDate(selectedTicket.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">{t('status')}</p>
                <Badge
                  variant={
                    selectedTicket.status === 'completed'
                      ? 'success'
                      : selectedTicket.status === 'cancelled'
                      ? 'danger'
                      : 'warning'
                  }
                >
                  {getStatusTranslation(selectedTicket.status)}
                </Badge>
              </div>
            </div>

            {/* Articles */}
            <div>
              <h3 className="text-white font-semibold mb-2">{t('items')}</h3>
              <div className="bg-dark-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-dark-600">
                    <tr>
                      <th className="text-left p-2 text-gray-400">{t('product')}</th>
                      <th className="text-center p-2 text-gray-400">{t('quantity')}</th>
                      {isEditMode && <th className="text-center p-2 text-gray-400">{t('discount')} %</th>}
                      <th className="text-right p-2 text-gray-400">{t('unitPrice')}</th>
                      <th className="text-right p-2 text-gray-400">{t('total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTicket.lines && selectedTicket.lines.map((line) => {
                      const edited = editedLines[line.id]
                      const quantity = edited?.quantity ?? line.quantity
                      const discountRate = edited?.discountRate ?? line.discountRate
                      const subtotal = line.unitPrice * quantity
                      const discountAmount = subtotal * (discountRate / 100)
                      const totalAmount = subtotal - discountAmount

                      return (
                        <tr key={line.id} className="border-t border-dark-600">
                          <td className="p-2 text-white">{line.productName}</td>
                          <td className="p-2 text-center">
                            {isEditMode ? (
                              <Input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => handleLineEdit(line.id, 'quantity', parseFloat(e.target.value) || 1)}
                                className="w-20 text-center"
                              />
                            ) : (
                              <span className="text-gray-300">{line.quantity}</span>
                            )}
                          </td>
                          {isEditMode && (
                            <td className="p-2 text-center">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={discountRate}
                                onChange={(e) => handleLineEdit(line.id, 'discountRate', parseFloat(e.target.value) || 0)}
                                className="w-20 text-center"
                              />
                            </td>
                          )}
                          <td className="p-2 text-right text-gray-300">{formatCurrency(line.unitPrice)}</td>
                          <td className="p-2 text-right text-white font-medium">{formatCurrency(totalAmount)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totaux */}
            <div className="bg-dark-700 rounded-lg p-3 space-y-2">
              {(() => {
                const calculatedLines = selectedTicket.lines.map(line => {
                  const edited = editedLines[line.id]
                  const quantity = edited?.quantity ?? line.quantity
                  const discountRate = edited?.discountRate ?? line.discountRate
                  const subtotal = line.unitPrice * quantity
                  const discountAmount = subtotal * (discountRate / 100)
                  const totalAmount = subtotal - discountAmount
                  return { subtotal, discountAmount, totalAmount }
                })

                const calculatedSubtotal = calculatedLines.reduce((sum, l) => sum + l.subtotal, 0)
                const calculatedDiscountAmount = calculatedLines.reduce((sum, l) => sum + l.discountAmount, 0)
                const calculatedTotal = calculatedLines.reduce((sum, l) => sum + l.totalAmount, 0)

                return (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">{t('subtotal')}</span>
                      <span className="text-gray-300">{formatCurrency(calculatedSubtotal)}</span>
                    </div>
                    {calculatedDiscountAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{t('discount')}</span>
                        <span className="text-red-400">-{formatCurrency(calculatedDiscountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t border-dark-600 pt-2">
                      <span className="text-white">{t('total')}</span>
                      <span className="text-primary-300">{formatCurrency(calculatedTotal)}</span>
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Paiements */}
            {selectedTicket.payments && selectedTicket.payments.length > 0 && (
              <div>
                <h3 className="text-white font-semibold mb-2">{t('paymentMethod')}</h3>
                <div className="bg-dark-700 rounded-lg p-3 space-y-2">
                  {selectedTicket.payments.map((payment) => (
                    <div key={payment.id} className="flex justify-between text-sm">
                      <span className="text-gray-400 capitalize">
                        {getPaymentMethodTranslation(payment.method)}
                      </span>
                      <span className="text-gray-300">{formatCurrency(payment.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal de remboursement */}
      <Modal
        isOpen={isRefundModalOpen}
        onClose={() => {
          setIsRefundModalOpen(false)
          setTicketToRefund(null)
          setRefundReason('')
        }}
        title={t('refundTicket')}
        footer={
          <>
            <Button variant="secondary" onClick={() => {
              setIsRefundModalOpen(false)
              setTicketToRefund(null)
              setRefundReason('')
            }}>
              {t('cancel')}
            </Button>
            <Button variant="danger" onClick={confirmRefund}>
              {t('confirm')}
            </Button>
          </>
        }
      >
        {ticketToRefund && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="text-5xl mb-4">⚠️</div>
              <p className="text-white font-semibold mb-2">
                {t('confirmRefund')}
              </p>
              <p className="text-gray-400 text-sm mb-2">
                {t('ticketId')} #{ticketToRefund.ticketNumber}
              </p>
              <p className="text-primary-300 text-xl font-bold">
                {formatCurrency(ticketToRefund.totalAmount)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('refundReason')} *
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                rows={3}
                placeholder="Ex: Produit défectueux"
                required
              />
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-yellow-300 text-sm">
                ⚠️ {t('stockWillBeRestored')}<br />
                💰 {t('rememberToAdjustCash')}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal d'annulation */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false)
          setTicketToCancel(null)
          setCancelReason('')
        }}
        title={t('cancelTicket')}
        footer={
          <>
            <Button variant="secondary" onClick={() => {
              setIsCancelModalOpen(false)
              setTicketToCancel(null)
              setCancelReason('')
            }}>
              {t('cancel')}
            </Button>
            <Button variant="danger" onClick={confirmCancel}>
              {t('confirm')}
            </Button>
          </>
        }
      >
        {ticketToCancel && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="text-5xl mb-4">🚫</div>
              <p className="text-white font-semibold mb-2">
                {t('confirmCancelTicket')}
              </p>
              <p className="text-gray-400 text-sm mb-2">
                {t('ticketId')} #{ticketToCancel.ticketNumber}
              </p>
              <p className="text-primary-300 text-xl font-bold">
                {formatCurrency(ticketToCancel.totalAmount)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('cancelReason')} *
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                rows={3}
                placeholder="Ex: Erreur de saisie"
                required
              />
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-yellow-300 text-sm">
                ⚠️ {t('stockWillBeRestored')}<br />
                💰 {t('rememberToAdjustCash')}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de remboursement partiel */}
      <Modal
        isOpen={isPartialRefundModalOpen}
        onClose={() => {
          setIsPartialRefundModalOpen(false)
          setTicketToPartialRefund(null)
          setPartialRefundReason('')
          setSelectedLines({})
        }}
        title={t('partialRefund')}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setIsPartialRefundModalOpen(false)
                setTicketToPartialRefund(null)
                setPartialRefundReason('')
                setSelectedLines({})
              }}
            >
              {t('cancel')}
            </Button>
            <Button variant="primary" onClick={confirmPartialRefund}>
              {t('confirm')}
            </Button>
          </>
        }
      >
        {ticketToPartialRefund && (
          <div className="space-y-4">
            <div className="text-center py-3">
              <p className="text-white font-semibold mb-2">
                {t('ticketId')} #{ticketToPartialRefund.ticketNumber}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                {t('selectProductsToRefund')}
              </label>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {ticketToPartialRefund.lines.map((line) => (
                  <div
                    key={line.id}
                    className="border border-gray-700 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={!!selectedLines[line.id]}
                        onChange={() => toggleLineSelection(line.id, line.quantity)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-white font-medium">{line.productName}</p>
                        <p className="text-sm text-gray-400">
                          {line.quantity} x {formatCurrency(line.unitPrice)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-primary-300 font-semibold">
                          {formatCurrency(line.totalAmount)}
                        </p>
                      </div>
                    </div>

                    {selectedLines[line.id] !== undefined && (
                      <div className="flex items-center gap-2 pl-7">
                        <label className="text-sm text-gray-400 whitespace-nowrap">
                          {t('refundQuantity')}:
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={line.quantity}
                          value={selectedLines[line.id]}
                          onChange={(e) =>
                            updateLineQuantity(line.id, parseInt(e.target.value) || 1)
                          }
                          className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-center"
                        />
                        <span className="text-sm text-gray-400">
                          / {line.quantity} ({t('maxQuantity')})
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {Object.keys(selectedLines).length > 0 && (
              <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">{t('totalRefundAmount')}:</span>
                  <span className="text-primary-300 text-xl font-bold">
                    {formatCurrency(calculateRefundAmount())}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('refundReason')} *
              </label>
              <textarea
                value={partialRefundReason}
                onChange={(e) => setPartialRefundReason(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                rows={3}
                placeholder="Ex: Produit endommagé"
                required
              />
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-yellow-300 text-sm">
                ⚠️ {t('stockWillBeRestored')}
                <br />
                💰 {t('rememberToAdjustCash')}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  )
}
