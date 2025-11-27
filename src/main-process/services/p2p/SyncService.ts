import WebSocket, { WebSocketServer } from 'ws'
import log from 'electron-log'
import PeerDiscovery from './PeerDiscovery'
import { v4 as uuidv4 } from 'uuid'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { app, BrowserWindow } from 'electron'
import DatabaseService from '../database/db'

export interface SyncMessage {
  id: string // ID unique du message
  type:
    | 'hello' // Nouveau: identification du peer
    | 'hello-ack' // Nouveau: confirmation de l'identification
    | 'ping' // Nouveau: heartbeat
    | 'pong' // Nouveau: heartbeat response
    | 'ticket'
    | 'product'
    | 'stock'
    | 'customer'
    | 'user'
    | 'payment'
    | 'full-sync-request'
    | 'full-sync-response'
    | 'manual-sync' // Synchronisation manuelle forcée
    | 'incremental-sync-request' // Request for incremental sync
    | 'incremental-sync-response' // Response with only changed items
  action: 'create' | 'update' | 'delete' | 'sync' | 'identify' | 'heartbeat' | 'force-update'
  data: any
  timestamp: string
  sourcePos: string
}

interface PeerConnection {
  ws: WebSocket
  peerId: string
  peerName: string
  lastPing: Date
  lastPong: Date
  reconnectAttempts: number
  reconnectTimer: NodeJS.Timeout | null
  messagesSent: number
  messagesReceived: number
  bytesSent: number
  bytesReceived: number
}

interface ConflictResolution {
  entityType: string
  entityId: number
  localData: any
  remoteData: any
  localUpdatedAt: Date | null
  remoteUpdatedAt: Date | null
  strategy: 'local_wins' | 'remote_wins' | 'last_write_wins'
  winner: 'local' | 'remote'
}

class P2PSyncService {
  private server: WebSocketServer | null = null
  private connections: Map<string, PeerConnection> = new Map()
  private processedMessages: Set<string> = new Set() // Éviter doublons
  private syncRequested: Set<string> = new Set() // Éviter demandes multiples
  private manualSyncInProgress: Set<string> = new Set() // Éviter boucles infinies de sync manuel
  private lastSyncTimestamps: Map<string, string> = new Map() // Track last sync time per peer
  private port = 3030
  private heartbeatInterval: NodeJS.Timeout | null = null
  private readonly HEARTBEAT_INTERVAL = 30000 // 30 secondes
  private readonly HEARTBEAT_TIMEOUT = 10000 // 10 secondes
  private readonly RECONNECT_BASE_DELAY = 5000 // 5 secondes
  private readonly RECONNECT_MAX_DELAY = 60000 // 60 secondes
  private readonly RECONNECT_MAX_ATTEMPTS = 10
  private readonly INCREMENTAL_SYNC_BATCH_SIZE = 100 // Max items per incremental sync batch

  // Notifier l'UI qu'une synchronisation a eu lieu
  private notifyDataSynced(type: 'product' | 'category' | 'all'): void {
    try {
      const windows = BrowserWindow.getAllWindows()
      windows.forEach(window => {
        window.webContents.send('p2p-data-synced', { type })
      })
      log.debug(`P2P: Notified UI about ${type} sync`)
    } catch (error) {
      log.error('P2P: Failed to notify UI:', error)
    }
  }

  // Démarrer le serveur WebSocket
  async startServer(): Promise<void> {
    try {
      this.server = new WebSocketServer({ port: this.port })

      this.server.on('connection', (ws: WebSocket, req) => {
        const clientIp = req.socket.remoteAddress
        log.info(`P2P: New incoming connection from ${clientIp}`)

        // Gérer les messages entrants
        ws.on('message', (data: Buffer) => {
          this.handleIncomingMessage(data.toString(), ws)
        })

        // Gérer la déconnexion
        ws.on('close', () => {
          log.info(`P2P: Connection closed from ${clientIp}`)
          // Retirer de la liste des connexions
          for (const [peerId, conn] of this.connections.entries()) {
            if (conn.ws === ws) {
              this.handleDisconnection(peerId)
              break
            }
          }
        })

        // Gérer les erreurs
        ws.on('error', (error) => {
          log.error(`P2P: WebSocket error from ${clientIp}:`, error)
        })

        // Note: On attend de recevoir le message HELLO pour identifier le peer
        // et l'ajouter aux connexions
      })

      // Démarrer le heartbeat
      this.startHeartbeat()

      log.info(`P2P: Server started on port ${this.port}`)
    } catch (error) {
      log.error('P2P: Failed to start server:', error)
      throw error
    }
  }

  // Connecter aux pairs découverts
  async connectToPeers(): Promise<void> {
    const peers = PeerDiscovery.getOnlinePeers()

    for (const peer of peers) {
      if (!this.connections.has(peer.id)) {
        this.connectToPeer(peer.id, peer.address, peer.port, peer.name)
      }
    }
  }

  // Connecter à un pair spécifique
  private connectToPeer(
    peerId: string,
    address: string,
    port: number,
    name: string,
    isReconnect = false
  ): void {
    try {
      // Format address for WebSocket (handle IPv6 with brackets)
      let addr = address
      if (addr.includes(':') && !addr.startsWith('[')) {
        addr = `[${addr}]`
      }

      const action = isReconnect ? 'Reconnecting to' : 'Connecting to'
      log.info(`P2P: ${action} ${name} (${peerId}) at ${addr}:${port}`)

      const ws = new WebSocket(`ws://${addr}:${port}`)

      ws.on('open', () => {
        log.info(`P2P: ✅ Connected to peer ${name}`)

        // Créer la connexion
        const connection: PeerConnection = {
          ws,
          peerId,
          peerName: name,
          lastPing: new Date(),
          lastPong: new Date(),
          reconnectAttempts: 0,
          reconnectTimer: null,
          messagesSent: 0,
          messagesReceived: 0,
          bytesSent: 0,
          bytesReceived: 0,
        }

        this.connections.set(peerId, connection)

        // Log connection event
        this.logConnectionMetric(peerId, name, 'connected')

        // Envoyer message HELLO pour s'identifier
        this.sendHello(peerId)

        // Attendre HELLO_ACK avant de demander la synchronisation
      })

      ws.on('message', (data: Buffer) => {
        this.handleIncomingMessage(data.toString(), ws)
      })

      ws.on('close', () => {
        log.info(`P2P: Disconnected from peer ${name}`)
        this.handleDisconnection(peerId)
      })

      ws.on('error', (error) => {
        log.error(`P2P: Connection error with ${name}:`, error)
      })
    } catch (error) {
      log.error(`P2P: Failed to connect to peer ${name}:`, error)
    }
  }

