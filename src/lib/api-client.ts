import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface RequestConfig extends RequestInit {
  requiresAuth?: boolean;
  params?: Record<string, string | number | boolean>;
}

class APIClient {
  private baseURL: string;
  private abortControllers: Map<string, AbortController>;
  private pendingRequests: Map<string, Promise<any>>;
  private tokenCache: { token: string | null; expiresAt: number } = { token: null, expiresAt: 0 };

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.abortControllers = new Map();
    this.pendingRequests = new Map();
  }

  private async getAuthToken(): Promise<string | null> {
    const now = Date.now();

    if (this.tokenCache.token && this.tokenCache.expiresAt > now) {
      return this.tokenCache.token;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      this.tokenCache.token = session.access_token;
      this.tokenCache.expiresAt = now + 3600000;
    } else {
      this.tokenCache.token = null;
      this.tokenCache.expiresAt = 0;
    }

    return this.tokenCache.token;
  }

  clearTokenCache() {
    this.tokenCache = { token: null, expiresAt: 0 };
  }

  private buildURL(endpoint: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(`${this.baseURL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    return url.toString();
  }

  private getRequestKey(method: string, url: string, body?: any): string {
    return `${method}:${url}:${body ? JSON.stringify(body) : ''}`;
  }

  async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      requiresAuth = true,
      params,
      signal,
      ...fetchConfig
    } = config;

    const url = this.buildURL(endpoint, params);
    const method = fetchConfig.method || 'GET';
    const requestKey = this.getRequestKey(method, url, fetchConfig.body);

    if (method === 'GET' && this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey);
    }

    const controller = new AbortController();
    const controllerKey = `${Date.now()}-${Math.random()}`;
    this.abortControllers.set(controllerKey, controller);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchConfig.headers,
    };

    if (requiresAuth) {
      const token = await this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.warn(`[APIClient] No auth token available for ${method} ${endpoint}`);
      }
    }

    console.log(`[APIClient] ${method} ${endpoint}`);

    const requestPromise = fetch(url, {
      ...fetchConfig,
      headers,
      signal: signal || controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
          console.error(`[APIClient] Request failed for ${method} ${endpoint}:`, errorMessage);

          if (response.status === 403) {
            if (errorMessage.includes('Alpaca account') || errorMessage.includes('brokerage account')) {
              const error = new Error('Please connect your Alpaca brokerage account in the Accounts page to access market data and trading features.');
              (error as any).isAuthError = true;
              (error as any).requiresAccountConnection = true;
              throw error;
            }
          }

          if (response.status === 401) {
            const error = new Error('Your session has expired. Please log in again.');
            (error as any).isAuthError = true;
            (error as any).requiresLogin = true;
            throw error;
          }

          throw new Error(errorMessage);
        }
        return response.json();
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          console.log(`[APIClient] Request aborted for ${method} ${endpoint}`);
          throw error;
        }
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.error(`[APIClient] Network error for ${method} ${endpoint}:`, error.message);
          throw new Error('Network error: Unable to connect to the server. Please check your connection.');
        }
        throw error;
      })
      .finally(() => {
        this.abortControllers.delete(controllerKey);
        if (method === 'GET') {
          this.pendingRequests.delete(requestKey);
        }
      });

    if (method === 'GET') {
      this.pendingRequests.set(requestKey, requestPromise);
    }

    return requestPromise;
  }

  get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  patch<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  abortAll() {
    this.abortControllers.forEach((controller) => controller.abort());
    this.abortControllers.clear();
    this.pendingRequests.clear();
  }

  abortRequest(controllerKey: string) {
    const controller = this.abortControllers.get(controllerKey);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(controllerKey);
    }
  }
}

export const apiClient = new APIClient(API_BASE_URL);
