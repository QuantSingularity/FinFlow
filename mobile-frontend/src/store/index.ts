import { configureStore } from "@reduxjs/toolkit";
import { apiService } from "../services/api";
import accountingReducer from "./slices/accountingSlice";
import analyticsReducer from "./slices/analyticsSlice";
import authReducer, { logout } from "./slices/authSlice";
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

// When the API rejects the stored token, sign the user out so the navigator
// returns to the auth flow instead of showing broken, unauthorised screens.
apiService.setUnauthorizedHandler?.(() => {
  store.dispatch(logout());
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
