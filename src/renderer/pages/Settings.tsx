import React, { useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useSessionStore } from '../store/sessionStore'
import { useAuthStore } from '../store/authStore'

export const Settings: React.FC = () => {
  const { user } = useAuthStore()
  const { currentSession, isSessionOpen, openSession, closeSession } = useSessionStore()

  const [openingCash, setOpeningCash] = useState('100.00')
  const [closingCash, setClosingCash] = useState('0.00')

  const handleOpenSession = async () => {
    if (!user) return

    const amount = parseFloat(openingCash)
    if (isNaN(amount) || amount < 0) {
      alert('Invalid amount')
      return
    }

    const success = await openSession(user.id, amount)
    if (success) {
      alert('Session opened successfully')
    }
  }

  const handleCloseSession = async () => {
    if (!currentSession) return

    const amount = parseFloat(closingCash)
    if (isNaN(amount) || amount < 0) {
      alert('Invalid amount')
      return
    }

    const success = await closeSession(currentSession.id, amount)
    if (success) {
      alert('Session closed successfully')
    }
  }

  return (
    <Layout>
      <div className="space-y-6 fade-in">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage system settings and cash sessions</p>
        </div>

        {/* Cash Session Management */}
        <Card>
          <h2 className="text-xl font-bold text-white mb-4">Cash Session</h2>

          {!isSessionOpen ? (
            <div className="space-y-4">
              <p className="text-gray-400">No active session. Open a new session to start selling.</p>

              <Input
                label="Opening Cash Amount"
                type="number"
                step="0.01"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                placeholder="0.00"
              />

              <Button variant="success" onClick={handleOpenSession}>
                Open Session
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="glass rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-2">Current Session</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Opening Cash</p>
                    <p className="text-lg font-bold text-white">
                      €{currentSession?.openingCash.toFixed(2) ?? '0.00'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Started At</p>
                    <p className="text-lg font-bold text-white">
                      {currentSession ? new Date(currentSession.startedAt).toLocaleTimeString() : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-300">
                      OPEN
                    </span>
                  </div>
                </div>
              </div>

              <Input
                label="Closing Cash Amount"
                type="number"
                step="0.01"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                placeholder="0.00"
              />

              <Button variant="danger" onClick={handleCloseSession}>
                Close Session
              </Button>
            </div>
          )}
        </Card>

        {/* System Information */}
        <Card>
          <h2 className="text-xl font-bold text-white mb-4">System Information</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Application</span>
              <span className="text-white font-semibold">POSPlus v1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">User</span>
              <span className="text-white font-semibold">{user?.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Role</span>
              <span className="text-white font-semibold">{user?.roleId === 1 ? 'Administrator' : user?.roleId === 2 ? 'Manager' : 'Cashier'}</span>
            </div>
          </div>
        </Card>

        {/* Printer Settings */}
        <Card>
          <h2 className="text-xl font-bold text-white mb-4">Printer Settings</h2>
          <div className="space-y-4">
            <Button variant="primary" onClick={async () => {
              try {
                await window.api.openDrawer()
                alert('Cash drawer opened')
              } catch (error) {
                alert('Failed to open cash drawer')
              }
            }}>
              🔓 Open Cash Drawer
            </Button>

            <Button variant="ghost" onClick={async () => {
              try {
                const status = await window.api.getPrinterStatus()
                alert(`Printer ${status.connected ? 'connected' : 'not connected'}`)
              } catch (error) {
                alert('Failed to get printer status')
              }
            }}>
              🖨️ Check Printer Status
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  )
}
