import WebSocket, { WebSocketServer } from 'ws'
import log from 'electron-log'
import PeerDiscovery from './PeerDiscovery'
import { v4 as uuidv4 } from 'uuid'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

export interface SyncMessage {
  id: string // ID unique du message
  type: 'ticket' | 'product' | 'stock' | 'customer' | 'user' | 'payment'
  action: 'create' | 'update' | 'delete'
  data: any
  timestamp: string
  sourcePos: string
}

class P2PSyncService {
  private server: WebSocketServer | null = null
  private connections: Map<string, WebSocket> = new Map()
  private processedMessages: Set<string> = new Set() // Éviter doublons
  private port = 3030

  // Démarrer le serveur WebSocket
  async startServer(): Promise<void> {
    try {
      this.server = new WebSocketServer({ port: this.port })

      this.server.on('connection', (ws: WebSocket, req) => {
        const clientIp = req.socket.remoteAddress
        log.info(`P2P: New connection from ${clientIp}`)

        // Gérer les messages entrants
        ws.on('message', (data: Buffer) => {
          this.handleIncomingMessage(data.toString())
        })

        // Gérer la déconnexion
        ws.on('close', () => {
          log.info(`P2P: Connection closed from ${clientIp}`)
          // Retirer de la liste des connexions
          for (const [peerId, conn] of this.connections.entries()) {
            if (conn === ws) {
              this.connections.delete(peerId)
              break
            }
          }
        })

        // Gérer les erreurs
        ws.on('error', (error) => {
          log.error(`P2P: WebSocket error from ${clientIp}:`, error)
        })
      })

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
        try {
          // Format address for WebSocket (handle IPv6 with brackets)
          let address = peer.address
          if (address.includes(':') && !address.startsWith('[')) {
            // IPv6 address - add brackets
            address = `[${address}]`
          }

          log.info(`P2P: Attempting to connect to ${peer.name} at ${address}:${peer.port}`)
          const ws = new WebSocket(`ws://${address}:${peer.port}`)

          ws.on('open', () => {
            log.info(`P2P: Connected to peer ${peer.name}`)
            this.connections.set(peer.id, ws)

            // Envoyer message de synchronisation initiale
            this.requestFullSync(peer.id)
          })

          ws.on('message', (data: Buffer) => {
            this.handleIncomingMessage(data.toString())
          })

          ws.on('close', () => {
            log.info(`P2P: Disconnected from peer ${peer.name}`)
            this.connections.delete(peer.id)
          })

          ws.on('error', (error) => {
            log.error(`P2P: Connection error with ${peer.name}:`, error)
          })
        } catch (error) {
          log.error(`P2P: Failed to connect to peer ${peer.name}:`, error)
        }
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
    for (const [peerId, ws] of this.connections.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr)
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
  private handleIncomingMessage(messageStr: string): void {
    try {
      const message: SyncMessage = JSON.parse(messageStr)

      // Ignorer si déjà traité (éviter boucles)
      if (this.processedMessages.has(message.id)) {
        return
      }

      // Ignorer si vient de nous-mêmes
      if (message.sourcePos === this.getPosId()) {
        return
      }

      log.info(
        `P2P: Received ${message.type}/${message.action} from ${message.sourcePos}`
      )

      // Marquer comme traité
      this.processedMessages.add(message.id)

      // Appliquer les changements localement
      this.applySync(message)
    } catch (error) {
      log.error('P2P: Failed to handle incoming message:', error)
    }
  }

  // Appliquer les changements dans la BD locale
  private applySync(message: SyncMessage): void {
    const { type, action, data } = message

    try {
      switch (type) {
        case 'ticket':
          if (action === 'create') {
            // Import dynamique pour éviter dépendances circulaires
            const TicketRepository =
              require('../database/repositories/TicketRepository').default
            TicketRepository.createFromSync(data)
            log.info(`P2P: Synced new ticket ${data.ticketNumber}`)
          }
          break

        case 'product':
          const ProductRepository =
            require('../database/repositories/ProductRepository').default
          if (action === 'update') {
            ProductRepository.update(data.id, data)
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
          const CustomerRepository =
            require('../database/repositories/CustomerRepository').default
          if (action === 'create') {
            CustomerRepository.createFromSync(data)
            log.info(`P2P: Synced new customer ${data.name}`)
          } else if (action === 'update') {
            CustomerRepository.update(data.id, data)
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
  private requestFullSync(peerId: string): void {
    // TODO: Implémenter synchronisation initiale
    // Comparer les timestamps et synchroniser les données manquantes
    log.info(`P2P: Requesting full sync from ${peerId}`)
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
    // Fermer toutes les connexions
    for (const ws of this.connections.values()) {
      ws.close()
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
