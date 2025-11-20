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
  private configPath: string | null = null
  private config: POSConfig | null = null

  // Lazy initialization of config path (only when app is ready)
  private getConfigPath(): string {
    if (!this.configPath) {
      this.configPath = join(app.getPath('userData'), 'pos-config.json')
    }
    return this.configPath
  }

  // Charger ou créer la configuration
  async loadConfig(): Promise<POSConfig> {
    const configPath = this.getConfigPath()
    try {
      if (existsSync(configPath)) {
        // Charger config existante
        const configData = readFileSync(configPath, 'utf-8')
        const parsedConfig = JSON.parse(configData) as POSConfig
        this.config = parsedConfig
        log.info('P2P: Loaded existing config:', parsedConfig.posId)
        return parsedConfig
      } else {
        // Créer nouvelle config
        const newConfig = this.createDefaultConfig()
        this.config = newConfig
        this.saveConfig()
        log.info('P2P: Created new config:', newConfig.posId)
        return newConfig
      }
    } catch (error) {
      log.error('P2P: Failed to load config:', error)
      // Créer config par défaut en cas d'erreur
      const defaultConfig = this.createDefaultConfig()
      this.config = defaultConfig
      return defaultConfig
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
        const configPath = this.getConfigPath()
        writeFileSync(configPath, JSON.stringify(this.config, null, 2), 'utf-8')
        log.info('P2P: Config saved to', configPath)
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
}

export default new ConfigManager()
