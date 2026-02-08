import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, login as loginAPI, register as registerAPI, getUser } from '../api/auth';

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

/**
 * AuthContext Provider
 * 
 * Manages authentication state and provides auth methods to the app.
 * 
 * AUTH FLOW:
 * 1. On mount: Check localStorage for saved user
 * 2. If user exists: Fetch full user details from backend
 * 3. Login/Register: Save user to state and localStorage
 * 4. Logout: Clear state and localStorage
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedUser = localStorage.getItem(USER_STORAGE_KEY);
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          // Fetch fresh user data from backend
          try {
            const fullUser = await getUser(userData.id);
            setUser(fullUser);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fullUser));
          } catch (error) {
            // User might not exist anymore, clear storage
            console.error('Failed to fetch user:', error);
            localStorage.removeItem(USER_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        localStorage.removeItem(USER_STORAGE_KEY);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Login function
  const login = async (username: string, password: string): Promise<void> => {
    try {
      const response = await loginAPI({ username, password });
      // Fetch full user details
      const fullUser = await getUser(response.user_id);
      setUser(fullUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fullUser));
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Login failed';
      throw new Error(errorMessage);
    }
  };

  // Register function
  const register = async (username: string, email: string, password: string): Promise<void> => {
    try {
      const newUser = await registerAPI({ username, email, password });
      setUser(newUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Registration failed';
      throw new Error(errorMessage);
    }
  };

  // Logout function
  const logout = (): void => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
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

/**
 * Hook to use AuthContext
 * Throws error if used outside AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

