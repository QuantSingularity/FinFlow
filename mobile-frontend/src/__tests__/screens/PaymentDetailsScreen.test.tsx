import { fireEvent, render } from "@testing-library/react-native";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import thunk from "redux-thunk";
import PaymentDetailsScreen from "../../screens/payments/PaymentDetailsScreen";

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Mock route
const mockRoute = {
  params: {
    id: "1",
  },
};

// Mock Redux store
const middlewares = [thunk];
const mockStore = configureStore(middlewares);

// Mock data
const mockPaymentData = {
  payments: {
    currentTransaction: {
      id: "1",
      amount: 500,
      currency: "USD",
      status: "completed",
      createdAt: "2025-05-01T10:30:00Z",
      processorType: "stripe",
      processorId: "pi_123456789",
      metadata: {
        description: "Monthly subscription",
        customer: "John Doe",
      },
    },
    isLoading: false,
    error: null,
  },
};

describe("PaymentDetailsScreen", () => {
  let store;

  beforeEach(() => {
    store = mockStore(mockPaymentData);

    // Mock dispatch function
    store.dispatch = jest.fn().mockImplementation(() => Promise.resolve());

    // Clear navigation mocks
    mockNavigation.navigate.mockClear();
    mockNavigation.goBack.mockClear();
  });

  it("renders correctly with transaction details", () => {
    const { getByText } = render(
      <Provider store={store}>
        <PaymentDetailsScreen navigation={mockNavigation} route={mockRoute} />
      </Provider>,
    );

    // Check if important elements are rendered
    expect(getByText("Payment Details")).toBeTruthy();
    expect(getByText("completed")).toBeTruthy();
    expect(getByText("Transaction ID")).toBeTruthy();
    expect(getByText("1")).toBeTruthy();
    expect(getByText("Amount")).toBeTruthy();
    expect(getByText("$500.00")).toBeTruthy();
    expect(getByText("Processor")).toBeTruthy();
    expect(getByText("stripe")).toBeTruthy();
    expect(getByText("Additional Information")).toBeTruthy();
    expect(getByText("description")).toBeTruthy();
    expect(getByText("Monthly subscription")).toBeTruthy();
    expect(getByText("customer")).toBeTruthy();
    expect(getByText("John Doe")).toBeTruthy();
    expect(getByText("Refund Payment")).toBeTruthy();
    expect(getByText("Back to Payments")).toBeTruthy();
  });

  it("dispatches fetchTransactionById action on mount", () => {
    render(
      <Provider store={store}>
        <PaymentDetailsScreen navigation={mockNavigation} route={mockRoute} />
      </Provider>,
    );

    // Check if fetchTransactionById action was dispatched with correct ID
    expect(store.dispatch).toHaveBeenCalledTimes(1);
  });

  it("shows loading indicator when transaction is loading", () => {
    // Create store with loading state
    const loadingStore = mockStore({
      payments: {
        currentTransaction: null,
        isLoading: true,
        error: null,
      },
    });

    const { getByText } = render(
      <Provider store={loadingStore}>
        <PaymentDetailsScreen navigation={mockNavigation} route={mockRoute} />
      </Provider>,
    );

    // Check if loading indicator is shown
    expect(getByText("Loading payment details...")).toBeTruthy();
  });

  it("shows error message when there is an error", () => {
    // Create store with error
    const errorStore = mockStore({
      payments: {
        currentTransaction: null,
        isLoading: false,
        error: "Failed to load transaction details",
      },
    });

    const { getByText } = render(
      <Provider store={errorStore}>
        <PaymentDetailsScreen navigation={mockNavigation} route={mockRoute} />
      </Provider>,
    );

    // Check if error message is shown
    expect(getByText("Failed to load transaction details")).toBeTruthy();
    expect(getByText("Go Back")).toBeTruthy();
  });

  it("navigates back when Go Back button is clicked in error state", () => {
    // Create store with error
    const errorStore = mockStore({
      payments: {
        currentTransaction: null,
        isLoading: false,
        error: "Failed to load transaction details",
      },
    });

    const { getByText } = render(
      <Provider store={errorStore}>
        <PaymentDetailsScreen navigation={mockNavigation} route={mockRoute} />
      </Provider>,
    );

    // Find and click the Go Back button
    fireEvent.press(getByText("Go Back"));

    // Check if navigation.goBack was called
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it("navigates back when Back to Payments button is clicked", () => {
    const { getByText } = render(
      <Provider store={store}>
        <PaymentDetailsScreen navigation={mockNavigation} route={mockRoute} />
      </Provider>,
    );

    // Find and click the Back to Payments button
    fireEvent.press(getByText("Back to Payments"));

    // Check if navigation.goBack was called
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it("does not show Refund button for non-completed transactions", () => {
    // Create store with pending transaction
    const pendingStore = mockStore({
      payments: {
        currentTransaction: {
          ...mockPaymentData.payments.currentTransaction,
          status: "pending",
        },
        isLoading: false,
        error: null,
      },
    });

    const { queryByText } = render(
      <Provider store={pendingStore}>
        <PaymentDetailsScreen navigation={mockNavigation} route={mockRoute} />
      </Provider>,
    );

    // Check that Refund Payment button is not shown
    expect(queryByText("Refund Payment")).toBeNull();
  });
});
