import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add Supabase JWT token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      // Get Supabase access token
      const token = localStorage.getItem('up_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Unauthorized - clear Supabase session and redirect to login
      localStorage.removeItem('up_token');
      localStorage.removeItem('up_user');
      window.location.href = '/login';
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
