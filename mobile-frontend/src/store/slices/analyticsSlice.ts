import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { analyticsApi } from "../../services/api";
import type { AnalyticsMetric } from "../../types";

interface AnalyticsState {
  dashboardMetrics: Record<string, any>;
  transactionAnalytics: Record<string, any>;
  revenueAnalytics: Record<string, any>;
  customMetrics: Record<string, AnalyticsMetric>;
  isLoading: boolean;
  error: string | null;
}

const initialState: AnalyticsState = {
  dashboardMetrics: {},
  transactionAnalytics: {},
  revenueAnalytics: {},
  customMetrics: {},
  isLoading: false,
  error: null,
};

export const fetchDashboardMetrics = createAsyncThunk(
  "analytics/fetchDashboardMetrics",
  async (_, { rejectWithValue }) => {
    try {
      const response = await analyticsApi.getDashboardMetrics();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "Failed to fetch dashboard metrics",
      );
    }
  },
);

export const fetchTransactionAnalytics = createAsyncThunk(
  "analytics/fetchTransactionAnalytics",
  async (
    { startDate, endDate }: { startDate?: string; endDate?: string } = {},
    { rejectWithValue },
  ) => {
    try {
      const response = await analyticsApi.getTransactionAnalytics(
        startDate,
        endDate,
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "Failed to fetch transaction analytics",
      );
    }
  },
);

export const fetchRevenueAnalytics = createAsyncThunk(
  "analytics/fetchRevenueAnalytics",
  async (
    period: "daily" | "weekly" | "monthly" | "yearly" = "monthly",
    { rejectWithValue },
  ) => {
    try {
      const response = await analyticsApi.getRevenueAnalytics(period);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "Failed to fetch revenue analytics",
      );
    }
  },
);

export const fetchCustomMetric = createAsyncThunk(
  "analytics/fetchCustomMetric",
  async (
    { metricId, params }: { metricId: string; params?: any },
    { rejectWithValue },
  ) => {
    try {
      const response = await analyticsApi.getCustomMetric(metricId, params);
      return { id: metricId, data: response.data };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch custom metric");
    }
  },
);

const analyticsSlice = createSlice({
  name: "analytics",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Dashboard Metrics
    builder.addCase(fetchDashboardMetrics.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      fetchDashboardMetrics.fulfilled,
      (state, action: PayloadAction<Record<string, any>>) => {
        state.isLoading = false;
        state.dashboardMetrics = action.payload;
      },
    );
    builder.addCase(fetchDashboardMetrics.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch Transaction Analytics
    builder.addCase(fetchTransactionAnalytics.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      fetchTransactionAnalytics.fulfilled,
      (state, action: PayloadAction<Record<string, any>>) => {
        state.isLoading = false;
        state.transactionAnalytics = action.payload;
      },
    );
    builder.addCase(fetchTransactionAnalytics.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch Revenue Analytics
    builder.addCase(fetchRevenueAnalytics.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      fetchRevenueAnalytics.fulfilled,
      (state, action: PayloadAction<Record<string, any>>) => {
        state.isLoading = false;
        state.revenueAnalytics = action.payload;
      },
    );
    builder.addCase(fetchRevenueAnalytics.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch Custom Metric
    builder.addCase(fetchCustomMetric.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      fetchCustomMetric.fulfilled,
      (state, action: PayloadAction<{ id: string; data: AnalyticsMetric }>) => {
        state.isLoading = false;
        state.customMetrics = {
          ...state.customMetrics,
          [action.payload.id]: action.payload.data,
        };
      },
    );
    builder.addCase(fetchCustomMetric.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearError } = analyticsSlice.actions;
export default analyticsSlice.reducer;
