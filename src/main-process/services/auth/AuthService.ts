import UserRepository from '../database/repositories/UserRepository'
import { User, LoginCredentials, AuthResponse } from '@shared/types'
import { ROLE_IDS } from '@shared/constants'
import DatabaseService from '../database/db'
import log from 'electron-log'

class AuthService {
  private currentUser: User | null = null
  private forceLogoutChecked: boolean = false

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      log.info(`Login attempt for user: ${credentials.username}`)

      const isValid = await UserRepository.verifyPassword(
        credentials.username,
        credentials.password
      )

      if (!isValid) {
        log.warn(`Invalid credentials for user: ${credentials.username}`)
        return {
          success: false,
          error: 'Invalid username or password',
        }
      }

      const user = UserRepository.findByUsername(credentials.username)

      if (!user || !user.isActive) {
        log.warn(`User not found or inactive: ${credentials.username}`)
        return {
          success: false,
          error: 'User not found or inactive',
        }
      }

      // Update last login
      UserRepository.updateLastLogin(user.id)

      this.currentUser = user
      log.info(`User logged in successfully: ${user.username} (ID: ${user.id}, Role: ${user.roleId})`)

      return {
        success: true,
        user,
      }
    } catch (error) {
      log.error('Login failed:', error)
      return {
        success: false,
        error: 'Login failed',
      }
    }
  }

  async logout(): Promise<void> {
    log.info(`User logged out: ${this.currentUser?.username}`)
    this.currentUser = null
  }

  async checkAuth(): Promise<AuthResponse> {
    // Check if we need to force logout (only once per app session)
    if (!this.forceLogoutChecked) {
      this.forceLogoutChecked = true
      try {
        const db = DatabaseService.getInstance().getDatabase()
        const stmt = db.prepare("SELECT value FROM settings WHERE key = 'force_logout'")
        const result = stmt.get() as { value: string } | undefined

        if (result && result.value === 'true') {
          log.warn('Force logout flag detected - clearing all sessions')
          this.currentUser = null

          // Clear the flag so it only happens once
          const updateStmt = db.prepare("UPDATE settings SET value = 'false' WHERE key = 'force_logout'")
          updateStmt.run()

          return {
            success: false,
            error: 'Session expired - please login again',
          }
        }
      } catch (error) {
        log.error('Failed to check force_logout flag:', error)
      }
    }

    if (this.currentUser) {
      // Always refresh user data from database to get latest role and permissions
      const user = UserRepository.findById(this.currentUser.id)
      if (user && user.isActive) {
        // Update current user with fresh data from DB
        this.currentUser = user
        log.debug(`Auth check: User ${user.username} (ID: ${user.id}, Role: ${user.roleId})`)
        return {
          success: true,
          user,
        }
      } else {
        // User no longer exists or is inactive - logout
        log.warn(`Auth check failed: User ${this.currentUser.username} not found or inactive`)
        this.currentUser = null
      }
    }

    return {
      success: false,
      error: 'Not authenticated',
    }
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<boolean> {
    try {
      const user = UserRepository.findById(userId)
      if (!user) {
        return false
      }

      const isValid = await UserRepository.verifyPassword(user.username, oldPassword)
      if (!isValid) {
        return false
      }

      return await UserRepository.changePassword(userId, newPassword)
    } catch (error) {
      log.error('Change password failed:', error)
      return false
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser
  }

  hasPermission(permission: string): boolean {
    if (!this.currentUser) {
      return false
    }

    // Admin has all permissions
    if (this.currentUser.roleId === ROLE_IDS.ADMIN) {
      return true
    }

    // Check if user has the specific permission
    // Permission format in DB: "resource.action" (e.g., "product.create")
    if (this.currentUser.permissions && Array.isArray(this.currentUser.permissions)) {
      // Parse permissions if they're stored as JSON string
      let permissions = this.currentUser.permissions
      if (typeof permissions === 'string') {
        try {
          permissions = JSON.parse(permissions)
        } catch (error) {
          log.error('Failed to parse user permissions:', error)
          return false
        }
      }

      return permissions.some((p: any) => {
        if (!p || !p.resource || !p.action) {
          return false
        }
        const permissionString = `${p.resource}.${p.action}`
        return permissionString === permission
      })
    }

    return false
  }
}

export default new AuthService()
