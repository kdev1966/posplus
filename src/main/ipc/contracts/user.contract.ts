import {
  User,
  UserSafe,
  CreateUserInput,
  UpdateUserInput,
  LoginCredentials,
  AuthSession,
} from '@shared/types/models';
import { IPCContract } from './base.contract';

export const UserContracts = {
  GetAll: {
    channel: 'user:getAll',
  } as IPCContract<void, UserSafe[]>,

  GetById: {
    channel: 'user:getById',
  } as IPCContract<{ id: string }, UserSafe | null>,

  Create: {
    channel: 'user:create',
  } as IPCContract<CreateUserInput, UserSafe>,

  Update: {
    channel: 'user:update',
  } as IPCContract<{ id: string; data: UpdateUserInput }, UserSafe>,

  Delete: {
    channel: 'user:delete',
  } as IPCContract<{ id: string }, boolean>,

  Login: {
    channel: 'user:login',
  } as IPCContract<LoginCredentials, AuthSession>,

  Logout: {
    channel: 'user:logout',
  } as IPCContract<void, boolean>,

  ValidateSession: {
    channel: 'user:validateSession',
  } as IPCContract<{ token: string }, UserSafe | null>,

  ChangePassword: {
    channel: 'user:changePassword',
  } as IPCContract<{ oldPassword: string; newPassword: string }, boolean>,
};
