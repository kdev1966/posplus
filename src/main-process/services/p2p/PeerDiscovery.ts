import Bonjour from 'bonjour-service'
import log from 'electron-log'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

export interface Peer {
  id: string
  name: string
  address: string
  port: number
  online: boolean
  lastSeen: Date
}

type PeerDiscoveredCallback = (peer: Peer) => void
type PeerLostCallback = (peer: Peer) => void

class PeerDiscoveryService {
  private bonjour: any
  private peers: Map<string, Peer> = new Map()
  private serviceName = 'posplus-p2p'
  private port = 3030
  private onPeerDiscoveredCallback: PeerDiscoveredCallback | null = null
  private onPeerLostCallback: PeerLostCallback | null = null

  constructor() {
    this.bonjour = new Bonjour()
  }

  // Publier ce POS sur le réseau
  async advertise(posName: string): Promise<void> {
    try {
      this.bonjour.publish({
        name: posName,
        type: this.serviceName,
        port: this.port,
        txt: {
          id: this.getPosId(),
          version: '1.0.0',
        },
      })

      log.info(`P2P: Advertising as ${posName} on port ${this.port}`)
    } catch (error) {
      log.error('P2P: Failed to advertise:', error)
    }
  }

  // Découvrir les autres POS sur le réseau
  async discover(): Promise<void> {
    const browser = this.bonjour.find({ type: this.serviceName })

    browser.on('up', (service: any) => {
      // Nouveau pair découvert
      const peerId = service.txt?.id
      if (peerId && peerId !== this.getPosId()) {
        // Prefer IPv4 addresses over IPv6 for better WebSocket compatibility
        let address = service.host
        if (service.addresses && service.addresses.length > 0) {
          // Find first IPv4 address
          const ipv4 = service.addresses.find((addr: string) => !addr.includes(':'))
          address = ipv4 || service.addresses[0]
        }

        const peer: Peer = {
          id: peerId,
          name: service.name,
          address: address,
          port: service.port,
          online: true,
          lastSeen: new Date(),
        }

        this.peers.set(peerId, peer)
        log.info(`P2P: Discovered peer ${peer.name} at ${peer.address}:${peer.port}`)

        // Notifier l'application
        if (this.onPeerDiscoveredCallback) {
          this.onPeerDiscoveredCallback(peer)
        }
      }
    })

    browser.on('down', (service: any) => {
      // Pair déconnecté
      const peerId = service.txt?.id
      if (peerId) {
        const peer = this.peers.get(peerId)
        if (peer) {
          peer.online = false
          log.info(`P2P: Peer ${peer.name} went offline`)

          if (this.onPeerLostCallback) {
            this.onPeerLostCallback(peer)
          }
        }
      }
    })

    log.info('P2P: Discovery started')
  }

  // Récupérer l'ID unique du POS depuis config
  private getPosId(): string {
    try {
      const configPath = join(app.getPath('userData'), 'pos-config.json')

      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'))
        return config.posId || this.generatePosId()
      }

      return this.generatePosId()
    } catch (error) {
      log.error('P2P: Failed to read POS ID from config:', error)
      return this.generatePosId()
    }
  }

  // Générer un ID unique basé sur le nom de la machine
  private generatePosId(): string {
    const { hostname } = require('os')
    return `POS-${hostname().substring(0, 10)}-${Date.now()}`
  }

  // Obtenir tous les pairs
  getPeers(): Peer[] {
    return Array.from(this.peers.values())
  }

  // Obtenir seulement les pairs en ligne
  getOnlinePeers(): Peer[] {
    return this.getPeers().filter((p) => p.online)
  }

  // Enregistrer callback pour pair découvert
  onPeerDiscovered(callback: PeerDiscoveredCallback): void {
    this.onPeerDiscoveredCallback = callback
  }

  // Enregistrer callback pour pair perdu
  onPeerLost(callback: PeerLostCallback): void {
    this.onPeerLostCallback = callback
  }

  // Arrêter le service de découverte
  async stop(): Promise<void> {
    this.bonjour.unpublishAll()
    this.bonjour.destroy()
    log.info('P2P: Discovery stopped')
  }
}

export default new PeerDiscoveryService()
