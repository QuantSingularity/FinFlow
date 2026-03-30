import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import thunk from "redux-thunk";
import RegisterScreen from "../../screens/auth/RegisterScreen";

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Mock Redux store
const middlewares = [thunk];
const mockStore = configureStore(middlewares);

describe("RegisterScreen", () => {
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

    // Clear navigation mocks
    mockNavigation.navigate.mockClear();
  });

  it("renders correctly", () => {
    const { getByText, getByPlaceholderText } = render(
      <Provider store={store}>
        <RegisterScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Check if important elements are rendered
    expect(getByText("Create Account")).toBeTruthy();
    expect(getByText("Join FinFlow to manage your finances")).toBeTruthy();
    expect(getByPlaceholderText("Enter your first name")).toBeTruthy();
    expect(getByPlaceholderText("Enter your last name")).toBeTruthy();
    expect(getByPlaceholderText("Enter your email")).toBeTruthy();
    expect(getByPlaceholderText("Create a password")).toBeTruthy();
    expect(getByPlaceholderText("Confirm your password")).toBeTruthy();
    expect(getByText("Create Account")).toBeTruthy();
    expect(getByText("Sign in")).toBeTruthy();
  });

  it("shows validation errors when form is submitted with empty fields", () => {
    const { getByText } = render(
      <Provider store={store}>
        <RegisterScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Submit the form without filling any fields
    fireEvent.press(getByText("Create Account"));

    // Check if validation errors are shown
    expect(getByText("First name is required")).toBeTruthy();
    expect(getByText("Last name is required")).toBeTruthy();
    expect(getByText("Email is required")).toBeTruthy();
    expect(getByText("Password is required")).toBeTruthy();
    expect(getByText("Please confirm your password")).toBeTruthy();
  });

  it("shows validation error when email format is invalid", () => {
    const { getByText, getByPlaceholderText } = render(
      <Provider store={store}>
        <RegisterScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Fill form with invalid email
    fireEvent.changeText(getByPlaceholderText("Enter your first name"), "John");
    fireEvent.changeText(getByPlaceholderText("Enter your last name"), "Doe");
    fireEvent.changeText(
      getByPlaceholderText("Enter your email"),
      "invalid-email",
    );
    fireEvent.changeText(
      getByPlaceholderText("Create a password"),
      "password123",
    );
    fireEvent.changeText(
      getByPlaceholderText("Confirm your password"),
      "password123",
    );

    // Submit the form
    fireEvent.press(getByText("Create Account"));

    // Check if validation error is shown
    expect(getByText("Email is invalid")).toBeTruthy();
  });

  it("shows validation error when password is too short", () => {
    const { getByText, getByPlaceholderText } = render(
      <Provider store={store}>
        <RegisterScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Fill form with short password
    fireEvent.changeText(getByPlaceholderText("Enter your first name"), "John");
    fireEvent.changeText(getByPlaceholderText("Enter your last name"), "Doe");
    fireEvent.changeText(
      getByPlaceholderText("Enter your email"),
      "john@example.com",
    );
    fireEvent.changeText(getByPlaceholderText("Create a password"), "1234");
    fireEvent.changeText(getByPlaceholderText("Confirm your password"), "1234");

    // Submit the form
    fireEvent.press(getByText("Create Account"));

    // Check if validation error is shown
    expect(getByText("Password must be at least 8 characters")).toBeTruthy();
  });

  it("shows validation error when passwords do not match", () => {
    const { getByText, getByPlaceholderText } = render(
      <Provider store={store}>
        <RegisterScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Fill form with mismatched passwords
    fireEvent.changeText(getByPlaceholderText("Enter your first name"), "John");
    fireEvent.changeText(getByPlaceholderText("Enter your last name"), "Doe");
    fireEvent.changeText(
      getByPlaceholderText("Enter your email"),
      "john@example.com",
    );
    fireEvent.changeText(
      getByPlaceholderText("Create a password"),
      "password123",
    );
    fireEvent.changeText(
      getByPlaceholderText("Confirm your password"),
      "password456",
    );

    // Submit the form
    fireEvent.press(getByText("Create Account"));

    // Check if validation error is shown
    expect(getByText("Passwords do not match")).toBeTruthy();
  });

  it("dispatches register action when form is valid", async () => {
    const { getByText, getByPlaceholderText } = render(
      <Provider store={store}>
        <RegisterScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Fill form with valid data
    fireEvent.changeText(getByPlaceholderText("Enter your first name"), "John");
    fireEvent.changeText(getByPlaceholderText("Enter your last name"), "Doe");
    fireEvent.changeText(
      getByPlaceholderText("Enter your email"),
      "john@example.com",
    );
    fireEvent.changeText(
      getByPlaceholderText("Create a password"),
      "password123",
    );
    fireEvent.changeText(
      getByPlaceholderText("Confirm your password"),
      "password123",
    );

    // Submit the form
    fireEvent.press(getByText("Create Account"));

    // Check if register action was dispatched
    await waitFor(() => {
      expect(store.dispatch).toHaveBeenCalled();
    });
  });

  it("navigates to login screen when sign in is pressed", () => {
    const { getByText } = render(
      <Provider store={store}>
        <RegisterScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Press sign in link
    fireEvent.press(getByText("Sign in"));

    // Check if navigation was called with correct screen
    expect(mockNavigation.navigate).toHaveBeenCalledWith("Login");
  });

  it("displays error message when auth state has error", () => {
    // Create store with error
    const storeWithError = mockStore({
      auth: {
        user: null,
        token: null,
        isLoading: false,
        error: "Email already in use",
      },
    });

    const { getByText } = render(
      <Provider store={storeWithError}>
        <RegisterScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Check if error message is displayed
    expect(getByText("Email already in use")).toBeTruthy();
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
        <RegisterScreen navigation={mockNavigation} />
      </Provider>,
    );

    // The button should be in loading state
    const registerButton = getByText("Create Account").parent;
    expect(registerButton.props.disabled).toBe(true);
  });
});
