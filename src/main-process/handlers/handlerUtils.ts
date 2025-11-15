/**
 * Utility functions for IPC handlers
 * Provides authentication and permission checking helpers
 */

import AuthService from '../services/auth/AuthService'
import log from 'electron-log'

/**
 * Ensures the user is authenticated
 * @throws Error if user is not authenticated
 */
export function requireAuth(): void {
  const user = AuthService.getCurrentUser()
  if (!user) {
    throw new Error('Not authenticated')
  }
}

/**
 * Ensures the user has a specific permission
 * @param permission - Permission string in format "resource.action" (e.g., "product.create")
 * @throws Error if user is not authenticated or lacks permission
 */
export function requirePermission(permission: string): void {
  requireAuth()

  if (!AuthService.hasPermission(permission)) {
    log.warn(`Permission denied: ${permission} for user ${AuthService.getCurrentUser()?.username}`)
    throw new Error(`Insufficient permissions: ${permission}`)
  }
}

/**
 * Gets the current authenticated user
 * @throws Error if user is not authenticated
 * @returns The current user
 */
export function getCurrentUser() {
  const user = AuthService.getCurrentUser()
  if (!user) {
    throw new Error('Not authenticated')
  }
  return user
}

/**
 * Wrapper for handler functions that require authentication
 * @param handler - The handler function to wrap
 * @returns Wrapped handler with auth check
 */
export function withAuth<T extends any[], R>(
  handler: (...args: T) => R | Promise<R>
) {
  return async (...args: T): Promise<R> => {
    requireAuth()
    return await handler(...args)
  }
}

/**
 * Wrapper for handler functions that require specific permission
 * @param permission - Permission string in format "resource.action"
 * @param handler - The handler function to wrap
 * @returns Wrapped handler with auth and permission check
 */
export function withPermission<T extends any[], R>(
  permission: string,
  handler: (...args: T) => R | Promise<R>
) {
  return async (...args: T): Promise<R> => {
    requirePermission(permission)
    return await handler(...args)
  }
}
