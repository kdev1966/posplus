import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import log from 'electron-log'
import { v4 as uuidv4 } from 'uuid'

export interface POSConfig {
  posId: string
  posName: string
  posType: 'desktop' | 'laptop' | 'mobile'
  p2p: {
    enabled: boolean
    port: number
    discoveryEnabled: boolean
    autoSync: boolean
    reconnectInterval: number
  }
  createdAt: string
}

class ConfigManager {
  private configPath: string
  private config: POSConfig | null = null

  constructor() {
    this.configPath = join(app.getPath('userData'), 'pos-config.json')
  }

  // Charger ou créer la configuration
  async loadConfig(): Promise<POSConfig> {
    try {
      if (existsSync(this.configPath)) {
        // Charger config existante
        const configData = readFileSync(this.configPath, 'utf-8')
        this.config = JSON.parse(configData)
        log.info('P2P: Loaded existing config:', this.config?.posId)
      } else {
        // Créer nouvelle config
        this.config = this.createDefaultConfig()
        this.saveConfig()
        log.info('P2P: Created new config:', this.config.posId)
      }

      return this.config
    } catch (error) {
      log.error('P2P: Failed to load config:', error)
      // Créer config par défaut en cas d'erreur
      this.config = this.createDefaultConfig()
      return this.config
    }
  }

  // Créer une configuration par défaut
  private createDefaultConfig(): POSConfig {
    const { hostname } = require('os')

    return {
      posId: `POS-${uuidv4().substring(0, 8)}`,
      posName: `POSPlus-${hostname()}`,
      posType: 'desktop',
      p2p: {
        enabled: true,
        port: 3030,
        discoveryEnabled: true,
        autoSync: true,
        reconnectInterval: 5000,
      },
      createdAt: new Date().toISOString(),
    }
  }

  // Sauvegarder la configuration
  private saveConfig(): void {
    if (this.config) {
      try {
        writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8')
        log.info('P2P: Config saved to', this.configPath)
      } catch (error) {
        log.error('P2P: Failed to save config:', error)
      }
    }
  }

  // Obtenir la configuration actuelle
  getConfig(): POSConfig | null {
    return this.config
  }

  // Mettre à jour la configuration
  updateConfig(updates: Partial<POSConfig>): void {
    if (this.config) {
      this.config = { ...this.config, ...updates }
      this.saveConfig()
      log.info('P2P: Config updated')
    }
  }

  // Activer/désactiver P2P
  setP2PEnabled(enabled: boolean): void {
    if (this.config) {
      this.config.p2p.enabled = enabled
      this.saveConfig()
      log.info(`P2P: ${enabled ? 'Enabled' : 'Disabled'}`)
    }
  }

  // Obtenir le chemin du fichier de config
  getConfigPath(): string {
    return this.configPath
  }
}

export default new ConfigManager()
