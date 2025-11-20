import React, { useEffect, useState } from 'react'

interface P2PStatusData {
  serverRunning: boolean
  connectedPeers: number
  totalPeers: number
  enabled: boolean
  posId: string
  posName: string
  peers: Array<{
    id: string
    name: string
    address: string
    online: boolean
    lastSeen: Date
  }>
}

const P2PStatus: React.FC = () => {
  const [status, setStatus] = useState<P2PStatusData>({
    serverRunning: false,
    connectedPeers: 0,
    totalPeers: 0,
    enabled: false,
    posId: '',
    posName: '',
    peers: [],
  })

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await window.api.getP2PStatus()
        if (data && !data.error) {
          setStatus(data)
        }
      } catch (error) {
        console.error('Failed to fetch P2P status:', error)
      }
    }

    // Récupérer le statut toutes les 5 secondes
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)

    return () => clearInterval(interval)
  }, [])

  if (!status.enabled) {
    return null // Ne rien afficher si P2P est désactivé
  }

  const getStatusColor = () => {
    if (!status.serverRunning) return 'bg-red-500'
    if (status.connectedPeers === 0) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStatusText = () => {
    if (!status.serverRunning) return 'P2P Offline'
    if (status.connectedPeers === 0) return 'Aucun pair connecté'
    return `${status.connectedPeers} pair(s) connecté(s)`
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`} />
      <div className="flex flex-col">
        <span className="text-xs text-gray-400">Synchronisation</span>
        <span className="text-sm text-gray-300 font-medium">{getStatusText()}</span>
      </div>
    </div>
  )
}

export default P2PStatus
