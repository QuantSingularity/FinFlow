import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from "axios";
import Constants from "expo-constants";
import type { ApiError, ApiResponse } from "../types";

// Base API configuration
// For Android emulator, use 10.0.2.2 instead of localhost
// For iOS simulator, localhost works fine
const getApiUrl = () => {
  // Try to get from environment or config
  const envApiUrl = Constants.expoConfig?.extra?.apiUrl;

  if (envApiUrl) {
    return envApiUrl;
  }

  // Default fallback
  return "http://localhost:8080";
};

const API_URL = getApiUrl();
const API_TIMEOUT = 30000; // 30 seconds

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      timeout: API_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    // Request interceptor for adding auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem("auth_token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const apiError: ApiError = {
          message: error.message || "An unexpected error occurred",
          status: error.response?.status || 500,
        };

        if (error.response?.data) {
          apiError.message =
            (error.response.data as any).message || apiError.message;
          apiError.errors = (error.response.data as any).errors;
        }

        // Handle 401 Unauthorized errors (token expired)
        if (error.response?.status === 401) {
          // Clear stored credentials
          AsyncStorage.removeItem("auth_token");
          AsyncStorage.removeItem("user");
          // You could also dispatch a logout action here if using Redux
        }

        return Promise.reject(apiError);
      },
    );
  }

  // Generic request method
  private async request<T>(
    config: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.api.request<T>(config);
    return {
      data: response.data,
      status: response.status,
      message: response.statusText,
    };
  }

  // HTTP methods
  async get<T>(url: string, params?: any): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "GET", url, params });
  }

  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "POST", url, data });
  }

  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "PUT", url, data });
  }

  async patch<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "PATCH", url, data });
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "DELETE", url });
  }

  // Set base URL (useful for environment switching)
  setBaseUrl(url: string): void {
    this.api.defaults.baseURL = url;
  }

  // Set default headers
  setHeaders(headers: Record<string, string>): void {
    Object.entries(headers).forEach(([key, value]) => {
      this.api.defaults.headers.common[key] = value;
    });
  }

  // Get current base URL
  getBaseUrl(): string {
    return this.api.defaults.baseURL || API_URL;
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();

// Service-specific API modules
export const authApi = {
  login: (email: string, password: string) =>
    apiService.post("/api/auth/login", { email, password }),

  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) =>
    apiService.post("/api/auth/register", {
      email,
      password,
      firstName,
      lastName,
    }),

  forgotPassword: (email: string) =>
    apiService.post("/api/auth/forgot-password", { email }),

  resetPassword: (token: string, password: string) =>
    apiService.post("/api/auth/reset-password", { token, password }),

  verifyEmail: (token: string) =>
    apiService.post("/api/auth/verify-email", { token }),

  refreshToken: (refreshToken: string) =>
    apiService.post("/api/auth/refresh-token", { refreshToken }),

  getProfile: () => apiService.get("/api/auth/profile"),

  updateProfile: (
    data: Partial<{ firstName: string; lastName: string; email: string }>,
  ) => apiService.put("/api/auth/profile", data),
};

export const paymentsApi = {
  createPayment: (paymentData: any) =>
    apiService.post("/api/payments", paymentData),

  getPayments: (params?: any) => apiService.get("/api/payments", params),

  getPayment: (id: string) => apiService.get(`/api/payments/${id}`),

  refundPayment: (id: string, amount?: number) =>
    apiService.post(`/api/payments/${id}/refund`, { amount }),
};

export const accountingApi = {
  getJournalEntries: (params?: any) =>
    apiService.get("/api/accounting/journal-entries", params),

  getBalanceSheet: (date?: string) =>
    apiService.get("/api/accounting/balance-sheet", { date }),

  getIncomeStatement: (startDate?: string, endDate?: string) =>
    apiService.get("/api/accounting/income-statement", { startDate, endDate }),

  getCashFlowStatement: (startDate?: string, endDate?: string) =>
    apiService.get("/api/accounting/cash-flow", { startDate, endDate }),
};

export const analyticsApi = {
  getDashboardMetrics: () => apiService.get("/api/analytics/dashboard"),

  getTransactionAnalytics: (startDate?: string, endDate?: string) =>
    apiService.get("/api/analytics/transactions", { startDate, endDate }),

  getRevenueAnalytics: (period?: "daily" | "weekly" | "monthly" | "yearly") =>
    apiService.get("/api/analytics/revenue", { period }),

  getCustomMetric: (metricId: string, params?: any) =>
    apiService.get(`/api/analytics/metrics/${metricId}`, params),
};

export const creditApi = {
  getCreditScore: (userId?: string) =>
    apiService.get("/api/credit/score", { userId }),

  applyForLoan: (loanData: any) =>
    apiService.post("/api/credit/loans", loanData),

  getLoans: (params?: any) => apiService.get("/api/credit/loans", params),

  getLoan: (id: string) => apiService.get(`/api/credit/loans/${id}`),

  makePayment: (loanId: string, amount: number) =>
    apiService.post(`/api/credit/loans/${loanId}/payments`, { amount }),
};
