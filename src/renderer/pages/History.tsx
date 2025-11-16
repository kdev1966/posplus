import React, { useEffect, useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
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

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const data = await window.api.getAllTickets()
      setTickets(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    } catch (error) {
      console.error('Failed to load history:', error)
    }
    setLoading(false)
  }

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
      await window.api.printTicket(ticketId)
      alert('Ticket imprimé avec succès')
    } catch (error) {
      console.error('Failed to print ticket:', error)
      alert('Erreur lors de l\'impression')
    }
  }

  const handleViewTicket = async (ticketId: number) => {
    setLoadingTicket(true)
    try {
      const ticket = await window.api.getTicketById(ticketId)
      if (ticket) {
        setSelectedTicket(ticket)
        setIsModalOpen(true)
      } else {
        alert('Ticket non trouvé')
      }
    } catch (error) {
      console.error('Failed to load ticket details:', error)
      alert('Erreur lors du chargement du ticket')
    }
    setLoadingTicket(false)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedTicket(null)
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
                              : 'warning'
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
                            className="text-gray-400 hover:text-gray-300"
                            onClick={() => handlePrintTicket(ticket.id)}
                          >
                            {t('print')}
                          </button>
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
        title={selectedTicket ? `Ticket #${selectedTicket.ticketNumber}` : 'Détails du ticket'}
        footer={
          <button
            onClick={closeModal}
            className="btn btn-secondary"
          >
            {t('close')}
          </button>
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
                      <th className="text-right p-2 text-gray-400">{t('unitPrice')}</th>
                      <th className="text-right p-2 text-gray-400">{t('total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTicket.lines && selectedTicket.lines.map((line) => (
                      <tr key={line.id} className="border-t border-dark-600">
                        <td className="p-2 text-white">{line.productName}</td>
                        <td className="p-2 text-center text-gray-300">{line.quantity}</td>
                        <td className="p-2 text-right text-gray-300">{formatCurrency(line.unitPrice)}</td>
                        <td className="p-2 text-right text-white font-medium">{formatCurrency(line.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totaux */}
            <div className="bg-dark-700 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{t('subtotal')}</span>
                <span className="text-gray-300">{formatCurrency(selectedTicket.subtotal)}</span>
              </div>
              {selectedTicket.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{t('discount')}</span>
                  <span className="text-red-400">-{formatCurrency(selectedTicket.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-dark-600 pt-2">
                <span className="text-white">{t('total')}</span>
                <span className="text-primary-300">{formatCurrency(selectedTicket.totalAmount)}</span>
              </div>
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
    </Layout>
  )
}
