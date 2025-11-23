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

// Obtenir les logs de synchronisation P2P
ipcMain.handle(IPC_CHANNELS.P2P_GET_SYNC_LOGS, async (_event, options?: { limit?: number; offset?: number }) => {
  try {
    requireAuth()
    const db = require('../services/database/db').default.getInstance().getDatabase()

    const limit = options?.limit || 100
    const offset = options?.offset || 0

    const stmt = db.prepare(`
      SELECT * FROM p2p_sync_logs
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)

    return stmt.all(limit, offset)
  } catch (error: any) {
    log.error('P2P_GET_SYNC_LOGS handler error:', error)
    return []
  }
})

// Obtenir les conflits P2P
ipcMain.handle(IPC_CHANNELS.P2P_GET_CONFLICTS, async (_event, options?: { limit?: number; offset?: number }) => {
  try {
    requireAuth()
    const db = require('../services/database/db').default.getInstance().getDatabase()

    const limit = options?.limit || 50
    const offset = options?.offset || 0

    const stmt = db.prepare(`
      SELECT * FROM p2p_conflicts
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)

    return stmt.all(limit, offset)
  } catch (error: any) {
    log.error('P2P_GET_CONFLICTS handler error:', error)
    return []
  }
})

// Obtenir les métriques de connexion P2P
ipcMain.handle(IPC_CHANNELS.P2P_GET_CONNECTION_METRICS, async (_event, options?: { limit?: number; offset?: number }) => {
  try {
    requireAuth()
    const db = require('../services/database/db').default.getInstance().getDatabase()

    const limit = options?.limit || 100
    const offset = options?.offset || 0

    const stmt = db.prepare(`
      SELECT * FROM p2p_connection_metrics
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)

    return stmt.all(limit, offset)
  } catch (error: any) {
    log.error('P2P_GET_CONNECTION_METRICS handler error:', error)
    return []
  }
})

// Synchroniser manuellement tous les produits
ipcMain.handle(IPC_CHANNELS.P2P_SYNC_NOW, async () => {
  try {
    requireAuth()

    log.info('P2P: Manual sync requested from UI')

    // Récupérer tous les produits
    const ProductRepository = require('../services/database/repositories/ProductRepository').default
    const products = ProductRepository.findAll()

    log.info(`P2P: Syncing ${products.length} products manually (forced sync)`)

    // Envoyer une synchronisation forcée qui ignore les conflits
    P2PSyncService.manualSync(products)

    log.info(`P2P: Manual sync completed - ${products.length} products sent`)

    return {
      success: true,
      productsSynced: products.length,
    }
  } catch (error: any) {
    log.error('P2P_SYNC_NOW handler error:', error)
    return {
      success: false,
      error: error.message,
      productsSynced: 0,
    }
  }
})

log.info('P2P handlers registered')
