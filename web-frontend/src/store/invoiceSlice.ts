import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Invoice, InvoiceState } from "../types";

const initialState: InvoiceState = {
  invoices: [],
  currentInvoice: null,
  isLoading: false,
  error: null,
};

const invoiceSlice = createSlice({
  name: "invoice",
  initialState,
  reducers: {
    getInvoicesStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    getInvoicesSuccess: (state, action: PayloadAction<Invoice[]>) => {
      state.isLoading = false;
      state.invoices = action.payload;
    },
    getInvoicesFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    getInvoiceStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    getInvoiceSuccess: (state, action: PayloadAction<Invoice>) => {
      state.isLoading = false;
      state.currentInvoice = action.payload;
    },
    getInvoiceFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    createInvoiceStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    createInvoiceSuccess: (state, action: PayloadAction<Invoice>) => {
      state.isLoading = false;
      state.invoices = [...state.invoices, action.payload];
      state.currentInvoice = action.payload;
    },
    createInvoiceFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    updateInvoiceStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    updateInvoiceSuccess: (state, action: PayloadAction<Invoice>) => {
      state.isLoading = false;
      state.invoices = state.invoices.map((invoice) =>
        invoice.id === action.payload.id ? action.payload : invoice,
      );
      state.currentInvoice = action.payload;
    },
    updateInvoiceFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    deleteInvoiceStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    deleteInvoiceSuccess: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.invoices = state.invoices.filter(
        (invoice) => invoice.id !== action.payload,
      );
      state.currentInvoice = null;
    },
    deleteInvoiceFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    clearInvoiceError: (state) => {
      state.error = null;
    },
    setCurrentInvoice: (state, action: PayloadAction<Invoice | null>) => {
      state.currentInvoice = action.payload;
    },
  },
});

export const {
  getInvoicesStart,
  getInvoicesSuccess,
  getInvoicesFailure,
  getInvoiceStart,
  getInvoiceSuccess,
  getInvoiceFailure,
  createInvoiceStart,
  createInvoiceSuccess,
  createInvoiceFailure,
  updateInvoiceStart,
  updateInvoiceSuccess,
  updateInvoiceFailure,
  deleteInvoiceStart,
  deleteInvoiceSuccess,
  deleteInvoiceFailure,
  clearInvoiceError,
  setCurrentInvoice,
} = invoiceSlice.actions;

export default invoiceSlice.reducer;
