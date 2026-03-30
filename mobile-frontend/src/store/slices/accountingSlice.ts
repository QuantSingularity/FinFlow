import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { accountingApi } from "../../services/api";
import type { AccountingEntry } from "../../types";

interface AccountingState {
  journalEntries: AccountingEntry[];
  balanceSheet: Record<string, any> | null;
  incomeStatement: Record<string, any> | null;
  cashFlowStatement: Record<string, any> | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AccountingState = {
  journalEntries: [],
  balanceSheet: null,
  incomeStatement: null,
  cashFlowStatement: null,
  isLoading: false,
  error: null,
};

export const fetchJournalEntries = createAsyncThunk(
  "accounting/fetchJournalEntries",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const response = await accountingApi.getJournalEntries(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "Failed to fetch journal entries",
      );
    }
  },
);

export const fetchBalanceSheet = createAsyncThunk(
  "accounting/fetchBalanceSheet",
  async (date?: string, { rejectWithValue }) => {
    try {
      const response = await accountingApi.getBalanceSheet(date);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch balance sheet");
    }
  },
);

export const fetchIncomeStatement = createAsyncThunk(
  "accounting/fetchIncomeStatement",
  async (
    { startDate, endDate }: { startDate?: string; endDate?: string } = {},
    { rejectWithValue },
  ) => {
    try {
      const response = await accountingApi.getIncomeStatement(
        startDate,
        endDate,
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "Failed to fetch income statement",
      );
    }
  },
);

export const fetchCashFlowStatement = createAsyncThunk(
  "accounting/fetchCashFlowStatement",
  async (
    { startDate, endDate }: { startDate?: string; endDate?: string } = {},
    { rejectWithValue },
  ) => {
    try {
      const response = await accountingApi.getCashFlowStatement(
        startDate,
        endDate,
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "Failed to fetch cash flow statement",
      );
    }
  },
);

const accountingSlice = createSlice({
  name: "accounting",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Journal Entries
    builder.addCase(fetchJournalEntries.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      fetchJournalEntries.fulfilled,
      (state, action: PayloadAction<AccountingEntry[]>) => {
        state.isLoading = false;
        state.journalEntries = action.payload;
      },
    );
    builder.addCase(fetchJournalEntries.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch Balance Sheet
    builder.addCase(fetchBalanceSheet.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      fetchBalanceSheet.fulfilled,
      (state, action: PayloadAction<Record<string, any>>) => {
        state.isLoading = false;
        state.balanceSheet = action.payload;
      },
    );
    builder.addCase(fetchBalanceSheet.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch Income Statement
    builder.addCase(fetchIncomeStatement.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      fetchIncomeStatement.fulfilled,
      (state, action: PayloadAction<Record<string, any>>) => {
        state.isLoading = false;
        state.incomeStatement = action.payload;
      },
    );
    builder.addCase(fetchIncomeStatement.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch Cash Flow Statement
    builder.addCase(fetchCashFlowStatement.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      fetchCashFlowStatement.fulfilled,
      (state, action: PayloadAction<Record<string, any>>) => {
        state.isLoading = false;
        state.cashFlowStatement = action.payload;
      },
    );
    builder.addCase(fetchCashFlowStatement.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearError } = accountingSlice.actions;
export default accountingSlice.reducer;
