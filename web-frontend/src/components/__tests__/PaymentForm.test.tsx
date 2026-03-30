import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import thunk from "redux-thunk";
import PaymentForm from "../PaymentForm";

// Mock store
const middlewares = [thunk];
const mockStore = configureStore(middlewares);

// Mock payment service
jest.mock("../../services/paymentService", () => ({
  processPayment: jest.fn().mockResolvedValue({
    id: "payment_123",
    status: "COMPLETED",
    amount: 100,
    currency: "USD",
  }),
}));

describe("PaymentForm Component", () => {
  let store;

  beforeEach(() => {
    store = mockStore({
      payment: {
        loading: false,
        error: null,
        processors: [
          { id: "STRIPE", name: "Stripe", icon: "stripe-icon.svg" },
          { id: "PAYPAL", name: "PayPal", icon: "paypal-icon.svg" },
          { id: "SQUARE", name: "Square", icon: "square-icon.svg" },
        ],
      },
    });

    // Mock dispatch
    store.dispatch = jest.fn().mockImplementation(() => Promise.resolve());
  });

  test("renders payment form with all fields", () => {
    render(
      <Provider store={store}>
        <PaymentForm />
      </Provider>,
    );

    // Check if form elements are rendered
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByText(/payment method/i)).toBeInTheDocument();

    // Check if payment processors are rendered
    expect(screen.getByText(/stripe/i)).toBeInTheDocument();
    expect(screen.getByText(/paypal/i)).toBeInTheDocument();
    expect(screen.getByText(/square/i)).toBeInTheDocument();

    // Check if submit button is rendered
    expect(
      screen.getByRole("button", { name: /process payment/i }),
    ).toBeInTheDocument();
  });

  test("validates form fields on submission", async () => {
    render(
      <Provider store={store}>
        <PaymentForm />
      </Provider>,
    );

    // Submit form without filling required fields
    fireEvent.click(screen.getByRole("button", { name: /process payment/i }));

    // Check if validation errors are displayed
    await waitFor(() => {
      expect(screen.getByText(/amount is required/i)).toBeInTheDocument();
    });

    // Fill amount with invalid value
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "-100" },
    });
    fireEvent.click(screen.getByRole("button", { name: /process payment/i }));

    // Check if validation error for negative amount is displayed
    await waitFor(() => {
      expect(screen.getByText(/amount must be positive/i)).toBeInTheDocument();
    });

    // Store dispatch should not be called with invalid form
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  test("submits form with valid data", async () => {
    render(
      <Provider store={store}>
        <PaymentForm />
      </Provider>,
    );

    // Fill form with valid data
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/currency/i), {
      target: { value: "USD" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Test payment" },
    });

    // Select payment processor
    fireEvent.click(screen.getByText(/stripe/i));

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /process payment/i }));

    // Check if store dispatch was called with correct action
    await waitFor(() => {
      expect(store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining("PROCESS_PAYMENT"),
        }),
      );
    });
  });

  test("displays loading state during form submission", async () => {
    // Set loading state to true
    store = mockStore({
      payment: {
        loading: true,
        error: null,
        processors: [
          { id: "STRIPE", name: "Stripe", icon: "stripe-icon.svg" },
          { id: "PAYPAL", name: "PayPal", icon: "paypal-icon.svg" },
          { id: "SQUARE", name: "Square", icon: "square-icon.svg" },
        ],
      },
    });

    render(
      <Provider store={store}>
        <PaymentForm />
      </Provider>,
    );

    // Check if loading indicator is displayed
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();

    // Check if submit button is disabled during loading
    expect(screen.getByRole("button", { name: /processing/i })).toBeDisabled();
  });

  test("displays error message when payment fails", async () => {
    // Set error state
    store = mockStore({
      payment: {
        loading: false,
        error: "Payment processing failed",
        processors: [
          { id: "STRIPE", name: "Stripe", icon: "stripe-icon.svg" },
          { id: "PAYPAL", name: "PayPal", icon: "paypal-icon.svg" },
          { id: "SQUARE", name: "Square", icon: "square-icon.svg" },
        ],
      },
    });

    render(
      <Provider store={store}>
        <PaymentForm />
      </Provider>,
    );

    // Check if error message is displayed
    expect(screen.getByText(/payment processing failed/i)).toBeInTheDocument();
  });

  test("resets form after successful submission", async () => {
    // Mock successful payment submission
    const mockSuccessCallback = jest.fn();

    render(
      <Provider store={store}>
        <PaymentForm onSuccess={mockSuccessCallback} />
      </Provider>,
    );

    // Fill form with valid data
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/currency/i), {
      target: { value: "USD" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Test payment" },
    });

    // Select payment processor
    fireEvent.click(screen.getByText(/stripe/i));

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /process payment/i }));

    // Mock successful response
    await waitFor(() => {
      // Simulate successful payment by updating store
      store = mockStore({
        payment: {
          loading: false,
          error: null,
          success: true,
          processors: [
            { id: "STRIPE", name: "Stripe", icon: "stripe-icon.svg" },
            { id: "PAYPAL", name: "PayPal", icon: "paypal-icon.svg" },
            { id: "SQUARE", name: "Square", icon: "square-icon.svg" },
          ],
        },
      });
    });

    // Re-render with updated store
    render(
      <Provider store={store}>
        <PaymentForm onSuccess={mockSuccessCallback} />
      </Provider>,
    );

    // Check if success callback was called
    expect(mockSuccessCallback).toHaveBeenCalled();

    // Check if form was reset (fields are empty)
    expect(screen.getByLabelText(/amount/i).value).toBe("");
    expect(screen.getByLabelText(/description/i).value).toBe("");
  });
});
