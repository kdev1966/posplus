import DatabaseService from '../db'
import log from 'electron-log'

export interface StoreSettings {
  id: number
  storeNameFr: string
  storeNameAr: string
  storePhone: string
  ticketMessageFr: string
  ticketMessageAr: string
  printPreviewEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface UpdateStoreSettingsDTO {
  storeNameFr?: string
  storeNameAr?: string
  storePhone?: string
  ticketMessageFr?: string
  ticketMessageAr?: string
  printPreviewEnabled?: boolean
}

export class StoreSettingsRepository {
  private get db() {
    return DatabaseService.getInstance().getDatabase()
  }

  getSettings(): StoreSettings {
    try {
      const stmt = this.db.prepare('SELECT * FROM store_settings WHERE id = 1')
      const result = stmt.get() as any

      if (!result) {
        // Create default settings if not exists
        this.db.prepare(`
          INSERT INTO store_settings (id, store_name_fr, store_name_ar, store_phone, ticket_message_fr, ticket_message_ar)
          VALUES (1, '', '', '', '', '')
        `).run()

        return this.getSettings()
      }

      return {
        id: result.id,
        storeNameFr: result.store_name_fr,
        storeNameAr: result.store_name_ar,
        storePhone: result.store_phone,
        ticketMessageFr: result.ticket_message_fr,
        ticketMessageAr: result.ticket_message_ar,
        printPreviewEnabled: result.print_preview_enabled === 1,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      }
    } catch (error) {
      log.error('StoreSettingsRepository.getSettings failed:', error)
      throw error
    }
  }

  updateSettings(data: UpdateStoreSettingsDTO): StoreSettings {
    try {
      const fields: string[] = []
      const values: any[] = []

      if (data.storeNameFr !== undefined) {
        fields.push('store_name_fr = ?')
        values.push(data.storeNameFr)
      }
      if (data.storeNameAr !== undefined) {
        fields.push('store_name_ar = ?')
        values.push(data.storeNameAr)
      }
      if (data.storePhone !== undefined) {
        fields.push('store_phone = ?')
        values.push(data.storePhone)
      }
      if (data.ticketMessageFr !== undefined) {
        fields.push('ticket_message_fr = ?')
        values.push(data.ticketMessageFr)
      }
      if (data.ticketMessageAr !== undefined) {
        fields.push('ticket_message_ar = ?')
        values.push(data.ticketMessageAr)
      }
      if (data.printPreviewEnabled !== undefined) {
        fields.push('print_preview_enabled = ?')
        values.push(data.printPreviewEnabled ? 1 : 0)
      }

      if (fields.length === 0) {
        throw new Error('No fields to update')
      }

      values.push(1) // id = 1

      const stmt = this.db.prepare(`
        UPDATE store_settings SET ${fields.join(', ')} WHERE id = ?
      `)
      stmt.run(...values)

      log.info('Store settings updated successfully')
      return this.getSettings()
    } catch (error) {
      log.error('StoreSettingsRepository.updateSettings failed:', error)
      throw error
    }
  }
}

export default new StoreSettingsRepository()
