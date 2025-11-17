import UserRepository from '../database/repositories/UserRepository'
import { User, LoginCredentials, AuthResponse } from '@shared/types'
import { ROLE_IDS } from '@shared/constants'
import log from 'electron-log'

class AuthService {
  private currentUser: User | null = null

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
      log.info(`User logged in successfully: ${user.username} (ID: ${user.id})`)

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
    if (this.currentUser) {
      // Refresh user data
      const user = UserRepository.findById(this.currentUser.id)
      if (user && user.isActive) {
        this.currentUser = user
        return {
          success: true,
          user,
        }
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
