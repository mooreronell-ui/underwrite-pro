import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { supabase } from './supabaseClient';

// Prefer the established BASE_URL, but accept API_URL as a fallback for robustness.
const API_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  console.error("API base URL is missing. Set NEXT_PUBLIC_API_BASE_URL or NEXT_PUBLIC_API_URL.");
}

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token refresh lock to prevent multiple simultaneous refreshes
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

// Request interceptor to add Supabase JWT token with automatic refresh
apiClient.interceptors.request.use(
  async (config) => {
    if (typeof window !== 'undefined') {
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          console.error('[API Client] No valid session');
          return config;
        }

        // Check if token is about to expire (within 5 minutes)
        const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        if (expiresAt - now < fiveMinutes) {
          console.log('[API Client] Token expiring soon, refreshing...');
          
          // If already refreshing, wait for it
          if (isRefreshing) {
            const token = await new Promise<string>((resolve) => {
              subscribeTokenRefresh((token: string) => {
                resolve(token);
              });
            });
            config.headers.Authorization = `Bearer ${token}`;
            return config;
          }

          isRefreshing = true;

          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          isRefreshing = false;

          if (refreshError || !refreshData.session) {
            console.error('[API Client] Token refresh failed:', refreshError);
            return config;
          }

          const newToken = refreshData.session.access_token;
          localStorage.setItem('auth_token', newToken);
          onTokenRefreshed(newToken);
          config.headers.Authorization = `Bearer ${newToken}`;
        } else {
          // Token is still valid
          config.headers.Authorization = `Bearer ${session.access_token}`;
        }
      } catch (error) {
        console.error('[API Client] Error in request interceptor:', error);
        // Fallback to stored token
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    }
    return config;
  },
  (error) => {
    isRefreshing = false;
    return Promise.reject(error);
  }
);

// Response interceptor for error handling with retry on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    // If 401 and haven't retried yet, try refreshing token
    if (error.response?.status === 401 && !originalRequest._retry && typeof window !== 'undefined') {
      originalRequest._retry = true;
      
      try {
        console.log('[API Client] 401 error, attempting token refresh...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          throw new Error('Token refresh failed');
        }
        
        const newToken = refreshData.session.access_token;
        localStorage.setItem('auth_token', newToken);
        
        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear session and redirect to login
        console.error('[API Client] Token refresh failed, logging out');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        await supabase.auth.signOut();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// API methods
export const api = {
  // Deals
  getDeals: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get('/api/deals', { params }),
  
  getDealById: (id: string) =>
    apiClient.get(`/api/deals/${id}`),
  
  createDeal: (data: any) =>
    apiClient.post('/api/deals', data),
  
  updateDeal: (id: string, data: any) =>
    apiClient.put(`/api/deals/${id}`, data),
  
  // Underwriting
  runUnderwriting: (data: { deal_id: string }) =>
    apiClient.post('/api/underwriting/run', data),
  
  getUnderwritingById: (id: string) =>
    apiClient.get(`/api/underwriting/${id}`),
  
  getUnderwritingByDealId: (dealId: string) =>
    apiClient.get(`/api/underwriting/deal/${dealId}`),
  
  // Term Sheets
  createTermSheet: (data: any) =>
    apiClient.post('/api/term-sheets', data),
  
  getTermSheetById: (id: string) =>
    apiClient.get(`/api/term-sheets/${id}`),
  
  getTermSheetsByDealId: (dealId: string) =>
    apiClient.get(`/api/term-sheets/deal/${dealId}`),
  
  // Organizations
  getOrgUsers: (orgId: string) =>
    apiClient.get(`/api/orgs/${orgId}/users`),
};

export default apiClient;
