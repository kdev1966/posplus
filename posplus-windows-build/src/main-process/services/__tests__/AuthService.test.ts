import AuthService from '../auth/AuthService'
import DatabaseService from '../database/db'

describe('AuthService', () => {
  beforeAll(() => {
    DatabaseService.getInstance().initialize()
  })

  afterAll(() => {
    DatabaseService.getInstance().close()
  })

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const result = await AuthService.login({
        username: 'admin',
        password: 'admin123',
      })

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user?.username).toBe('admin')
    })

    it('should fail with invalid credentials', async () => {
      const result = await AuthService.login({
        username: 'admin',
        password: 'wrongpassword',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should fail with non-existent user', async () => {
      const result = await AuthService.login({
        username: 'nonexistent',
        password: 'password',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('checkAuth', () => {
    it('should return user if authenticated', async () => {
      await AuthService.login({
        username: 'admin',
        password: 'admin123',
      })

      const result = await AuthService.checkAuth()
      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
    })

    it('should fail if not authenticated', async () => {
      await AuthService.logout()
      const result = await AuthService.checkAuth()
      expect(result.success).toBe(false)
    })
  })

  describe('logout', () => {
    it('should logout successfully', async () => {
      await AuthService.login({
        username: 'admin',
        password: 'admin123',
      })

      await AuthService.logout()
      const user = AuthService.getCurrentUser()
      expect(user).toBeNull()
    })
  })
})
