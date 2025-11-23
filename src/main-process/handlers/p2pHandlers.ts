import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import P2PSyncService from '../services/p2p/SyncService'
import PeerDiscovery from '../services/p2p/PeerDiscovery'
import ConfigManager from '../services/p2p/ConfigManager'
import log from 'electron-log'
import { requireAuth } from './handlerUtils'

// Obtenir le statut P2P
ipcMain.handle(IPC_CHANNELS.P2P_GET_STATUS, async () => {
  try {
    requireAuth()

    const syncStatus = P2PSyncService.getStatus()
    const peers = PeerDiscovery.getPeers()
    const config = ConfigManager.getConfig()

    return {
      ...syncStatus,
      enabled: config?.p2p?.enabled || false,
      posId: config?.posId || 'unknown',
      posName: config?.posName || 'unknown',
      peers: peers.map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        online: p.online,
        lastSeen: p.lastSeen,
      })),
    }
  } catch (error: any) {
    log.error('P2P_GET_STATUS handler error:', error)
    return {
      error: error.message,
      serverRunning: false,
      connectedPeers: 0,
      totalPeers: 0,
      enabled: false,
      peers: [],
    }
  }
})

// Forcer reconnexion aux pairs
ipcMain.handle(IPC_CHANNELS.P2P_RECONNECT, async () => {
  try {
    requireAuth()

    log.info('P2P: Manual reconnection requested')
    await P2PSyncService.connectToPeers()

    return { success: true }
  } catch (error: any) {
    log.error('P2P_RECONNECT handler error:', error)
    return { success: false, error: error.message }
  }
})

// Activer/désactiver P2P
ipcMain.handle(IPC_CHANNELS.P2P_TOGGLE, async (_event, enabled: boolean) => {
  try {
    requireAuth()

    log.info(`P2P: ${enabled ? 'Enabling' : 'Disabling'} P2P`)
    ConfigManager.setP2PEnabled(enabled)

    if (enabled) {
      // Redémarrer les services P2P
      const config = ConfigManager.getConfig()
      if (config) {
        await P2PSyncService.startServer()
        await PeerDiscovery.advertise(config.posName)
        await PeerDiscovery.discover()
        setTimeout(async () => {
          await P2PSyncService.connectToPeers()
        }, 2000)
      }
    } else {
      // Arrêter les services P2P
      await P2PSyncService.stop()
      await PeerDiscovery.stop()
    }

    return { success: true }
  } catch (error: any) {
    log.error('P2P_TOGGLE handler error:', error)
    return { success: false, error: error.message }
  }
})

// Obtenir les statistiques détaillées P2P
ipcMain.handle(IPC_CHANNELS.P2P_GET_DETAILED_STATS, async () => {
  try {
    requireAuth()
    return P2PSyncService.getDetailedStats()
  } catch (error: any) {
    log.error('P2P_GET_DETAILED_STATS handler error:', error)
    return {
      connections: [],
      totalMessagesSent: 0,
      totalMessagesReceived: 0,
      totalBytesSent: 0,
      totalBytesReceived: 0,
    }
  }
})

log.info('P2P handlers registered')
