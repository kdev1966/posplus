import { UserService } from '../../services/user.service';
import { UserContracts } from '../contracts';
import { createIPCHandler } from '../index';

const userService = new UserService();

/**
 * Register user IPC handlers
 */
export function registerUserHandlers(): void {
  // Get all users
  createIPCHandler(UserContracts.GetAll.channel, async () => {
    return userService.getAll();
  });

  // Get user by ID
  createIPCHandler(UserContracts.GetById.channel, async (request: { id: string }) => {
    return userService.getById(request.id);
  });

  // Create user
  createIPCHandler(UserContracts.Create.channel, async (request: any) => {
    return userService.create(request);
  });

  // Update user
  createIPCHandler(
    UserContracts.Update.channel,
    async (request: { id: string; data: any }) => {
      return userService.update(request.id, request.data);
    }
  );

  // Delete user
  createIPCHandler(UserContracts.Delete.channel, async (request: { id: string }) => {
    return userService.delete(request.id);
  });

  // Login
  createIPCHandler(
    UserContracts.Login.channel,
    async (request: { username: string; password: string }) => {
      return userService.login(request);
    }
  );

  // Logout
  createIPCHandler(UserContracts.Logout.channel, async (request: { token: string }) => {
    return userService.logout(request.token);
  });

  // Validate session
  createIPCHandler(
    UserContracts.ValidateSession.channel,
    async (request: { token: string }) => {
      return userService.validateSession(request.token);
    }
  );

  // Change password
  createIPCHandler(
    UserContracts.ChangePassword.channel,
    async (request: { oldPassword: string; newPassword: string; userId: string }) => {
      return userService.changePassword(request.userId, request.oldPassword, request.newPassword);
    }
  );
}