  // Envoyer message HELLO pour s'identifier
  private sendHello(peerId: string): void {
    const message: SyncMessage = {
      id: uuidv4(),
      type: 'hello',
      action: 'identify',
      data: {
        posId: this.getPosId(),
        posName: this.getPosName(),
      },
      timestamp: new Date().toISOString(),
      sourcePos: this.getPosId(),
    }

    this.sendToPeer(peerId, message)
    log.info(`P2P: Sent HELLO to ${peerId}`)
  }

  // Envoyer message HELLO_ACK
  private sendHelloAck(peerId: string): void {
    const message: SyncMessage = {
      id: uuidv4(),
      type: 'hello-ack',
      action: 'identify',
      data: {
        posId: this.getPosId(),
        posName: this.getPosName(),
      },
      timestamp: new Date().toISOString(),
      sourcePos: this.getPosId(),
    }

    this.sendToPeer(peerId, message)
    log.info(`P2P: Sent HELLO_ACK to ${peerId}`)
  }

  // Démarrer le heartbeat
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.heartbeatInterval = setInterval(() => {
      for (const [peerId, conn] of this.connections.entries()) {
        // Vérifier si on a reçu un PONG récemment
        const timeSinceLastPong = Date.now() - conn.lastPong.getTime()

        if (timeSinceLastPong > this.HEARTBEAT_INTERVAL + this.HEARTBEAT_TIMEOUT) {
          // Pas de PONG depuis trop longtemps - connexion morte
          log.warn(`P2P: No PONG from ${conn.peerName} for ${timeSinceLastPong}ms - closing connection`)
          conn.ws.close()
          this.handleDisconnection(peerId)
          continue
        }

        // Envoyer PING
        const ping: SyncMessage = {
          id: uuidv4(),
          type: 'ping',
          action: 'heartbeat',
          data: {},
          timestamp: new Date().toISOString(),
          sourcePos: this.getPosId(),
        }

        conn.lastPing = new Date()
        this.sendToPeer(peerId, ping)
      }
    }, this.HEARTBEAT_INTERVAL)
  }

  // Gérer la déconnexion et tenter reconnexion
  private handleDisconnection(peerId: string): void {
    const conn = this.connections.get(peerId)
    if (!conn) return

    log.info(`P2P: Handling disconnection from ${conn.peerName}`)

    // Logger la déconnexion avec statistiques
    this.logConnectionMetric(peerId, conn.peerName, 'disconnected', {
      messagesSent: conn.messagesSent,
      messagesReceived: conn.messagesReceived,
      bytesSent: conn.bytesSent,
      bytesReceived: conn.bytesReceived,
    })

    // Fermer la connexion si pas déjà fait
    if (conn.ws.readyState !== WebSocket.CLOSED) {
      conn.ws.close()
    }

    // Supprimer de la liste
    this.connections.delete(peerId)

    // Supprimer de la liste de sync requested
    this.syncRequested.delete(peerId)

    // Tenter reconnexion automatique
    this.scheduleReconnect(peerId, conn)
  }

  // Planifier une reconnexion avec backoff exponentiel
  private scheduleReconnect(peerId: string, conn: PeerConnection): void {
    // Vérifier si le peer est toujours découvert par Bonjour
    const peer = PeerDiscovery.getPeers().find((p) => p.id === peerId)
    if (!peer || !peer.online) {
      log.info(`P2P: Peer ${conn.peerName} is offline - not scheduling reconnect`)
      return
    }

    if (conn.reconnectAttempts >= this.RECONNECT_MAX_ATTEMPTS) {
      log.warn(`P2P: Max reconnect attempts reached for ${conn.peerName}`)
      return
    }

    conn.reconnectAttempts++

    // Backoff exponentiel: 5s, 10s, 20s, 40s, max 60s
    const delay = Math.min(
      this.RECONNECT_BASE_DELAY * Math.pow(2, conn.reconnectAttempts - 1),
      this.RECONNECT_MAX_DELAY
    )

    log.info(
      `P2P: Scheduling reconnect to ${conn.peerName} (attempt ${conn.reconnectAttempts}/${this.RECONNECT_MAX_ATTEMPTS}) in ${delay}ms`
    )

    conn.reconnectTimer = setTimeout(() => {
      this.connectToPeer(peerId, peer.address, peer.port, peer.name, true)
    }, delay)
  }

  // Envoyer un message à un peer spécifique
  private sendToPeer(peerId: string, message: SyncMessage): void {
    const conn = this.connections.get(peerId)
    if (conn && conn.ws.readyState === WebSocket.OPEN) {
      try {
        const messageStr = JSON.stringify(message)
        conn.ws.send(messageStr)

        // Tracker les statistiques
        this.trackMessageStats(peerId, 'sent', messageStr.length)
      } catch (error) {
        log.error(`P2P: Failed to send to ${peerId}:`, error)
      }
    }
  }

  // Envoyer un message de synchronisation
  private broadcast(message: SyncMessage): void {
    const messageStr = JSON.stringify(message)

    // Enregistrer comme traité pour éviter boucles
    this.processedMessages.add(message.id)

    // Nettoyer ancien historique (garder seulement 1000 derniers)
    if (this.processedMessages.size > 1000) {
      const toDelete = Array.from(this.processedMessages).slice(0, 100)
      toDelete.forEach((id) => this.processedMessages.delete(id))
    }

    // Envoyer à tous les pairs connectés
    let sentCount = 0
    for (const [peerId, conn] of this.connections.entries()) {
      if (conn.ws.readyState === WebSocket.OPEN) {
        try {
          conn.ws.send(messageStr)
          sentCount++
        } catch (error) {
          log.error(`P2P: Failed to send to ${peerId}:`, error)
        }
      }
    }

    if (sentCount > 0) {
      log.info(`P2P: Broadcast ${message.type}/${message.action} to ${sentCount} peer(s)`)
    }
  }

  // Gérer les messages entrants
  private handleIncomingMessage(messageStr: string, ws: WebSocket): void {
    try {
      const message: SyncMessage = JSON.parse(messageStr)

      // Tracker les statistiques de réception
      const peerId = message.sourcePos
      if (peerId) {
        this.trackMessageStats(peerId, 'received', messageStr.length)
      }

      // Gérer les messages de contrôle en premier
      switch (message.type) {
        case 'hello':
          this.handleHello(message, ws)
          return

        case 'hello-ack':
          this.handleHelloAck(message)
          return

        case 'ping':
          this.handlePing(message)
          return

        case 'pong':
          this.handlePong(message)
          return
      }

      // Ignorer si déjà traité (éviter boucles)
      if (this.processedMessages.has(message.id)) {
        return
      }

      // Ignorer si vient de nous-mêmes
      if (message.sourcePos === this.getPosId()) {
        return
      }

      log.info(`P2P: Received ${message.type}/${message.action} from ${message.sourcePos}`)

      // Marquer comme traité
      this.processedMessages.add(message.id)

      // Gérer les messages spéciaux de synchronisation
      if (message.type === 'full-sync-request') {
        this.handleFullSyncRequest(message)
        return
      }

      if (message.type === 'full-sync-response') {
        this.handleFullSyncResponse(message)
        return
      }

      // Gérer la synchronisation incrémentale
      if (message.type === 'incremental-sync-request') {
        this.handleIncrementalSyncRequest(message)
        return
      }

      if (message.type === 'incremental-sync-response') {
        this.handleIncrementalSyncResponse(message)
        return
      }

      // Gérer la synchronisation manuelle forcée
      if (message.type === 'manual-sync') {
        this.handleManualSync(message)
        return
      }

      // Appliquer les changements localement
      this.applySync(message)
    } catch (error) {
      log.error('P2P: Failed to handle incoming message:', error)
    }
  }

  // Gérer le message HELLO
  private handleHello(message: SyncMessage, ws: WebSocket): void {
    const { posId, posName } = message.data

    log.info(`P2P: Received HELLO from ${posName} (${posId})`)

    // Si ce n'est pas déjà dans les connexions, ajouter
    if (!this.connections.has(posId)) {
      const connection: PeerConnection = {
        ws,
        peerId: posId,
        peerName: posName,
        lastPing: new Date(),
        lastPong: new Date(),
        reconnectAttempts: 0,
        reconnectTimer: null,
        messagesSent: 0,
        messagesReceived: 0,
        bytesSent: 0,
        bytesReceived: 0,
      }

      this.connections.set(posId, connection)
      log.info(`P2P: Added incoming connection from ${posName}`)
    }

    // Envoyer HELLO_ACK
    this.sendHelloAck(posId)
  }

  // Gérer le message HELLO_ACK
  private handleHelloAck(message: SyncMessage): void {
    const { posId, posName } = message.data

    log.info(`P2P: Received HELLO_ACK from ${posName} (${posId})`)

    // Connexion établie - déclencher synchronisation bidirectionnelle automatique
    log.info(`P2P: Connection established with ${posName}, triggering automatic bidirectional sync`)

    // Attendre 2 secondes pour que la connexion soit stable
    setTimeout(() => {
      this.triggerAutomaticSync()
    }, 2000)
  }

  // Gérer le message PING
  private handlePing(message: SyncMessage): void {
    const peerId = message.sourcePos

    // Envoyer PONG
    const pong: SyncMessage = {
      id: uuidv4(),
      type: 'pong',
      action: 'heartbeat',
      data: {},
      timestamp: new Date().toISOString(),
      sourcePos: this.getPosId(),
    }

    this.sendToPeer(peerId, pong)
  }

  // Gérer le message PONG
  private handlePong(message: SyncMessage): void {
    const peerId = message.sourcePos
    const conn = this.connections.get(peerId)

    if (conn) {
      conn.lastPong = new Date()
      // Réinitialiser les tentatives de reconnexion sur succès
      conn.reconnectAttempts = 0
    }
  }

  // Appliquer les changements dans la BD locale
  private applySync(message: SyncMessage): void {
    const { type, action, data } = message

    try {
      switch (type) {
        case 'ticket':
          if (action === 'create') {
            const TicketRepository = require('../database/repositories/TicketRepository').default
            TicketRepository.createFromSync(data)
            log.info(`P2P: Synced new ticket ${data.ticketNumber}`)
          }
          break

        case 'product':
          const ProductRepository = require('../database/repositories/ProductRepository').default
          if (action === 'update') {
            // Vérifier s'il y a un conflit
            const localProduct = ProductRepository.findById(data.id)
            if (localProduct) {
              const conflict = this.resolveConflict(
                'product',
                data.id,
                localProduct,
                data,
                message.sourcePos,
                this.connections.get(message.sourcePos)?.peerName || 'Unknown'
              )

              if (conflict.winner === 'remote') {
                ProductRepository.updateFromSync(data)
                log.info(`P2P: Synced product update ${data.name} (conflict: remote wins)`)
                this.logSyncEvent(
                  message.sourcePos,
                  this.connections.get(message.sourcePos)?.peerName || 'Unknown',
                  'product',
                  'update',
                  'product',
                  data.id,
                  'conflict',
                  { resolutionStrategy: conflict.strategy }
                )
                this.notifyDataSynced('product')
              } else {
                log.info(`P2P: Skipped product update ${data.name} (conflict: local wins)`)
                this.logSyncEvent(
                  message.sourcePos,
                  this.connections.get(message.sourcePos)?.peerName || 'Unknown',
                  'product',
                  'update',
                  'product',
                  data.id,
                  'skipped',
                  { conflictReason: 'Local data is newer' }
                )
              }
            } else {
              // Pas de conflit, créer le produit
              ProductRepository.createFromSync(data)
              log.info(`P2P: Created product from update ${data.name}`)
              this.logSyncEvent(
                message.sourcePos,
                this.connections.get(message.sourcePos)?.peerName || 'Unknown',
                'product',
                'update',
                'product',
                data.id,
                'success'
              )
              this.notifyDataSynced('product')
            }
          } else if (action === 'create') {
            ProductRepository.createFromSync(data)
            log.info(`P2P: Synced new product ${data.name}`)
            this.logSyncEvent(
              message.sourcePos,
              this.connections.get(message.sourcePos)?.peerName || 'Unknown',
              'product',
              'create',
              'product',
              data.id,
              'success'
            )
            this.notifyDataSynced('product')
          }
          break

        case 'stock':
          if (action === 'update') {
            const ProductRepo = require('../database/repositories/ProductRepository').default
            ProductRepo.updateStockFromSync(data.productId, data.quantity)
            log.info(`P2P: Synced stock update for product ${data.productId}`)
          }
          break

        case 'customer':
          const CustomerRepository = require('../database/repositories/CustomerRepository').default
          if (action === 'create') {
            CustomerRepository.createFromSync(data)
            log.info(`P2P: Synced new customer ${data.name}`)
          } else if (action === 'update') {
            CustomerRepository.update(data)
            log.info(`P2P: Synced customer update ${data.name}`)
          }
          break

        default:
          log.warn(`P2P: Unknown sync type ${type}`)
      }
    } catch (error) {
      log.error(`P2P: Failed to apply sync for ${type}/${action}:`, error)
    }
  }

  // API publique: Synchroniser un ticket
  public syncTicket(ticket: any): void {
    const message: SyncMessage = {
      id: uuidv4(),
      type: 'ticket',
      action: 'create',
      data: ticket,
      timestamp: new Date().toISOString(),
      sourcePos: this.getPosId(),
    }

    this.broadcast(message)
  }

  // API publique: Synchroniser un produit
  public syncProduct(product: any, action: 'create' | 'update' | 'delete'): void {
    const message: SyncMessage = {
      id: uuidv4(),
      type: 'product',
      action,
      data: product,
      timestamp: new Date().toISOString(),
      sourcePos: this.getPosId(),
    }

    this.broadcast(message)
  }

  // Déclencher une synchronisation automatique incrémentale (lors de la connexion initiale)
  private triggerAutomaticSync(): void {
    try {
      log.info('P2P: Triggering automatic incremental sync')

      // Request incremental sync from all connected peers
      for (const [peerId] of this.connections.entries()) {
        this.requestIncrementalSync(peerId)
      }
    } catch (error) {
      log.error('P2P: Failed to trigger automatic sync:', error)
    }
  }

  /**
   * Request incremental sync from a peer - only changes since last sync
   */
  private requestIncrementalSync(peerId: string): void {
    const lastSync = this.lastSyncTimestamps.get(peerId) || '1970-01-01T00:00:00.000Z'

    log.info(`P2P: Requesting incremental sync from ${peerId} since ${lastSync}`)

    const message: SyncMessage = {
      id: uuidv4(),
      type: 'incremental-sync-request',
      action: 'sync',
      data: {
        since: lastSync,
        requestedBy: this.getPosId(),
      },
      timestamp: new Date().toISOString(),
      sourcePos: this.getPosId(),
    }

    this.sendToPeer(peerId, message)
  }

  /**
   * Handle incremental sync request - send only items changed since timestamp
   */
  private handleIncrementalSyncRequest(message: SyncMessage): void {
    const { since, requestedBy } = message.data

    log.info(`P2P: Handling incremental sync request from ${requestedBy} since ${since}`)

    try {
      const db = DatabaseService.getInstance().getDatabase()

      // Get products updated since timestamp with LIMIT for performance
      const productsStmt = db.prepare(`
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.updated_at > ?
        ORDER BY p.updated_at ASC
        LIMIT ?
      `)
      const rawProducts = productsStmt.all(since, this.INCREMENTAL_SYNC_BATCH_SIZE) as any[]

      // Map products from DB format
      const products = rawProducts.map(row => ({
        id: row.id,
        sku: row.sku,
        barcode: row.barcode,
        name: row.name,
        description: row.description,
        categoryId: row.category_id,
        price: row.price,
        cost: row.cost,
        discountRate: row.discount_rate,
        stock: row.stock,
        minStock: row.min_stock,
        maxStock: row.max_stock,
        unit: row.unit,
        isActive: Boolean(row.is_active),
        imageUrl: row.image_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))

      // Get categories updated since timestamp
      const categoriesStmt = db.prepare(`
        SELECT * FROM categories
        WHERE updated_at > ?
        ORDER BY updated_at ASC
        LIMIT ?
      `)
      const rawCategories = categoriesStmt.all(since, this.INCREMENTAL_SYNC_BATCH_SIZE) as any[]

      const categories = rawCategories.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        parentId: row.parent_id,
        displayOrder: row.display_order,
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))

      const hasMore = products.length >= this.INCREMENTAL_SYNC_BATCH_SIZE ||
                      categories.length >= this.INCREMENTAL_SYNC_BATCH_SIZE

      log.info(`P2P: Sending incremental sync response: ${categories.length} categories, ${products.length} products (hasMore: ${hasMore})`)

      const responseMessage: SyncMessage = {
        id: uuidv4(),
        type: 'incremental-sync-response',
        action: 'sync',
        data: {
          products,
          categories,
          since,
          hasMore, // Indicates if there are more items to sync
          syncedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        sourcePos: this.getPosId(),
      }

      this.sendToPeer(requestedBy, responseMessage)

      // Also request incremental sync from the peer (bidirectional)
      const lastSyncWithPeer = this.lastSyncTimestamps.get(requestedBy)
      if (!lastSyncWithPeer) {
        // First sync with this peer - request their changes too
        setTimeout(() => {
          this.requestIncrementalSync(requestedBy)
        }, 1000)
      }
    } catch (error) {
      log.error('P2P: Failed to handle incremental sync request:', error)
    }
  }

  /**
   * Handle incremental sync response - apply only the changed items
   */
  private handleIncrementalSyncResponse(message: SyncMessage): void {
    const { products, categories, since, hasMore, syncedAt } = message.data
    const peerId = message.sourcePos

    log.info(`P2P: Handling incremental sync response from ${peerId}: ${categories?.length || 0} categories, ${products?.length || 0} products`)

    try {
      const ProductRepository = require('../database/repositories/ProductRepository').default
      const CategoryRepository = require('../database/repositories/CategoryRepository').default

      let categoriesUpdated = 0
      let categoriesCreated = 0
      let productsUpdated = 0
      let productsCreated = 0

      // Sync categories first
      if (categories && Array.isArray(categories)) {
        for (const category of categories) {
          try {
            const existing = CategoryRepository.findById(category.id)

            if (existing) {
              const localTime = new Date(existing.updatedAt).getTime()
              const remoteTime = new Date(category.updatedAt).getTime()

              if (remoteTime > localTime) {
                CategoryRepository.updateFromSync(category)
                categoriesUpdated++
              }
            } else {
              CategoryRepository.createFromSync(category)
              categoriesCreated++
            }
          } catch (error) {
            log.error(`P2P: Failed to sync category ${category.name}:`, error)
          }
        }
      }

      // Sync products
      if (products && Array.isArray(products)) {
        for (const product of products) {
          try {
            const existing = ProductRepository.findById(product.id)

            if (existing) {
              const localTime = new Date(existing.updatedAt).getTime()
              const remoteTime = new Date(product.updatedAt).getTime()

              if (remoteTime > localTime) {
                ProductRepository.updateFromSync(product)
                productsUpdated++
              }
            } else {
              ProductRepository.createFromSync(product)
              productsCreated++
            }
          } catch (error) {
            log.error(`P2P: Failed to sync product ${product.name}:`, error)
          }
        }
      }

      // Update last sync timestamp
      this.lastSyncTimestamps.set(peerId, syncedAt)

      log.info(`P2P: Incremental sync completed - Categories: ${categoriesUpdated} updated, ${categoriesCreated} created | Products: ${productsUpdated} updated, ${productsCreated} created`)

      // Notify UI if anything changed
      if (categoriesUpdated > 0 || categoriesCreated > 0 || productsUpdated > 0 || productsCreated > 0) {
        this.notifyDataSynced('all')
      }

      // If there are more items, request next batch
      if (hasMore) {
        log.info(`P2P: More items available, requesting next batch from ${peerId}`)
        setTimeout(() => {
          this.requestIncrementalSync(peerId)
        }, 500)
      }
    } catch (error) {
      log.error('P2P: Failed to handle incremental sync response:', error)
    }
  }

  /**
   * Force a full sync (for manual trigger or first-time sync)
   */
  public forceFullSync(): void {
    try {
      log.info('P2P: Forcing full sync with all peers')

      // Reset last sync timestamps to force full sync
      this.lastSyncTimestamps.clear()

      // Use the old manual sync approach for forced full sync
      const ProductRepository = require('../database/repositories/ProductRepository').default
      const CategoryRepository = require('../database/repositories/CategoryRepository').default

      const products = ProductRepository.findAll()
      const categories = CategoryRepository.findAll()

      log.info(`P2P: Full sync will send ${categories.length} categories and ${products.length} products`)

      this.manualSync({ products, categories })
    } catch (error) {
      log.error('P2P: Failed to force full sync:', error)
    }
  }

  // API publique: Synchronisation manuelle bidirectionnelle avec merge
  public manualSync(data: { products: any[]; categories: any[] }): void {
    log.info(`P2P: Starting bidirectional manual sync with ${data.categories.length} categories and ${data.products.length} products`)

    // Marquer comme en cours pour éviter boucles infinies
    const sessionId = `${this.getPosId()}-${Date.now()}`

    const message: SyncMessage = {
      id: uuidv4(),
      type: 'manual-sync',
      action: 'force-update',
      data: {
        ...data,
        sessionId, // Identifiant unique pour cette session de sync
        initiator: this.getPosId(), // Celui qui a déclenché le sync
      },
      timestamp: new Date().toISOString(),
      sourcePos: this.getPosId(),
    }

    this.broadcast(message)
    log.info(`P2P: Manual sync message broadcasted (session: ${sessionId})`)
  }

  // API publique: Synchroniser le stock
  public syncStock(productId: number, quantity: number): void {
    const message: SyncMessage = {
      id: uuidv4(),
      type: 'stock',
      action: 'update',
      data: { productId, quantity },
      timestamp: new Date().toISOString(),
      sourcePos: this.getPosId(),
    }

    this.broadcast(message)
  }

  // API publique: Synchroniser un client
  public syncCustomer(customer: any, action: 'create' | 'update' | 'delete'): void {
    const message: SyncMessage = {
      id: uuidv4(),
      type: 'customer',
      action,
      data: customer,
      timestamp: new Date().toISOString(),
      sourcePos: this.getPosId(),
    }

    this.broadcast(message)
  }

  // Demander synchronisation complète initiale
  private requestFullSync(peerId: string, bidirectional: boolean): void {
    // Éviter de demander plusieurs fois au même peer
    if (this.syncRequested.has(peerId)) {
      log.info(`P2P: Full sync already requested from ${peerId}, skipping`)
      return
    }

    log.info(`P2P: Requesting full sync from ${peerId} (bidirectional: ${bidirectional})`)
    this.syncRequested.add(peerId)

    const message: SyncMessage = {
      id: uuidv4(),
      type: 'full-sync-request',
      action: 'sync',
      data: {
        requestedBy: this.getPosId(),
        bidirectional, // Flag pour éviter boucle infinie
      },
      timestamp: new Date().toISOString(),
      sourcePos: this.getPosId(),
    }

    this.sendToPeer(peerId, message)
    log.info(`P2P: Full sync request sent to ${peerId}`)
  }

  // Gérer une demande de synchronisation complète
  private handleFullSyncRequest(message: SyncMessage): void {
    const { requestedBy, bidirectional } = message.data
    log.info(`P2P: Handling full sync request from ${requestedBy} (bidirectional: ${bidirectional})`)

    try {
      // Récupérer toutes les données locales
      const ProductRepository = require('../database/repositories/ProductRepository').default
      const CategoryRepository = require('../database/repositories/CategoryRepository').default

      const products = ProductRepository.findAll()
      const categories = CategoryRepository.findAll()

      log.info(`P2P: Local data - ${products.length} products, ${categories.length} categories`)

      // Envoyer la réponse
      const responseMessage: SyncMessage = {
        id: uuidv4(),
        type: 'full-sync-response',
        action: 'sync',
        data: {
          products,
          categories,
          syncedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        sourcePos: this.getPosId(),
      }

      // Envoyer au demandeur
      this.sendToPeer(requestedBy, responseMessage)
      log.info(
        `P2P: Full sync response sent with ${products.length} products and ${categories.length} categories`
      )

      // Si bidirectionnel, demander aussi les données du peer
      if (bidirectional && !this.syncRequested.has(requestedBy)) {
        log.info(`P2P: Requesting bidirectional full sync from ${requestedBy}`)
        setTimeout(() => {
          this.requestFullSync(requestedBy, false) // false pour éviter boucle
        }, 1000)
      }
    } catch (error) {
      log.error('P2P: Failed to handle full sync request:', error)
    }
  }

  // Gérer une réponse de synchronisation complète
  private handleFullSyncResponse(message: SyncMessage): void {
    log.info(`P2P: Handling full sync response from ${message.sourcePos}`)

    try {
      const { products, categories } = message.data

      log.info(`P2P: Received ${categories?.length || 0} categories and ${products?.length || 0} products`)

      const ProductRepository = require('../database/repositories/ProductRepository').default
      const CategoryRepository = require('../database/repositories/CategoryRepository').default

      let categoriesCreated = 0
      let productsCreated = 0
      let categoriesSkipped = 0
      let productsSkipped = 0

      // D'abord, synchroniser les catégories
      if (categories && Array.isArray(categories)) {
        log.info(`P2P: Starting category sync (${categories.length} items)`)
        for (const category of categories) {
          try {
            const existing = CategoryRepository.findById(category.id)
            if (!existing) {
              CategoryRepository.createFromSync(category)
              categoriesCreated++
              log.info(`P2P: ✓ Category synced: ${category.name} (ID: ${category.id})`)
            } else {
              categoriesSkipped++
            }
          } catch (error) {
            log.error(`P2P: ✗ Failed to sync category ${category.name}:`, error)
          }
        }
      }

      // Ensuite, synchroniser les produits
      if (products && Array.isArray(products)) {
        log.info(`P2P: Starting product sync (${products.length} items)`)
        for (const product of products) {
          try {
            const existing = ProductRepository.findById(product.id)
            if (!existing) {
              ProductRepository.createFromSync(product)
              productsCreated++
              if (productsCreated <= 5) {
                log.info(`P2P: ✓ Product synced: ${product.name} (ID: ${product.id})`)
              }
            } else {
              productsSkipped++
            }
          } catch (error) {
            log.error(`P2P: ✗ Failed to sync product ${product.name}:`, error)
          }
        }
      }

      log.info(`P2P: ===== Full sync completed =====`)
      log.info(`P2P: Created: ${categoriesCreated} categories, ${productsCreated} products`)
      log.info(`P2P: Skipped (already exist): ${categoriesSkipped} categories, ${productsSkipped} products`)

      // Notifier l'UI si des données ont été synchronisées
      if (categoriesCreated > 0 || productsCreated > 0) {
        this.notifyDataSynced('all')
      }
    } catch (error) {
      log.error('P2P: Failed to handle full sync response:', error)
    }
  }

  // Gérer la synchronisation manuelle bidirectionnelle avec merge
  private handleManualSync(message: SyncMessage): void {
    try {
      const { products, categories, sessionId, initiator } = message.data

      log.info(`P2P: Handling bidirectional manual sync from ${message.sourcePos} (session: ${sessionId})`)

      if (!products || !Array.isArray(products) || !categories || !Array.isArray(categories)) {
        log.error('P2P: Invalid manual sync data - missing products or categories array')
        return
      }

      // Vérifier si déjà en train de traiter cette session (éviter boucle infinie)
      if (this.manualSyncInProgress.has(sessionId)) {
        log.info(`P2P: Manual sync session ${sessionId} already in progress, skipping to prevent loop`)
        return
      }

      // Marquer la session comme en cours
      this.manualSyncInProgress.add(sessionId)

      // Nettoyer après 30 secondes pour éviter accumulation en mémoire
      setTimeout(() => {
        this.manualSyncInProgress.delete(sessionId)
      }, 30000)

      log.info(`P2P: Merging ${categories.length} categories and ${products.length} products with last-write-wins strategy`)

      const ProductRepository = require('../database/repositories/ProductRepository').default
      const CategoryRepository = require('../database/repositories/CategoryRepository').default

      let categoriesUpdated = 0
      let categoriesCreated = 0
      let categoriesSkipped = 0
      let productsUpdated = 0
      let productsCreated = 0
      let productsSkipped = 0
      let errors = 0

      // Synchroniser les catégories en premier avec comparaison de timestamps
      for (const category of categories) {
        try {
          const existing = CategoryRepository.findById(category.id)

          if (existing) {
            // Comparer les timestamps pour last-write-wins
            const localTime = new Date(existing.updatedAt).getTime()
            const remoteTime = new Date(category.updatedAt).getTime()

            if (remoteTime > localTime) {
              // Distant plus récent, on met à jour
              CategoryRepository.updateFromSync(category)
              categoriesUpdated++
              log.info(`P2P: ✓ Category ${category.name} updated (remote newer: ${category.updatedAt} > ${existing.updatedAt})`)

              this.logSyncEvent(
                message.sourcePos,
                this.connections.get(message.sourcePos)?.peerName || 'Unknown',
                'manual-sync',
                'update',
                'category',
                category.id,
                'success',
                { resolutionStrategy: 'last_write_wins_remote' }
              )
            } else {
              // Local plus récent ou égal, on garde le local
              categoriesSkipped++
              log.info(`P2P: ↷ Category ${category.name} skipped (local newer or equal: ${existing.updatedAt} >= ${category.updatedAt})`)

              this.logSyncEvent(
                message.sourcePos,
                this.connections.get(message.sourcePos)?.peerName || 'Unknown',
                'manual-sync',
                'update',
                'category',
                category.id,
                'skipped',
                { resolutionStrategy: 'last_write_wins_local' }
              )
            }
          } else {
            // N'existe pas localement, on le crée
            CategoryRepository.createFromSync(category)
            categoriesCreated++
            log.info(`P2P: ✓ Category ${category.name} created (new)`)

            this.logSyncEvent(
              message.sourcePos,
              this.connections.get(message.sourcePos)?.peerName || 'Unknown',
              'manual-sync',
              'create',
              'category',
              category.id,
              'success'
            )
          }
        } catch (error) {
          errors++
          log.error(`P2P: ✗ Failed to merge category ${category.name}:`, error)

          this.logSyncEvent(
            message.sourcePos,
            this.connections.get(message.sourcePos)?.peerName || 'Unknown',
            'manual-sync',
            'update',
            'category',
            category.id,
            'error',
            { errorMessage: error instanceof Error ? error.message : 'Unknown error' }
          )
        }
      }

      // Ensuite synchroniser les produits avec comparaison de timestamps
      for (const product of products) {
        try {
          const existing = ProductRepository.findById(product.id)

          if (existing) {
            // Comparer les timestamps pour last-write-wins
            const localTime = new Date(existing.updatedAt).getTime()
            const remoteTime = new Date(product.updatedAt).getTime()

            if (remoteTime > localTime) {
              // Distant plus récent, on met à jour
              ProductRepository.updateFromSync(product)
              productsUpdated++

              if (productsUpdated <= 10) {
                log.info(`P2P: ✓ Product ${product.name} updated (remote newer: ${product.updatedAt} > ${existing.updatedAt})`)
              }

              this.logSyncEvent(
                message.sourcePos,
                this.connections.get(message.sourcePos)?.peerName || 'Unknown',
                'manual-sync',
                'update',
                'product',
                product.id,
                'success',
                { resolutionStrategy: 'last_write_wins_remote' }
              )
            } else {
              // Local plus récent ou égal, on garde le local
              productsSkipped++

              if (productsSkipped <= 10) {
                log.info(`P2P: ↷ Product ${product.name} skipped (local newer or equal: ${existing.updatedAt} >= ${product.updatedAt})`)
              }

              this.logSyncEvent(
                message.sourcePos,
                this.connections.get(message.sourcePos)?.peerName || 'Unknown',
                'manual-sync',
                'update',
                'product',
                product.id,
                'skipped',
                { resolutionStrategy: 'last_write_wins_local' }
              )
            }
          } else {
            // N'existe pas localement, on le crée
            ProductRepository.createFromSync(product)
            productsCreated++

            if (productsCreated <= 10) {
              log.info(`P2P: ✓ Product ${product.name} created (new)`)
            }

            this.logSyncEvent(
              message.sourcePos,
              this.connections.get(message.sourcePos)?.peerName || 'Unknown',
              'manual-sync',
              'create',
              'product',
              product.id,
              'success'
            )
          }
        } catch (error) {
          errors++
          log.error(`P2P: ✗ Failed to merge product ${product.name}:`, error)

          this.logSyncEvent(
            message.sourcePos,
            this.connections.get(message.sourcePos)?.peerName || 'Unknown',
            'manual-sync',
            'update',
            'product',
            product.id,
            'error',
            { errorMessage: error instanceof Error ? error.message : 'Unknown error' }
          )
        }
      }

      log.info(`P2P: ===== Manual sync merge completed =====`)
      log.info(`P2P: Categories - ${categoriesUpdated} updated, ${categoriesCreated} created, ${categoriesSkipped} skipped`)
      log.info(`P2P: Products - ${productsUpdated} updated, ${productsCreated} created, ${productsSkipped} skipped`)
      log.info(`P2P: ${errors} errors`)

      // Notifier l'UI si des données ont été synchronisées
      if (categoriesUpdated > 0 || categoriesCreated > 0 || productsUpdated > 0 || productsCreated > 0) {
        this.notifyDataSynced('all')
      }

      // ========== BIDIRECTIONAL SYNC ==========
      // Si c'est le destinataire initial (pas l'initiateur), envoyer nos données en retour
      if (message.sourcePos === initiator && message.sourcePos !== this.getPosId()) {
        log.info(`P2P: Sending reciprocal sync back to initiator ${initiator}`)

        // Récupérer nos données locales
        const localProducts = ProductRepository.findAll()
        const localCategories = CategoryRepository.findAll()

        // Envoyer un sync de retour avec le MÊME sessionId pour éviter boucle
        const reciprocalMessage: SyncMessage = {
          id: uuidv4(),
          type: 'manual-sync',
          action: 'force-update',
          data: {
            products: localProducts,
            categories: localCategories,
            sessionId, // MÊME session ID pour éviter boucle infinie
            initiator, // Garder l'initiateur original
          },
          timestamp: new Date().toISOString(),
          sourcePos: this.getPosId(),
        }

        // Envoyer uniquement à l'initiateur
        this.sendToPeer(initiator, reciprocalMessage)
        log.info(`P2P: Reciprocal sync sent - ${localCategories.length} categories and ${localProducts.length} products`)
      }
    } catch (error) {
      log.error('P2P: Failed to handle manual sync:', error)
    }
  }

  // Récupérer l'ID du POS
  private getPosId(): string {
    try {
      const configPath = join(app.getPath('userData'), 'pos-config.json')

      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'))
        return config.posId || 'POS-UNKNOWN'
      }

      return 'POS-UNKNOWN'
    } catch (error) {
      log.error('P2P: Failed to read POS ID from config:', error)
      return 'POS-UNKNOWN'
    }
  }

  // Récupérer le nom du POS
  private getPosName(): string {
    try {
      const configPath = join(app.getPath('userData'), 'pos-config.json')

      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'))
        return config.posName || 'POS-UNKNOWN'
      }

      return 'POS-UNKNOWN'
    } catch (error) {
      log.error('P2P: Failed to read POS name from config:', error)
      return 'POS-UNKNOWN'
    }
  }

  // Obtenir le statut de synchronisation
  public getStatus(): {
    serverRunning: boolean
    connectedPeers: number
    totalPeers: number
  } {
    return {
      serverRunning: this.server !== null,
      connectedPeers: this.connections.size,
      totalPeers: PeerDiscovery.getPeers().length,
    }
  }

  // Arrêter le service
  async stop(): Promise<void> {
    // Arrêter le heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    // Fermer toutes les connexions
    for (const [_peerId, conn] of this.connections.entries()) {
      if (conn.reconnectTimer) {
        clearTimeout(conn.reconnectTimer)
      }
      conn.ws.close()
    }
    this.connections.clear()

    // Arrêter le serveur
    if (this.server) {
      this.server.close()
      this.server = null
    }

    log.info('P2P: Sync service stopped')
  }

  // ============================================================================
  // PHASE 5: CONFLICT RESOLUTION
  // ============================================================================

  /**
   * Résoudre un conflit entre données locales et distantes
   * Stratégie: last-write-wins (celui avec updated_at le plus récent gagne)
   */
  private resolveConflict(
    entityType: string,
    entityId: number,
    localData: any,
    remoteData: any,
    peerId: string,
    peerName: string
  ): ConflictResolution {
    const localUpdatedAt = localData?.updatedAt ? new Date(localData.updatedAt) : null
    const remoteUpdatedAt = remoteData?.updatedAt ? new Date(remoteData.updatedAt) : null

    let strategy: 'local_wins' | 'remote_wins' | 'last_write_wins' = 'last_write_wins'
    let winner: 'local' | 'remote'

    // Si pas de timestamp local, remote gagne
    if (!localUpdatedAt && remoteUpdatedAt) {
      winner = 'remote'
      strategy = 'remote_wins'
    }
    // Si pas de timestamp remote, local gagne
    else if (localUpdatedAt && !remoteUpdatedAt) {
      winner = 'local'
      strategy = 'local_wins'
    }
    // Si les deux ont des timestamps, comparer
    else if (localUpdatedAt && remoteUpdatedAt) {
      winner = remoteUpdatedAt > localUpdatedAt ? 'remote' : 'local'
      strategy = 'last_write_wins'
    }
    // Si aucun timestamp, local gagne par défaut
    else {
      winner = 'local'
      strategy = 'local_wins'
    }

    log.info(
      `P2P: Conflict resolution for ${entityType} #${entityId}: ${winner} wins (strategy: ${strategy})`
    )

    // Logger le conflit dans la base de données
    this.logConflict({
      peerId,
      peerName,
      entityType,
      entityId,
      entityName: remoteData?.name || localData?.name || `${entityType}-${entityId}`,
      conflictType: 'update_conflict',
      localData: JSON.stringify(localData),
      remoteData: JSON.stringify(remoteData),
      localUpdatedAt: localUpdatedAt?.toISOString() || null,
      remoteUpdatedAt: remoteUpdatedAt?.toISOString() || null,
      resolutionStrategy: strategy,
      finalData: JSON.stringify(winner === 'local' ? localData : remoteData),
      resolvedBy: 'system',
      notes: `Automatic conflict resolution using ${strategy}`,
    })

    return {
      entityType,
      entityId,
      localData,
      remoteData,
      localUpdatedAt,
      remoteUpdatedAt,
      strategy,
      winner,
    }
  }

  /**
   * Logger un conflit dans la base de données
   */
  private logConflict(conflict: {
    peerId: string
    peerName: string
    entityType: string
    entityId: number
    entityName: string
    conflictType: string
    localData: string
    remoteData: string
    localUpdatedAt: string | null
    remoteUpdatedAt: string | null
    resolutionStrategy: string
    finalData: string
    resolvedBy: string
    notes: string
  }): void {
    try {
      const db = DatabaseService.getInstance().getDatabase()
      const stmt = db.prepare(`
        INSERT INTO p2p_conflicts (
          peer_id, peer_name, entity_type, entity_id, entity_name,
          conflict_type, local_data, remote_data, local_updated_at, remote_updated_at,
          resolution_strategy, final_data, resolved_by, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        conflict.peerId,
        conflict.peerName,
        conflict.entityType,
        conflict.entityId,
        conflict.entityName,
        conflict.conflictType,
        conflict.localData,
        conflict.remoteData,
        conflict.localUpdatedAt,
        conflict.remoteUpdatedAt,
        conflict.resolutionStrategy,
        conflict.finalData,
        conflict.resolvedBy,
        conflict.notes
      )

      log.debug(`P2P: Logged conflict for ${conflict.entityType} #${conflict.entityId}`)
    } catch (error) {
      log.error('P2P: Failed to log conflict:', error)
    }
  }

  // ============================================================================
  // PHASE 6: METRICS AND LOGGING
  // ============================================================================

  /**
   * Logger une métrique de connexion
   */
  private logConnectionMetric(
    peerId: string,
    peerName: string,
    eventType: 'connected' | 'disconnected' | 'reconnected' | 'heartbeat_timeout' | 'sync_completed' | 'sync_failed',
    details?: {
      messagesSent?: number
      messagesReceived?: number
      bytesSent?: number
      bytesReceived?: number
      syncDurationMs?: number
      errorMessage?: string
    }
  ): void {
    try {
      const db = DatabaseService.getInstance().getDatabase()
      const stmt = db.prepare(`
        INSERT INTO p2p_connection_metrics (
          peer_id, peer_name, event_type, messages_sent, messages_received,
          bytes_sent, bytes_received, sync_duration_ms, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        peerId,
        peerName,
        eventType,
        details?.messagesSent || 0,
        details?.messagesReceived || 0,
        details?.bytesSent || 0,
        details?.bytesReceived || 0,
        details?.syncDurationMs || null,
        details?.errorMessage || null
      )

      log.debug(`P2P: Logged ${eventType} metric for ${peerName}`)
    } catch (error) {
      log.error('P2P: Failed to log connection metric:', error)
    }
  }

  /**
   * Logger un événement de synchronisation
   */
  private logSyncEvent(
    peerId: string,
    peerName: string,
    messageType: string,
    messageAction: string,
    entityType: string,
    entityId: number | null,
    status: 'success' | 'conflict' | 'error' | 'skipped',
    details?: {
      conflictReason?: string
      resolutionStrategy?: string
      errorMessage?: string
    }
  ): void {
    try {
      const db = DatabaseService.getInstance().getDatabase()
      const stmt = db.prepare(`
        INSERT INTO p2p_sync_logs (
          peer_id, peer_name, message_type, message_action, entity_type, entity_id,
          status, conflict_reason, resolution_strategy, details
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        peerId,
        peerName,
        messageType,
        messageAction,
        entityType,
        entityId,
        status,
        details?.conflictReason || null,
        details?.resolutionStrategy || null,
        details?.errorMessage || null
      )

      log.debug(`P2P: Logged sync event: ${entityType}/${status}`)
    } catch (error) {
      log.error('P2P: Failed to log sync event:', error)
    }
  }

  /**
   * Tracker les statistiques de messages
   */
  private trackMessageStats(peerId: string, direction: 'sent' | 'received', messageSize: number): void {
    const conn = this.connections.get(peerId)
    if (!conn) return

    if (direction === 'sent') {
      conn.messagesSent++
      conn.bytesSent += messageSize
    } else {
      conn.messagesReceived++
      conn.bytesReceived += messageSize
    }
  }

  /**
   * Obtenir les statistiques détaillées
   */
  public getDetailedStats(): {
    connections: Array<{
      peerId: string
      peerName: string
      messagesSent: number
      messagesReceived: number
      bytesSent: number
      bytesReceived: number
      lastPing: string
      lastPong: string
      reconnectAttempts: number
    }>
    totalMessagesSent: number
    totalMessagesReceived: number
    totalBytesSent: number
    totalBytesReceived: number
  } {
    const connections = Array.from(this.connections.values()).map((conn) => ({
      peerId: conn.peerId,
      peerName: conn.peerName,
      messagesSent: conn.messagesSent,
      messagesReceived: conn.messagesReceived,
      bytesSent: conn.bytesSent,
      bytesReceived: conn.bytesReceived,
      lastPing: conn.lastPing.toISOString(),
      lastPong: conn.lastPong.toISOString(),
      reconnectAttempts: conn.reconnectAttempts,
    }))

    const totals = connections.reduce(
      (acc, conn) => ({
        totalMessagesSent: acc.totalMessagesSent + conn.messagesSent,
        totalMessagesReceived: acc.totalMessagesReceived + conn.messagesReceived,
        totalBytesSent: acc.totalBytesSent + conn.bytesSent,
        totalBytesReceived: acc.totalBytesReceived + conn.bytesReceived,
      }),
      {
        totalMessagesSent: 0,
        totalMessagesReceived: 0,
        totalBytesSent: 0,
        totalBytesReceived: 0,
      }
    )

    return {
      connections,
      ...totals,
    }
  }
}

export default new P2PSyncService()
