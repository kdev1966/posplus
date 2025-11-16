import React, { useEffect, useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Ticket } from '@shared/types'
import { useLanguageStore } from '../store/languageStore'
import { formatCurrency } from '../utils/currency'

export const History: React.FC = () => {
  const { t } = useLanguageStore()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

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
                          <button className="text-primary-400 hover:text-primary-300">{t('view')}</button>
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
    </Layout>
  )
}
