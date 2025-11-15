import React, { useEffect, useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Ticket } from '@shared/types'

export const History: React.FC = () => {
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

  return (
    <Layout>
      <div className="space-y-6 fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Sales History</h1>
            <p className="text-gray-400">View all past transactions</p>
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
                    <th>Ticket ID</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td className="font-mono text-sm">#{ticket.ticketNumber}</td>
                      <td className="text-sm">{formatDate(ticket.createdAt)}</td>
                      <td>{ticket.items?.length || 0} items</td>
                      <td className="font-semibold text-primary-300">€{ticket.total.toFixed(2)}</td>
                      <td className="capitalize">{ticket.paymentMethod || 'N/A'}</td>
                      <td>
                        <Badge variant={ticket.status === 'completed' ? 'success' : ticket.status === 'cancelled' ? 'danger' : 'warning'}>
                          {ticket.status}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button className="text-primary-400 hover:text-primary-300">View</button>
                          <button className="text-gray-400 hover:text-gray-300">Print</button>
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
              <h3 className="text-xl font-semibold text-white mb-2">No transactions yet</h3>
              <p className="text-gray-400">Sales history will appear here</p>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  )
}
