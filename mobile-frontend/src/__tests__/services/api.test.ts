import AsyncStorage from "@react-native-async-storage/async-storage";

// Capture the interceptors ApiService registers on its axios instance so the
// 401 handling can be exercised without a network.
const interceptors: { response?: (error: any) => Promise<never> } = {};
jest.mock("axios", () => {
  const instance = {
    defaults: { headers: { common: {} } },
    interceptors: {
      request: { use: jest.fn() },
      response: {
        use: jest.fn((_ok: unknown, onError: (e: any) => Promise<never>) => {
          interceptors.response = onError;
        }),
      },
    },
    request: jest.fn(),
  };
  return { __esModule: true, default: { create: jest.fn(() => instance) } };
});

// The import must come after jest.mock so the mocked axios is picked up.
// eslint-disable-next-line import/first
import { apiService } from "../../services/api";

const make401 = (url: string) => ({
  message: "Request failed with status code 401",
  config: { url },
  response: { status: 401, data: { message: "Unauthorized" } },
});

describe("ApiService 401 handling", () => {
  const handler = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.setItem("auth_token", "tok");
    await AsyncStorage.setItem("user", "{}");
    apiService.setUnauthorizedHandler(handler);
  });

  it("clears the stored session and notifies the app on an expired token", async () => {
    await expect(
      interceptors.response!(make401("/api/payments")),
    ).rejects.toMatchObject({
      status: 401,
      message: "Unauthorized",
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem("auth_token")).toBeNull();
    expect(await AsyncStorage.getItem("user")).toBeNull();
  });

  it("does not treat wrong login credentials as an expired session", async () => {
    await expect(
      interceptors.response!(make401("/api/auth/login")),
    ).rejects.toMatchObject({
      status: 401,
    });

    expect(handler).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem("auth_token")).toBe("tok");
  });

  it("maps network errors without a response to a 500 ApiError", async () => {
    await expect(
      interceptors.response!({
        message: "Network Error",
        config: { url: "/x" },
      }),
    ).rejects.toEqual({ message: "Network Error", status: 500 });
  });
});
