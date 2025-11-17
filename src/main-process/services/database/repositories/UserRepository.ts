import DatabaseService from '../db'
import { User, CreateUserDTO, UpdateUserDTO } from '@shared/types'
import bcrypt from 'bcryptjs'
import log from 'electron-log'

export class UserRepository {
  private get db() {
    return DatabaseService.getInstance().getDatabase()
  }

  findAll(): User[] {
    try {
      const stmt = this.db.prepare(`
        SELECT
          u.*,
          json_group_array(
            json_object(
              'id', p.id,
              'resource', p.resource,
              'action', p.action
            )
          ) as permissions
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        GROUP BY u.id
      `)
      const results = stmt.all() as any[]

      return results.map((result) => {
        const user: User = {
          id: result.id,
          username: result.username,
          email: result.email,
          firstName: result.first_name,
          lastName: result.last_name,
          roleId: result.role_id,
          isActive: Boolean(result.is_active), // Convert SQLite integer to boolean
          createdAt: result.created_at,
          updatedAt: result.updated_at,
          permissions: result.permissions
        }

        // Parse and filter permissions
        if (typeof user.permissions === 'string') {
          try {
            const parsed = JSON.parse(user.permissions)
            // Filter out null permissions (when user has no permissions)
            user.permissions = Array.isArray(parsed)
              ? parsed.filter((p: any) => p.id !== null)
              : []
          } catch (error) {
            log.error('Failed to parse permissions:', error)
            user.permissions = []
          }
        }

        return user
      })
    } catch (error) {
      log.error('UserRepository.findAll failed:', error)
      throw error
    }
  }

  findById(id: number): User | null {
    try {
      const stmt = this.db.prepare(`
        SELECT
          u.*,
          json_group_array(
            json_object(
              'id', p.id,
              'resource', p.resource,
              'action', p.action
            )
          ) as permissions
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        WHERE u.id = ?
        GROUP BY u.id
      `)
      const result = stmt.get(id) as any

      if (!result) {
        return null
      }

      // Convert SQLite result to User type
      const user: User = {
        id: result.id,
        username: result.username,
        email: result.email,
        firstName: result.first_name,
        lastName: result.last_name,
        roleId: result.role_id,
        isActive: Boolean(result.is_active), // Convert SQLite integer to boolean
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        permissions: result.permissions
      }

      // Parse and filter permissions
      if (typeof user.permissions === 'string') {
        try {
          const parsed = JSON.parse(user.permissions)
          // Filter out null permissions (when user has no permissions)
          user.permissions = Array.isArray(parsed)
            ? parsed.filter((p: any) => p.id !== null)
            : []
        } catch (error) {
          log.error('Failed to parse permissions:', error)
          user.permissions = []
        }
      }

      return user
    } catch (error) {
      log.error('UserRepository.findById failed:', error)
      throw error
    }
  }

  findByUsername(username: string): User | null {
    try {
      const stmt = this.db.prepare(`
        SELECT
          u.*,
          json_group_array(
            json_object(
              'id', p.id,
              'resource', p.resource,
              'action', p.action
            )
          ) as permissions
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        WHERE u.username = ?
        GROUP BY u.id
      `)
      const result = stmt.get(username) as any

      if (!result) {
        return null
      }

      // Convert SQLite result to User type
      const user: User = {
        id: result.id,
        username: result.username,
        email: result.email,
        firstName: result.first_name,
        lastName: result.last_name,
        roleId: result.role_id,
        isActive: Boolean(result.is_active), // Convert SQLite integer to boolean
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        permissions: result.permissions
      }

      // Parse and filter permissions
      if (typeof user.permissions === 'string') {
        try {
          const parsed = JSON.parse(user.permissions)
          // Filter out null permissions (when user has no permissions)
          user.permissions = Array.isArray(parsed)
            ? parsed.filter((p: any) => p.id !== null)
            : []
        } catch (error) {
          log.error('Failed to parse permissions:', error)
          user.permissions = []
        }
      }

      log.info(`findByUsername result - User: ${user.username}, isActive: ${user.isActive} (type: ${typeof user.isActive})`)
      return user
    } catch (error) {
      log.error('UserRepository.findByUsername failed:', error)
      throw error
    }
  }

