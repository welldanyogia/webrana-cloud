import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

/**
 * Base URL for client-side API calls
 * Note: Internal API calls are now handled via server-side API routes at /api/admin/*
 * to protect the INTERNAL_API_KEY from client bundle exposure (SEC-001 fix)
 */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

/**
 * Axios instance configured with base URL and interceptors
 * Used for public API calls to external services (API gateway)
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

/**
 * Axios instance for local Next.js API routes (no baseURL)
 * Used for admin API routes that proxy to internal services
 */
export const localApiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

/**
 * Get token from localStorage (client-side only)
 */
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const authStorage = localStorage.getItem('admin-auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return parsed?.state?.token || null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Clear auth data from localStorage
 */
function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('admin-auth-storage');
}

/**
 * Request interceptor - adds JWT token to headers
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - handles 401 errors
 */
const handleUnauthorized = (error: AxiosError) => {
  if (error.response?.status === 401) {
    // Clear auth data
    clearAuth();
    
    // Redirect to login (only on client-side)
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      // Don't redirect if already on auth pages
      if (!currentPath.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
  }
  return Promise.reject(error);
};

apiClient.interceptors.response.use((response) => response, handleUnauthorized);

/**
 * Request interceptor for local API - adds JWT token to headers
 */
localApiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

localApiClient.interceptors.response.use((response) => response, handleUnauthorized);

export default apiClient;
