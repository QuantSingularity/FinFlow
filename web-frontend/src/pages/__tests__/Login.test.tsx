import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import configureStore from "redux-mock-store";
import thunk from "redux-thunk";
import authService from "../../services/authService";
import Login from "../Login";

// Mock the auth service
jest.mock("../../services/authService");

// Mock store
const middlewares = [thunk];
const mockStore = configureStore(middlewares);

describe("Login Component", () => {
  let store;

  beforeEach(() => {
    store = mockStore({
      auth: {
        loading: false,
        error: null,
        isAuthenticated: false,
      },
    });

    // Mock dispatch
    store.dispatch = jest.fn().mockImplementation(() => Promise.resolve());
  });

  test("renders login form with all fields", () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </Provider>,
    );

    // Check if form elements are rendered
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();

    // Check if OAuth options are rendered
    expect(screen.getByText(/sign in with google/i)).toBeInTheDocument();
    expect(screen.getByText(/sign in with github/i)).toBeInTheDocument();

    // Check if register link is rendered
    expect(
      screen.getByText(/don't have an account\? sign up/i),
    ).toBeInTheDocument();
  });

  test("validates form fields on submission", async () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </Provider>,
    );

    // Submit form without filling required fields
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    // Check if validation errors are displayed
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    // Fill email with invalid format
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "invalid-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    // Check if validation error for invalid email is displayed
    await waitFor(() => {
      expect(
        screen.getByText(/please enter a valid email/i),
      ).toBeInTheDocument();
    });

    // Store dispatch should not be called with invalid form
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  test("submits form with valid credentials", async () => {
    // Mock successful login
    const mockLoginResponse = {
      user: {
        id: "user_123",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
      },
      tokens: {
        accessToken: "access_token_123",
        refreshToken: "refresh_token_123",
      },
    };

    (authService.login as jest.Mock).mockResolvedValue(mockLoginResponse);

    render(
      <Provider store={store}>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </Provider>,
    );

    // Fill form with valid data
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "Password123!" },
    });

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    // Check if store dispatch was called with correct action
    await waitFor(() => {
      expect(store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining("LOGIN"),
        }),
      );
    });
  });

  test("displays loading state during form submission", async () => {
    // Set loading state to true
    store = mockStore({
      auth: {
        loading: true,
        error: null,
        isAuthenticated: false,
      },
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </Provider>,
    );

    // Check if loading indicator is displayed
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();

    // Check if submit button is disabled during loading
    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
  });

  test("displays error message when login fails", async () => {
    // Set error state
    store = mockStore({
      auth: {
        loading: false,
        error: "Invalid credentials",
        isAuthenticated: false,
      },
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </Provider>,
    );

    // Check if error message is displayed
    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
  });

  test("redirects to dashboard when already authenticated", async () => {
    // Set authenticated state
    store = mockStore({
      auth: {
        loading: false,
        error: null,
        isAuthenticated: true,
        user: {
          id: "user_123",
          email: "test@example.com",
        },
      },
    });

    // Mock window.location
    Object.defineProperty(window, "location", {
      value: { pathname: "/login" },
      writable: true,
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </Provider>,
    );

    // Check if redirected to dashboard
    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard");
    });
  });

  test("initiates OAuth login when clicking OAuth buttons", async () => {
    // Mock window.location.href assignment
    const originalLocation = window.location;
    delete window.location;
    window.location = { ...originalLocation, href: "" };

    // Mock OAuth URL generation
    (authService.getOAuthUrl as jest.Mock).mockImplementation((provider) => {
      return `https://oauth.example.com/${provider.toLowerCase()}`;
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </Provider>,
    );

    // Click Google OAuth button
    fireEvent.click(screen.getByText(/sign in with google/i));

    // Check if OAuth URL was generated and location was changed
    expect(authService.getOAuthUrl).toHaveBeenCalledWith("GOOGLE");
    expect(window.location.href).toBe("https://oauth.example.com/google");

    // Reset for next test
    window.location.href = "";

    // Click GitHub OAuth button
    fireEvent.click(screen.getByText(/sign in with github/i));

    // Check if OAuth URL was generated and location was changed
    expect(authService.getOAuthUrl).toHaveBeenCalledWith("GITHUB");
    expect(window.location.href).toBe("https://oauth.example.com/github");

    // Restore original location
    window.location = originalLocation;
  });

  test("navigates to register page when clicking sign up link", () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </Provider>,
    );

    // Click sign up link
    fireEvent.click(screen.getByText(/don't have an account\? sign up/i));

    // Check if navigation occurred
    expect(window.location.pathname).toBe("/register");
  });
});
