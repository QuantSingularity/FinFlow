import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { creditApi } from "../../services/api";
import type { CreditScore, Loan } from "../../types";

interface CreditState {
  creditScore: CreditScore | null;
  loans: Loan[];
  currentLoan: Loan | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CreditState = {
  creditScore: null,
  loans: [],
  currentLoan: null,
  isLoading: false,
  error: null,
};

export const fetchCreditScore = createAsyncThunk(
  "credit/fetchCreditScore",
  async (userId?: string, { rejectWithValue }) => {
    try {
      const response = await creditApi.getCreditScore(userId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch credit score");
    }
  },
);

export const fetchLoans = createAsyncThunk(
  "credit/fetchLoans",
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const response = await creditApi.getLoans(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch loans");
    }
  },
);

export const fetchLoanById = createAsyncThunk(
  "credit/fetchLoanById",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await creditApi.getLoan(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch loan");
    }
  },
);

export const applyForLoan = createAsyncThunk(
  "credit/applyForLoan",
  async (loanData: any, { rejectWithValue }) => {
    try {
      const response = await creditApi.applyForLoan(loanData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to apply for loan");
    }
  },
);

export const makeLoanPayment = createAsyncThunk(
  "credit/makeLoanPayment",
  async (
    { loanId, amount }: { loanId: string; amount: number },
    { rejectWithValue },
  ) => {
    try {
      const response = await creditApi.makePayment(loanId, amount);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to make loan payment");
    }
  },
);

const creditSlice = createSlice({
  name: "credit",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentLoan: (state) => {
      state.currentLoan = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Credit Score
    builder.addCase(fetchCreditScore.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      fetchCreditScore.fulfilled,
      (state, action: PayloadAction<CreditScore>) => {
        state.isLoading = false;
        state.creditScore = action.payload;
      },
    );
    builder.addCase(fetchCreditScore.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch Loans
    builder.addCase(fetchLoans.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      fetchLoans.fulfilled,
      (state, action: PayloadAction<Loan[]>) => {
        state.isLoading = false;
        state.loans = action.payload;
      },
    );
    builder.addCase(fetchLoans.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch Loan By Id
    builder.addCase(fetchLoanById.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      fetchLoanById.fulfilled,
      (state, action: PayloadAction<Loan>) => {
        state.isLoading = false;
        state.currentLoan = action.payload;
      },
    );
    builder.addCase(fetchLoanById.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Apply For Loan
    builder.addCase(applyForLoan.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      applyForLoan.fulfilled,
      (state, action: PayloadAction<Loan>) => {
        state.isLoading = false;
        state.currentLoan = action.payload;
        state.loans = [action.payload, ...state.loans];
      },
    );
    builder.addCase(applyForLoan.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Make Loan Payment
    builder.addCase(makeLoanPayment.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      makeLoanPayment.fulfilled,
      (state, action: PayloadAction<Loan>) => {
        state.isLoading = false;
        state.currentLoan = action.payload;
        state.loans = state.loans.map((loan) =>
          loan.id === action.payload.id ? action.payload : loan,
        );
      },
    );
    builder.addCase(makeLoanPayment.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearError, clearCurrentLoan } = creditSlice.actions;
export default creditSlice.reducer;