  findByEmail(email: string): User | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?')
      return (stmt.get(email) as User) || null
    } catch (error) {
      log.error('UserRepository.findByEmail failed:', error)
      throw error
    }
  }

  async create(data: CreateUserDTO): Promise<User> {
    try {
      const passwordHash = await bcrypt.hash(data.password, 10)

      const stmt = this.db.prepare(`
        INSERT INTO users (username, email, password_hash, first_name, last_name, role_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        data.username,
        data.email,
        passwordHash,
        data.firstName,
        data.lastName,
        data.roleId
      )

      const user = this.findById(result.lastInsertRowid as number)
      if (!user) {
        throw new Error('Failed to create user')
      }

      log.info(`User created: ${user.username} (ID: ${user.id})`)
      return user
    } catch (error) {
      log.error('UserRepository.create failed:', error)
      throw error
    }
  }

  update(data: UpdateUserDTO): User {
    try {
      const fields: string[] = []
      const values: any[] = []

      if (data.username !== undefined) {
        fields.push('username = ?')
        values.push(data.username)
      }
      if (data.email !== undefined) {
        fields.push('email = ?')
        values.push(data.email)
      }
      if (data.firstName !== undefined) {
        fields.push('first_name = ?')
        values.push(data.firstName)
      }
      if (data.lastName !== undefined) {
        fields.push('last_name = ?')
        values.push(data.lastName)
      }
      if (data.roleId !== undefined) {
        fields.push('role_id = ?')
        values.push(data.roleId)
      }
      if (data.isActive !== undefined) {
        fields.push('is_active = ?')
        values.push(data.isActive ? 1 : 0)
      }

      if (fields.length === 0) {
        throw new Error('No fields to update')
      }

      values.push(data.id)

      const stmt = this.db.prepare(`
        UPDATE users SET ${fields.join(', ')} WHERE id = ?
      `)
      stmt.run(...values)

      const user = this.findById(data.id)
      if (!user) {
        throw new Error('User not found after update')
      }

      log.info(`User updated: ${user.username} (ID: ${user.id})`)
      return user
    } catch (error) {
      log.error('UserRepository.update failed:', error)
      throw error
    }
  }

  delete(id: number): boolean {
    try {
      const stmt = this.db.prepare('DELETE FROM users WHERE id = ?')
      const result = stmt.run(id)

      log.info(`User deleted: ID ${id}`)
      return result.changes > 0
    } catch (error) {
      log.error('UserRepository.delete failed:', error)
      throw error
    }
  }

  async verifyPassword(username: string, password: string): Promise<boolean> {
    try {
      const stmt = this.db.prepare('SELECT password_hash FROM users WHERE username = ?')
      const result = stmt.get(username) as { password_hash: string } | undefined

      if (!result) {
        return false
      }

      return await bcrypt.compare(password, result.password_hash)
    } catch (error) {
      log.error('UserRepository.verifyPassword failed:', error)
      throw error
    }
  }

  async changePassword(userId: number, newPassword: string): Promise<boolean> {
    try {
      const passwordHash = await bcrypt.hash(newPassword, 10)
      const stmt = this.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      const result = stmt.run(passwordHash, userId)

      log.info(`Password changed for user ID: ${userId}`)
      return result.changes > 0
    } catch (error) {
      log.error('UserRepository.changePassword failed:', error)
      throw error
    }
  }

  updateLastLogin(userId: number): void {
    try {
      const stmt = this.db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?')
      stmt.run(userId)
    } catch (error) {
      log.error('UserRepository.updateLastLogin failed:', error)
      throw error
    }
  }
}

let instance: UserRepository | null = null
export default {
  get instance() {
    if (!instance) {
      instance = new UserRepository()
    }
    return instance
  },
  findAll: function() { return this.instance.findAll() },
  findById: function(id: number) { return this.instance.findById(id) },
  findByUsername: function(username: string) { return this.instance.findByUsername(username) },
  findByEmail: function(email: string) { return this.instance.findByEmail(email) },
  create: function(data: CreateUserDTO) { return this.instance.create(data) },
  update: function(data: UpdateUserDTO) { return this.instance.update(data) },
  delete: function(id: number) { return this.instance.delete(id) },
  verifyPassword: function(username: string, password: string) { return this.instance.verifyPassword(username, password) },
  changePassword: function(userId: number, newPassword: string) { return this.instance.changePassword(userId, newPassword) },
  updateLastLogin: function(userId: number) { return this.instance.updateLastLogin(userId) }
}
