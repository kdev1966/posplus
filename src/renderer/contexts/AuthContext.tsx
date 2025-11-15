import React, { createContext, useState, useContext, useEffect } from 'react';
import { UserSafe, AuthSession } from '@shared/types/models';
import { ipcClient } from '../api/client';
import { UserContracts } from '../../main/ipc/contracts/user.contract';

interface AuthContextType {
  user: UserSafe | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSafe | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      validateSession(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateSession = async (sessionToken: string) => {
    try {
      const validatedUser = await ipcClient.invoke<UserSafe | null>(
        UserContracts.ValidateSession.channel,
        { token: sessionToken }
      );

      if (validatedUser) {
        setUser(validatedUser);
        setToken(sessionToken);
      } else {
        localStorage.removeItem('auth_token');
      }
    } catch (error) {
      console.error('Session validation failed:', error);
      localStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const session = await ipcClient.invoke<AuthSession>(UserContracts.Login.channel, {
        username,
        password,
      });

      setUser(session.user);
      setToken(session.token);
      localStorage.setItem('auth_token', session.token);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await ipcClient.invoke(UserContracts.Logout.channel, { token });
      }
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('auth_token');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
