import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UiState {
  sidebarOpen: boolean;
  loading: {
    [key: string]: boolean;
  };
  notifications: {
    id: string;
    message: string;
    type: "success" | "error" | "info" | "warning";
    timestamp: number;
  }[];
}

const initialState: UiState = {
  sidebarOpen: true,
  loading: {},
  notifications: [],
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setLoading: (
      state,
      action: PayloadAction<{ key: string; isLoading: boolean }>,
    ) => {
      const { key, isLoading } = action.payload;
      state.loading[key] = isLoading;
    },
    addNotification: (
      state,
      action: PayloadAction<{
        message: string;
        type: "success" | "error" | "info" | "warning";
      }>,
    ) => {
      const { message, type } = action.payload;
      state.notifications.push({
        id: Date.now().toString(),
        message,
        type,
        timestamp: Date.now(),
      });
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload,
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setLoading,
  addNotification,
  removeNotification,
  clearNotifications,
} = uiSlice.actions;

export default uiSlice.reducer;
