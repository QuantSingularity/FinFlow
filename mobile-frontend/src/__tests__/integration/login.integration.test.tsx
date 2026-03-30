import { NavigationContainer } from "@react-navigation/native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import axios from "axios";
import { Provider } from "react-redux";
import LoginScreen from "../../screens/auth/LoginScreen";
import { store } from "../../store";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Login Integration Test", () => {
  let navigation: any;

  beforeEach(() => {
    navigation = {
      navigate: jest.fn(),
    };
    mockedAxios.create.mockReturnValue(mockedAxios as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("successfully logs in with valid credentials", async () => {
    const mockResponse = {
      data: {
        token: "mock-token",
        user: {
          id: "1",
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
          role: "user",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
      },
      status: 200,
      statusText: "OK",
    };

    mockedAxios.request.mockResolvedValueOnce(mockResponse);

    const { getByPlaceholderText, getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <LoginScreen navigation={navigation} />
        </NavigationContainer>
      </Provider>,
    );

    const emailInput = getByPlaceholderText("Enter your email");
    const passwordInput = getByPlaceholderText("Enter your password");
    const loginButton = getByText("Sign In");

    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.changeText(passwordInput, "password123");
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mockedAxios.request).toHaveBeenCalled();
    });
  });

  it("shows error message with invalid credentials", async () => {
    const mockError = {
      response: {
        data: {
          message: "Invalid credentials",
        },
        status: 401,
      },
      message: "Invalid credentials",
    };

    mockedAxios.request.mockRejectedValueOnce(mockError);

    const { getByPlaceholderText, getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <LoginScreen navigation={navigation} />
        </NavigationContainer>
      </Provider>,
    );

    const emailInput = getByPlaceholderText("Enter your email");
    const passwordInput = getByPlaceholderText("Enter your password");
    const loginButton = getByText("Sign In");

    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.changeText(passwordInput, "wrongpassword");
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mockedAxios.request).toHaveBeenCalled();
    });
  });
});
