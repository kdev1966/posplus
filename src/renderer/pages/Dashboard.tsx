import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { useSessionStore } from '../store/sessionStore'
import { useLanguageStore } from '../store/languageStore'
import { formatCurrency } from '../utils/currency'

export const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { currentSession } = useSessionStore()
  const { t } = useLanguageStore()
  const [stats, setStats] = useState({
    todaySales: 0,
    todayTickets: 0,
    lowStockItems: 0,
    todayRevenue: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      // Fetch real stats from API
      const [tickets, products] = await Promise.all([
        window.api.getAllTickets(),
        window.api.getAllProducts(),
      ])

      // Calculate today's stats
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const todayTickets = tickets.filter((ticket) => {
        const ticketDate = new Date(ticket.createdAt)
        ticketDate.setHours(0, 0, 0, 0)
        return ticketDate.getTime() === today.getTime() && ticket.status === 'completed'
      })

      const todayRevenue = todayTickets.reduce((sum, ticket) => sum + ticket.totalAmount, 0)
      const lowStockItems = products.filter((p) => p.stock <= p.minStock && p.isActive).length

      setStats({
        todaySales: todayTickets.length,
        todayTickets: todayTickets.length,
        lowStockItems,
        todayRevenue,
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
      setStats({
        todaySales: 0,
        todayTickets: 0,
        lowStockItems: 0,
        todayRevenue: 0,
      })
    }
    setLoading(false)
  }

  return (
    <Layout>
      <div className="space-y-6 fade-in">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('dashboardTitle')}</h1>
          <p className="text-gray-400">{t('dashboardSubtitle')}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-primary-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">{t('todayRevenue')}</p>
                <p className="text-3xl font-bold text-primary-300">
                  {loading ? '...' : formatCurrency(stats.todayRevenue)}
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center text-3xl">
                💰
              </div>
            </div>
          </Card>

          <Card className="border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">{t('todayTickets')}</p>
                <p className="text-3xl font-bold text-green-300">
                  {loading ? '...' : stats.todayTickets}
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-3xl">
                🧾
              </div>
            </div>
          </Card>

          <Card className="border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">{t('totalSales')}</p>
                <p className="text-3xl font-bold text-purple-300">
                  {loading ? '...' : stats.todaySales}
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center text-3xl">
                📊
              </div>
            </div>
          </Card>

          <Card className="border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">{t('lowStockItems')}</p>
                <p className="text-3xl font-bold text-yellow-300">
                  {loading ? '...' : stats.lowStockItems}
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center text-3xl">
                ⚠️
              </div>
            </div>
          </Card>
        </div>

        {/* Session Info */}
        {currentSession && (
          <Card>
            <h2 className="text-xl font-bold text-white mb-4">{t('currentSession')}</h2>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-400 mb-1">{t('openingCash')}</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(currentSession.openingCash)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">{t('startedAt')}</p>
                <p className="text-2xl font-bold text-white">
                  {new Date(currentSession.startedAt).toLocaleTimeString('fr-FR')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">{t('status')}</p>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                  {currentSession.status === 'open' ? t('open') : currentSession.status === 'closed' ? t('closed') : currentSession.status}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card
            hover
            className="text-center cursor-pointer"
            onClick={() => navigate('/pos')}
          >
            <div className="text-5xl mb-3">🛒</div>
            <h3 className="text-lg font-semibold text-white">{t('newSale')}</h3>
            <p className="text-sm text-gray-400">{t('processNewTransaction')}</p>
          </Card>

          <Card
            hover
            className="text-center cursor-pointer"
            onClick={() => navigate('/products')}
          >
            <div className="text-5xl mb-3">📦</div>
            <h3 className="text-lg font-semibold text-white">{t('manageProducts')}</h3>
            <p className="text-sm text-gray-400">{t('addEditProducts')}</p>
          </Card>

          <Card
            hover
            className="text-center cursor-pointer"
            onClick={() => navigate('/history')}
          >
            <div className="text-5xl mb-3">📊</div>
            <h3 className="text-lg font-semibold text-white">{t('viewReports')}</h3>
            <p className="text-sm text-gray-400">{t('checkSalesReports')}</p>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
