import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { BaseRepository } from './base.repository';
import { User, UserSafe, CreateUserInput, UpdateUserInput } from '@shared/types/models';

const SALT_ROUNDS = 10;

export class UserRepository extends BaseRepository<User> {
  protected tableName = 'users';

  constructor() {
    super('UserRepository');
  }

  /**
   * Get all users (without passwords)
   */
  getAllSafe(): UserSafe[] {
    const users = this.findAll();
    return users.map(this.toSafeUser);
  }

  /**
   * Get user by username
   */
  getByUsername(username: string): User | null {
    return this.findOne('username = ?', [username]);
  }

  /**
   * Create new user
   */
  async createUser(input: CreateUserInput): Promise<UserSafe> {
    const now = new Date().toISOString();
    const password_hash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const user = {
      id: uuidv4(),
      username: input.username,
      password_hash,
      full_name: input.full_name,
      role: input.role,
      is_active: input.is_active !== undefined ? (input.is_active ? 1 : 0) : 1,
      created_at: now,
      updated_at: now,
    };

    const created = this.insert(user);
    return this.toSafeUser(created);
  }

  /**
   * Update user
   */
  async updateUser(id: string, input: UpdateUserInput): Promise<UserSafe> {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.username !== undefined) updates.username = input.username;
    if (input.full_name !== undefined) updates.full_name = input.full_name;
    if (input.role !== undefined) updates.role = input.role;
    if (input.is_active !== undefined) updates.is_active = input.is_active ? 1 : 0;
    if (input.password !== undefined) {
      updates.password_hash = await bcrypt.hash(input.password, SALT_ROUNDS);
    }

    const updated = this.update(id, updates);
    return this.toSafeUser(updated);
  }

  /**
   * Verify user password
   */
  async verifyPassword(username: string, password: string): Promise<User | null> {
    const user = this.getByUsername(username);
    if (!user || !user.is_active) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    return isValid ? user : null;
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    const user = this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid old password');
    }

    const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    this.update(userId, {
      password_hash,
      updated_at: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Convert User to UserSafe (remove password)
   */
  private toSafeUser(user: User): UserSafe {
    const { password_hash, ...safeUser } = user;
    return {
      ...safeUser,
      is_active: Boolean(user.is_active),
    };
  }

  /**
   * Get safe user by ID
   */
  getSafeById(id: string): UserSafe | null {
    const user = this.findById(id);
    return user ? this.toSafeUser(user) : null;
  }
}
