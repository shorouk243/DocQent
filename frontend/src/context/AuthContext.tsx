import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, login as loginAPI, register as registerAPI, getCurrentUser } from '../api/auth';
import { setAccessToken, clearAccessToken, getAccessToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'collaborative_docs_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedToken = getAccessToken();
        if (savedToken) {
          try {
            const fullUser = await getCurrentUser();
            setUser(fullUser);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fullUser));
          } catch (error) {
            localStorage.removeItem(USER_STORAGE_KEY);
            clearAccessToken();
          }
        } else {
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      } catch (error) {
        localStorage.removeItem(USER_STORAGE_KEY);
        clearAccessToken();
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    try {
      const response = await loginAPI({ username, password });
      setAccessToken(response.access_token);
      const fullUser = await getCurrentUser();
      setUser(fullUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fullUser));
    } catch (error: any) {
      clearAccessToken();
      const errorMessage = error.response?.data?.detail || 'Login failed';
      throw new Error(errorMessage);
    }
  };

  const register = async (username: string, email: string, password: string): Promise<void> => {
    try {
      await registerAPI({ username, email, password });
      await login(username, password);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Registration failed';
      throw new Error(errorMessage);
    }
  };

  const logout = (): void => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    clearAccessToken();
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
