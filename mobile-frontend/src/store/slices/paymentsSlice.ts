import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { paymentsApi } from "../../services/api";
import type {
  PaginatedResponse,
  PaymentRequest,
  Transaction,
} from "../../types";

interface PaymentsState {
  transactions: Transaction[];
  currentTransaction: Transaction | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const initialState: PaymentsState = {
  transactions: [],
  currentTransaction: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
};

export const fetchTransactions = createAsyncThunk(
  "payments/fetchTransactions",
  async (
    params: { page?: number; limit?: number } = {},
    { rejectWithValue },
  ) => {
    try {
      const response = await paymentsApi.getPayments(params);
      return response.data as PaginatedResponse<Transaction>;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch transactions");
    }
  },
);

export const fetchTransactionById = createAsyncThunk(
  "payments/fetchTransactionById",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await paymentsApi.getPayment(id);
      return response.data as Transaction;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch transaction");
    }
  },
);

export const createPayment = createAsyncThunk(
  "payments/createPayment",
  async (paymentData: PaymentRequest, { rejectWithValue }) => {
    try {
      const response = await paymentsApi.createPayment(paymentData);
      return response.data as Transaction;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to create payment");
    }
  },
);

export const refundPayment = createAsyncThunk(
  "payments/refundPayment",
  async (
    { id, amount }: { id: string; amount?: number },
    { rejectWithValue },
  ) => {
    try {
      const response = await paymentsApi.refundPayment(id, amount);
      return response.data as Transaction;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to refund payment");
    }
  },
);

const paymentsSlice = createSlice({
  name: "payments",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentTransaction: (state) => {
      state.currentTransaction = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Transactions
    builder.addCase(fetchTransactions.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      fetchTransactions.fulfilled,
      (state, action: PayloadAction<PaginatedResponse<Transaction>>) => {
        state.isLoading = false;
        state.transactions = action.payload.data;
        state.pagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        };
      },
    );
    builder.addCase(fetchTransactions.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch Transaction By Id
    builder.addCase(fetchTransactionById.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      fetchTransactionById.fulfilled,
      (state, action: PayloadAction<Transaction>) => {
        state.isLoading = false;
        state.currentTransaction = action.payload;
      },
    );
    builder.addCase(fetchTransactionById.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Create Payment
    builder.addCase(createPayment.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      createPayment.fulfilled,
      (state, action: PayloadAction<Transaction>) => {
        state.isLoading = false;
        state.currentTransaction = action.payload;
        state.transactions = [action.payload, ...state.transactions];
      },
    );
    builder.addCase(createPayment.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Refund Payment
    builder.addCase(refundPayment.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      refundPayment.fulfilled,
      (state, action: PayloadAction<Transaction>) => {
        state.isLoading = false;
        state.currentTransaction = action.payload;
        state.transactions = state.transactions.map((transaction) =>
          transaction.id === action.payload.id ? action.payload : transaction,
        );
      },
    );
    builder.addCase(refundPayment.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearError, clearCurrentTransaction } = paymentsSlice.actions;
export default paymentsSlice.reducer;
