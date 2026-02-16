import apiClient from './client';

export interface User {
  id: number;
  username: string;
  email: string;
  created_at?: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  access_token: string;
  token_type: string;
}

/**
 * Authentication API service
 * Handles user registration and login
 */

// Register a new user
export const register = async (data: RegisterData): Promise<User> => {
  const response = await apiClient.post<User>('/users/register', data);
  return response.data;
};

// Login user
export const login = async (data: LoginData): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/users/login', data);
  return response.data;
};

// Get current authenticated user
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<User>('/users/me');
  return response.data;
};
