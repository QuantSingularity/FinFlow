import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Payment, PaymentState } from "../types";

const initialState: PaymentState = {
  payments: [],
  currentPayment: null,
  isLoading: false,
  error: null,
};

const paymentSlice = createSlice({
  name: "payment",
  initialState,
  reducers: {
    getPaymentsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    getPaymentsSuccess: (state, action: PayloadAction<Payment[]>) => {
      state.isLoading = false;
      state.payments = action.payload;
    },
    getPaymentsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    getPaymentStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    getPaymentSuccess: (state, action: PayloadAction<Payment>) => {
      state.isLoading = false;
      state.currentPayment = action.payload;
    },
    getPaymentFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    createPaymentStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    createPaymentSuccess: (state, action: PayloadAction<Payment>) => {
      state.isLoading = false;
      state.payments = [...state.payments, action.payload];
      state.currentPayment = action.payload;
    },
    createPaymentFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    updatePaymentStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    updatePaymentSuccess: (state, action: PayloadAction<Payment>) => {
      state.isLoading = false;
      state.payments = state.payments.map((payment) =>
        payment.id === action.payload.id ? action.payload : payment,
      );
      state.currentPayment = action.payload;
    },
    updatePaymentFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    clearPaymentError: (state) => {
      state.error = null;
    },
    setCurrentPayment: (state, action: PayloadAction<Payment | null>) => {
      state.currentPayment = action.payload;
    },
  },
});

export const {
  getPaymentsStart,
  getPaymentsSuccess,
  getPaymentsFailure,
  getPaymentStart,
  getPaymentSuccess,
  getPaymentFailure,
  createPaymentStart,
  createPaymentSuccess,
  createPaymentFailure,
  updatePaymentStart,
  updatePaymentSuccess,
  updatePaymentFailure,
  clearPaymentError,
  setCurrentPayment,
} = paymentSlice.actions;

export default paymentSlice.reducer;
