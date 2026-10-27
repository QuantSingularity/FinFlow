import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { authApi } from "../../services/api";
import type { AuthState, User } from "../../types";

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
};

// The API wraps payloads as { success, data: {...} } in some places and returns
// them bare in others; the access token has been exposed as tokens.accessToken,
// accessToken or token. Normalise all of those here.
const unwrap = (body: any) => body?.data ?? body;

const extractSession = (body: any): { token: string; user: User } => {
  const payload = unwrap(body);
  const token: string =
    payload?.tokens?.accessToken ??
    payload?.accessToken ??
    payload?.token ??
    "";
  const user = payload?.user ?? payload;
  return { token, user };
};

// Async thunks
export const login = createAsyncThunk(
  "auth/login",
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await authApi.login(email, password);
      const { token, user } = extractSession(response.data);
      await AsyncStorage.setItem("auth_token", token);
      await AsyncStorage.setItem("user", JSON.stringify(user));
      return { token, user };
    } catch (error: any) {
      return rejectWithValue(error.message || "Login failed");
    }
  },
);

export const register = createAsyncThunk(
  "auth/register",
  async (
    {
      email,
      password,
      firstName,
      lastName,
    }: { email: string; password: string; firstName: string; lastName: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await authApi.register(
        email,
        password,
        firstName,
        lastName,
      );
      // Backend returns tokens on register too; auto-sign-in the new user.
      const { token, user } = extractSession(response.data);
      if (token) {
        await AsyncStorage.setItem("auth_token", token);
        await AsyncStorage.setItem("user", JSON.stringify(user));
      }
      return { token, user };
    } catch (error: any) {
      return rejectWithValue(error.message || "Registration failed");
    }
  },
);

export const getProfile = createAsyncThunk(
  "auth/getProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.getProfile();
      const user = unwrap(response.data);
      // Update user in AsyncStorage
      await AsyncStorage.setItem("user", JSON.stringify(user));
      return user;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch profile");
    }
  },
);

export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (
    data: Partial<{ firstName: string; lastName: string; email: string }>,
    { rejectWithValue },
  ) => {
    try {
      const response = await authApi.updateProfile(data);
      const user = unwrap(response.data);
      // Update user in AsyncStorage
      await AsyncStorage.setItem("user", JSON.stringify(user));
      return user;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to update profile");
    }
  },
);

export const logout = createAsyncThunk("auth/logout", async () => {
  await AsyncStorage.removeItem("auth_token");
  await AsyncStorage.removeItem("user");
  return null;
});

export const checkAuth = createAsyncThunk("auth/checkAuth", async () => {
  try {
    const token = await AsyncStorage.getItem("auth_token");
    const userJson = await AsyncStorage.getItem("user");

    if (token && userJson) {
      return { token, user: JSON.parse(userJson) as User };
    }
  } catch {
    // Corrupt or unreadable stored session: fall through to signed-out.
  }

  return { token: null, user: null };
});

// Auth slice
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(login.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      login.fulfilled,
      (state, action: PayloadAction<{ token: string; user: User }>) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      },
    );
    builder.addCase(login.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Register
    builder.addCase(register.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      register.fulfilled,
      (state, action: PayloadAction<{ token: string; user: User }>) => {
        state.isLoading = false;
        if (action.payload?.token) {
          state.token = action.payload.token;
          state.user = action.payload.user;
        }
      },
    );
    builder.addCase(register.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Get Profile
    builder.addCase(getProfile.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      getProfile.fulfilled,
      (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
      },
    );
    builder.addCase(getProfile.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Update Profile
    builder.addCase(updateProfile.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      updateProfile.fulfilled,
      (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
      },
    );
    builder.addCase(updateProfile.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.token = null;
    });

    // Check Auth
    builder.addCase(checkAuth.fulfilled, (state, action) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
    });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
