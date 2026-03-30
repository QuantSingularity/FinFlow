import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import thunk from "redux-thunk";
import LoginScreen from "../../screens/auth/LoginScreen";

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
};

// Mock Redux store
const middlewares = [thunk];
const mockStore = configureStore(middlewares);

describe("LoginScreen", () => {
  let store;

  beforeEach(() => {
    store = mockStore({
      auth: {
        user: null,
        token: null,
        isLoading: false,
        error: null,
      },
    });

    // Mock dispatch function
    store.dispatch = jest.fn().mockImplementation(() => Promise.resolve());
  });

  it("renders correctly", () => {
    const { getByText, getByPlaceholderText } = render(
      <Provider store={store}>
        <LoginScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Check if important elements are rendered
    expect(getByText("FinFlow")).toBeTruthy();
    expect(getByText("Sign in to your account")).toBeTruthy();
    expect(getByPlaceholderText("Enter your email")).toBeTruthy();
    expect(getByPlaceholderText("Enter your password")).toBeTruthy();
    expect(getByText("Forgot password?")).toBeTruthy();
    expect(getByText("Sign In")).toBeTruthy();
    expect(getByText("Sign up")).toBeTruthy();
  });

  it("shows validation errors when form is submitted with empty fields", () => {
    const { getByText } = render(
      <Provider store={store}>
        <LoginScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Submit the form without filling any fields
    fireEvent.press(getByText("Sign In"));

    // Check if validation errors are shown
    expect(getByText("Email is required")).toBeTruthy();
    expect(getByText("Password is required")).toBeTruthy();
  });

  it("shows validation error when email format is invalid", () => {
    const { getByText, getByPlaceholderText } = render(
      <Provider store={store}>
        <LoginScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Enter invalid email
    fireEvent.changeText(
      getByPlaceholderText("Enter your email"),
      "invalid-email",
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter your password"),
      "password123",
    );

    // Submit the form
    fireEvent.press(getByText("Sign In"));

    // Check if validation error is shown
    expect(getByText("Email is invalid")).toBeTruthy();
  });

  it("shows validation error when password is too short", () => {
    const { getByText, getByPlaceholderText } = render(
      <Provider store={store}>
        <LoginScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Enter valid email but short password
    fireEvent.changeText(
      getByPlaceholderText("Enter your email"),
      "test@example.com",
    );
    fireEvent.changeText(getByPlaceholderText("Enter your password"), "12345");

    // Submit the form
    fireEvent.press(getByText("Sign In"));

    // Check if validation error is shown
    expect(getByText("Password must be at least 6 characters")).toBeTruthy();
  });

  it("dispatches login action when form is valid", async () => {
    const { getByText, getByPlaceholderText } = render(
      <Provider store={store}>
        <LoginScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Enter valid credentials
    fireEvent.changeText(
      getByPlaceholderText("Enter your email"),
      "test@example.com",
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter your password"),
      "password123",
    );

    // Submit the form
    fireEvent.press(getByText("Sign In"));

    // Check if login action was dispatched
    await waitFor(() => {
      expect(store.dispatch).toHaveBeenCalled();
    });
  });

  it("navigates to forgot password screen when forgot password is pressed", () => {
    const { getByText } = render(
      <Provider store={store}>
        <LoginScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Press forgot password link
    fireEvent.press(getByText("Forgot password?"));

    // Check if navigation was called with correct screen
    expect(mockNavigation.navigate).toHaveBeenCalledWith("ForgotPassword");
  });

  it("navigates to register screen when sign up is pressed", () => {
    const { getByText } = render(
      <Provider store={store}>
        <LoginScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Press sign up link
    fireEvent.press(getByText("Sign up"));

    // Check if navigation was called with correct screen
    expect(mockNavigation.navigate).toHaveBeenCalledWith("Register");
  });

  it("displays error message when auth state has error", () => {
    // Create store with error
    const storeWithError = mockStore({
      auth: {
        user: null,
        token: null,
        isLoading: false,
        error: "Invalid credentials",
      },
    });

    const { getByText } = render(
      <Provider store={storeWithError}>
        <LoginScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Check if error message is displayed
    expect(getByText("Invalid credentials")).toBeTruthy();
  });

  it("shows loading indicator when isLoading is true", () => {
    // Create store with loading state
    const loadingStore = mockStore({
      auth: {
        user: null,
        token: null,
        isLoading: true,
        error: null,
      },
    });

    const { getByText } = render(
      <Provider store={loadingStore}>
        <LoginScreen navigation={mockNavigation} />
      </Provider>,
    );

    // The button should be in loading state
    const loginButton = getByText("Sign In").parent;
    expect(loginButton.props.disabled).toBe(true);
  });
});
