import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';
const ACCESS_TOKEN_STORAGE_KEY = 'collaborative_docs_access_token';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getAccessToken = (): string | null =>
  localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);

export const setAccessToken = (token: string): void => {
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
};

export const clearAccessToken = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
};

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
