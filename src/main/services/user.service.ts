import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from '../repositories/user.repository';
import {
  UserSafe,
  CreateUserInput,
  UpdateUserInput,
  LoginCredentials,
  AuthSession,
} from '@shared/types/models';
import { Logger } from '../utils/logger';

interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
}

export class UserService {
  private userRepo: UserRepository;
  private logger: Logger;
  private sessions: Map<string, Session>;

  constructor() {
    this.userRepo = new UserRepository();
    this.logger = new Logger('UserService');
    this.sessions = new Map();
  }

  /**
   * Get all users
   */
  async getAll(): Promise<UserSafe[]> {
    return this.userRepo.getAllSafe();
  }

  /**
   * Get user by ID
   */
  async getById(id: string): Promise<UserSafe | null> {
    return this.userRepo.getSafeById(id);
  }

  /**
   * Create user
   */
  async create(input: CreateUserInput): Promise<UserSafe> {
    // Check username uniqueness
    const existing = this.userRepo.getByUsername(input.username);
    if (existing) {
      throw new Error('Ce nom d\'utilisateur existe déjà');
    }

    const user = await this.userRepo.createUser(input);
    this.logger.info(`User created: ${user.username} (${user.role})`);

    return user;
  }

  /**
   * Update user
   */
  async update(id: string, input: UpdateUserInput): Promise<UserSafe> {
    const existing = this.userRepo.findById(id);
    if (!existing) {
      throw new Error('Utilisateur non trouvé');
    }

    // Check username uniqueness if changed
    if (input.username && input.username !== existing.username) {
      const duplicate = this.userRepo.getByUsername(input.username);
      if (duplicate) {
        throw new Error('Ce nom d\'utilisateur existe déjà');
      }
    }

    const user = await this.userRepo.updateUser(id, input);
    this.logger.info(`User updated: ${user.username}`);

    return user;
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<boolean> {
    const user = this.userRepo.findById(id);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    const deleted = this.userRepo.delete(id);
    if (deleted) {
      this.logger.info(`User deleted: ${user.username}`);
      // Invalidate all sessions for this user
      this.invalidateUserSessions(id);
    }

    return deleted;
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const user = await this.userRepo.verifyPassword(credentials.username, credentials.password);

    if (!user) {
      this.logger.warn(`Failed login attempt for: ${credentials.username}`);
      throw new Error('Nom d\'utilisateur ou mot de passe incorrect');
    }

    // Create session
    const token = uuidv4();
    const expires_at = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    const session: Session = {
      id: uuidv4(),
      user_id: user.id,
      token,
      expires_at,
    };

    this.sessions.set(token, session);

    this.logger.info(`User logged in: ${user.username}`);

    const { password_hash, ...safeUser } = user;

    return {
      token,
      user: { ...safeUser, is_active: Boolean(user.is_active) },
      expires_at,
    };
  }

  /**
   * Logout user
   */
  async logout(token: string): Promise<boolean> {
    const session = this.sessions.get(token);
    if (session) {
      this.sessions.delete(token);
      this.logger.info(`User logged out: ${session.user_id}`);
      return true;
    }
    return false;
  }

  /**
   * Validate session
   */
  async validateSession(token: string): Promise<UserSafe | null> {
    const session = this.sessions.get(token);
    if (!session) {
      return null;
    }

    // Check expiration
    if (new Date(session.expires_at) < new Date()) {
      this.sessions.delete(token);
      return null;
    }

    return this.userRepo.getSafeById(session.user_id);
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const result = await this.userRepo.changePassword(userId, oldPassword, newPassword);
    if (result) {
      this.logger.info(`Password changed for user: ${userId}`);
    }
    return result;
  }

  /**
   * Invalidate all sessions for a user
   */
  private invalidateUserSessions(userId: string): void {
    for (const [token, session] of this.sessions.entries()) {
      if (session.user_id === userId) {
        this.sessions.delete(token);
      }
    }
  }

  /**
   * Get user from token
   */
  async getUserFromToken(token: string): Promise<UserSafe | null> {
    return this.validateSession(token);
  }
}
