import WebSocket, { WebSocketServer } from 'ws'
import log from 'electron-log'
import PeerDiscovery from './PeerDiscovery'
import { v4 as uuidv4 } from 'uuid'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

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
  action: 'create' | 'update' | 'delete' | 'sync' | 'identify' | 'heartbeat'
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
}

class P2PSyncService {
  private server: WebSocketServer | null = null
  private connections: Map<string, PeerConnection> = new Map()
  private processedMessages: Set<string> = new Set() // Éviter doublons
  private syncRequested: Set<string> = new Set() // Éviter demandes multiples
  private port = 3030
  private heartbeatInterval: NodeJS.Timeout | null = null
  private readonly HEARTBEAT_INTERVAL = 30000 // 30 secondes
  private readonly HEARTBEAT_TIMEOUT = 10000 // 10 secondes
  private readonly RECONNECT_BASE_DELAY = 5000 // 5 secondes
  private readonly RECONNECT_MAX_DELAY = 60000 // 60 secondes
  private readonly RECONNECT_MAX_ATTEMPTS = 10

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
        }

        this.connections.set(peerId, connection)

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
        conn.ws.send(JSON.stringify(message))
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

    // Connexion établie et identifiée - demander synchronisation
    this.requestFullSync(posId, false) // false = pas bidirectionnel
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
            ProductRepository.update(data)
            log.info(`P2P: Synced product update ${data.name}`)
          } else if (action === 'create') {
            ProductRepository.createFromSync(data)
            log.info(`P2P: Synced new product ${data.name}`)
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
    } catch (error) {
      log.error('P2P: Failed to handle full sync response:', error)
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
    for (const [peerId, conn] of this.connections.entries()) {
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
}

export default new P2PSyncService()
