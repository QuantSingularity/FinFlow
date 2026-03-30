import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import configureStore from "redux-mock-store";
import thunk from "redux-thunk";
import authService from "../../services/authService";
import Register from "../Register";

// Mock the auth service
jest.mock("../../services/authService");

// Mock store
const middlewares = [thunk];
const mockStore = configureStore(middlewares);

describe("Register Component", () => {
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

  test("renders registration form with all fields", () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      </Provider>,
    );

    // Check if form elements are rendered
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign up/i }),
    ).toBeInTheDocument();

    // Check if login link is rendered
    expect(
      screen.getByText(/already have an account\? sign in/i),
    ).toBeInTheDocument();
  });

  test("validates form fields on submission", async () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      </Provider>,
    );

    // Submit form without filling required fields
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    // Check if validation errors are displayed
    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    // Fill email with invalid format
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "invalid-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    // Check if validation error for invalid email is displayed
    await waitFor(() => {
      expect(
        screen.getByText(/please enter a valid email/i),
      ).toBeInTheDocument();
    });

    // Fill password fields with non-matching values
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "Password123!" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "DifferentPassword123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    // Check if validation error for password mismatch is displayed
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

    // Store dispatch should not be called with invalid form
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  test("submits form with valid registration data", async () => {
    // Mock successful registration
    const mockRegisterResponse = {
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

    (authService.register as jest.Mock).mockResolvedValue(mockRegisterResponse);

    render(
      <Provider store={store}>
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      </Provider>,
    );

    // Fill form with valid data
    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: "Test" },
    });
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: "User" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "Password123!" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "Password123!" },
    });

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    // Check if store dispatch was called with correct action
    await waitFor(() => {
      expect(store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining("REGISTER"),
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
          <Register />
        </BrowserRouter>
      </Provider>,
    );

    // Check if loading indicator is displayed
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();

    // Check if submit button is disabled during loading
    expect(screen.getByRole("button", { name: /signing up/i })).toBeDisabled();
  });

  test("displays error message when registration fails", async () => {
    // Set error state
    store = mockStore({
      auth: {
        loading: false,
        error: "Email already in use",
        isAuthenticated: false,
      },
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      </Provider>,
    );

    // Check if error message is displayed
    expect(screen.getByText(/email already in use/i)).toBeInTheDocument();
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
      value: { pathname: "/register" },
      writable: true,
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      </Provider>,
    );

    // Check if redirected to dashboard
    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard");
    });
  });

  test("navigates to login page when clicking sign in link", () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      </Provider>,
    );

    // Click sign in link
    fireEvent.click(screen.getByText(/already have an account\? sign in/i));

    // Check if navigation occurred
    expect(window.location.pathname).toBe("/login");
  });
});
