import { configureStore } from "@reduxjs/toolkit";
import accountingReducer from "./slices/accountingSlice";
import analyticsReducer from "./slices/analyticsSlice";
import authReducer from "./slices/authSlice";
import creditReducer from "./slices/creditSlice";
import paymentsReducer from "./slices/paymentsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    payments: paymentsReducer,
    analytics: analyticsReducer,
    accounting: accountingReducer,
    credit: creditReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
