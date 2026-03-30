import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Transaction, TransactionState } from "../types";

const initialState: TransactionState = {
  transactions: [],
  currentTransaction: null,
  isLoading: false,
  error: null,
};

const transactionSlice = createSlice({
  name: "transaction",
  initialState,
  reducers: {
    getTransactionsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    getTransactionsSuccess: (state, action: PayloadAction<Transaction[]>) => {
      state.isLoading = false;
      state.transactions = action.payload;
    },
    getTransactionsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    getTransactionStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    getTransactionSuccess: (state, action: PayloadAction<Transaction>) => {
      state.isLoading = false;
      state.currentTransaction = action.payload;
    },
    getTransactionFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    createTransactionStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    createTransactionSuccess: (state, action: PayloadAction<Transaction>) => {
      state.isLoading = false;
      state.transactions = [...state.transactions, action.payload];
      state.currentTransaction = action.payload;
    },
    createTransactionFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    updateTransactionStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    updateTransactionSuccess: (state, action: PayloadAction<Transaction>) => {
      state.isLoading = false;
      state.transactions = state.transactions.map((transaction) =>
        transaction.id === action.payload.id ? action.payload : transaction,
      );
      state.currentTransaction = action.payload;
    },
    updateTransactionFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    deleteTransactionStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    deleteTransactionSuccess: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.transactions = state.transactions.filter(
        (transaction) => transaction.id !== action.payload,
      );
      state.currentTransaction = null;
    },
    deleteTransactionFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    clearTransactionError: (state) => {
      state.error = null;
    },
    setCurrentTransaction: (
      state,
      action: PayloadAction<Transaction | null>,
    ) => {
      state.currentTransaction = action.payload;
    },
  },
});

export const {
  getTransactionsStart,
  getTransactionsSuccess,
  getTransactionsFailure,
  getTransactionStart,
  getTransactionSuccess,
  getTransactionFailure,
  createTransactionStart,
  createTransactionSuccess,
  createTransactionFailure,
  updateTransactionStart,
  updateTransactionSuccess,
  updateTransactionFailure,
  deleteTransactionStart,
  deleteTransactionSuccess,
  deleteTransactionFailure,
  clearTransactionError,
  setCurrentTransaction,
} = transactionSlice.actions;

export default transactionSlice.reducer;
