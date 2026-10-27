import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureStore } from "@reduxjs/toolkit";
import { authApi } from "../../services/api";
import authReducer, {
  checkAuth,
  getProfile,
  login,
  logout,
} from "../../store/slices/authSlice";

jest.mock("../../services/api", () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
  },
}));

const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;
const makeStore = () => configureStore({ reducer: { auth: authReducer } });
const user = { id: "u1", email: "a@b.com", role: "user" };

describe("authSlice", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it.each([
    [
      "nested tokens",
      { data: { user, tokens: { accessToken: "t-nested" } } },
      "t-nested",
    ],
    [
      "flat accessToken",
      { id: "u1", email: "a@b.com", role: "user", accessToken: "t-flat" },
      "t-flat",
    ],
    ["legacy token", { user, token: "t-legacy" }, "t-legacy"],
  ])(
    "stores the session for the %s login response",
    async (_name, body, token) => {
      mockedAuthApi.login.mockResolvedValue({ data: body } as any);
      const store = makeStore();

      await store.dispatch(login({ email: "a@b.com", password: "secret1" }));

      expect(store.getState().auth.token).toBe(token);
      expect(await AsyncStorage.getItem("auth_token")).toBe(token);
    },
  );

  it("surfaces the API error message when login fails", async () => {
    mockedAuthApi.login.mockRejectedValue({ message: "Invalid credentials" });
    const store = makeStore();

    await store.dispatch(login({ email: "a@b.com", password: "bad-pass" }));

    expect(store.getState().auth.error).toBe("Invalid credentials");
    expect(store.getState().auth.token).toBeNull();
  });

  it("unwraps the { data } envelope when loading the profile", async () => {
    mockedAuthApi.getProfile.mockResolvedValue({ data: { data: user } } as any);
    const store = makeStore();

    await store.dispatch(getProfile());

    expect(store.getState().auth.user).toEqual(user);
    expect(JSON.parse((await AsyncStorage.getItem("user")) as string)).toEqual(
      user,
    );
  });

  it("restores a stored session on startup", async () => {
    await AsyncStorage.setItem("auth_token", "saved");
    await AsyncStorage.setItem("user", JSON.stringify(user));
    const store = makeStore();

    await store.dispatch(checkAuth());

    expect(store.getState().auth.token).toBe("saved");
    expect(store.getState().auth.user).toEqual(user);
  });

  it("falls back to signed-out when the stored user is corrupt", async () => {
    await AsyncStorage.setItem("auth_token", "saved");
    await AsyncStorage.setItem("user", "{not json");
    const store = makeStore();

    await store.dispatch(checkAuth());

    expect(store.getState().auth.token).toBeNull();
    expect(store.getState().auth.user).toBeNull();
  });

  it("clears the session and storage on logout", async () => {
    await AsyncStorage.setItem("auth_token", "saved");
    await AsyncStorage.setItem("user", JSON.stringify(user));
    const store = makeStore();
    await store.dispatch(checkAuth());

    await store.dispatch(logout());

    expect(store.getState().auth.token).toBeNull();
    expect(await AsyncStorage.getItem("auth_token")).toBeNull();
  });
});
