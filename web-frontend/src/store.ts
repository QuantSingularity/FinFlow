import { configureStore } from "@reduxjs/toolkit";
import analyticsReducer from "./slices/analyticsSlice";
import authReducer from "./slices/authSlice";
import invoiceReducer from "./slices/invoiceSlice";
import paymentReducer from "./slices/paymentSlice";
import transactionReducer from "./slices/transactionSlice";
import uiReducer from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    transactions: transactionReducer,
    invoices: invoiceReducer,
    payments: paymentReducer,
    analytics: analyticsReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
