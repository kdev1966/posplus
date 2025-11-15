import React, { useEffect, useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { useSessionStore } from '../store/sessionStore'

export const Dashboard: React.FC = () => {
  const { currentSession } = useSessionStore()
  const [stats, setStats] = useState({
    todaySales: 0,
    todayTickets: 0,
    lowStockItems: 0,
    todayRevenue: 0,
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    // TODO: Fetch real stats from API
    setStats({
      todaySales: 45,
      todayTickets: 12,
      lowStockItems: 5,
      todayRevenue: 1247.80,
    })
  }

  return (
    <Layout>
      <div className="space-y-6 fade-in">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">Overview of your business</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-primary-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Today's Revenue</p>
                <p className="text-3xl font-bold text-primary-300">
                  €{stats.todayRevenue.toFixed(2)}
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
                <p className="text-sm text-gray-400 mb-1">Today's Tickets</p>
                <p className="text-3xl font-bold text-green-300">
                  {stats.todayTickets}
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
                <p className="text-sm text-gray-400 mb-1">Total Sales</p>
                <p className="text-3xl font-bold text-purple-300">
                  {stats.todaySales}
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
                <p className="text-sm text-gray-400 mb-1">Low Stock Items</p>
                <p className="text-3xl font-bold text-yellow-300">
                  {stats.lowStockItems}
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
            <h2 className="text-xl font-bold text-white mb-4">Current Session</h2>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-400 mb-1">Opening Cash</p>
                <p className="text-2xl font-bold text-white">
                  €{currentSession.openingCash.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Started At</p>
                <p className="text-2xl font-bold text-white">
                  {new Date(currentSession.startedAt).toLocaleTimeString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Status</p>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                  {currentSession.status.toUpperCase()}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card hover className="text-center">
            <div className="text-5xl mb-3">🛒</div>
            <h3 className="text-lg font-semibold text-white">New Sale</h3>
            <p className="text-sm text-gray-400">Process a new transaction</p>
          </Card>

          <Card hover className="text-center">
            <div className="text-5xl mb-3">📦</div>
            <h3 className="text-lg font-semibold text-white">Manage Products</h3>
            <p className="text-sm text-gray-400">Add or edit products</p>
          </Card>

          <Card hover className="text-center">
            <div className="text-5xl mb-3">📊</div>
            <h3 className="text-lg font-semibold text-white">View Reports</h3>
            <p className="text-sm text-gray-400">Check sales reports</p>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
