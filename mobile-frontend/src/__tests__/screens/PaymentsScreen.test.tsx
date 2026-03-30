import { fireEvent, render } from "@testing-library/react-native";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import thunk from "redux-thunk";
import PaymentsScreen from "../../screens/payments/PaymentsScreen";

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
};

// Mock Redux store
const middlewares = [thunk];
const mockStore = configureStore(middlewares);

// Mock data
const mockPaymentsData = {
  payments: {
    transactions: [
      {
        id: "1",
        amount: 500,
        currency: "USD",
        status: "completed",
        createdAt: "2025-05-01T10:30:00Z",
      },
      {
        id: "2",
        amount: 750,
        currency: "USD",
        status: "pending",
        createdAt: "2025-05-02T14:20:00Z",
      },
      {
        id: "3",
        amount: 1200,
        currency: "USD",
        status: "completed",
        createdAt: "2025-05-03T09:15:00Z",
      },
    ],
    isLoading: false,
    error: null,
    pagination: { page: 1, limit: 10, total: 3, totalPages: 1 },
  },
};

describe("PaymentsScreen", () => {
  let store;

  beforeEach(() => {
    store = mockStore(mockPaymentsData);

    // Mock dispatch function
    store.dispatch = jest.fn().mockImplementation(() => Promise.resolve());

    // Clear navigation mocks
    mockNavigation.navigate.mockClear();
  });

  it("renders correctly with transactions", () => {
    const { getByText } = render(
      <Provider store={store}>
        <PaymentsScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Check if important elements are rendered
    expect(getByText("Payments")).toBeTruthy();
    expect(getByText("New Payment")).toBeTruthy();
    expect(getByText("Transaction #1")).toBeTruthy();
    expect(getByText("Transaction #2")).toBeTruthy();
    expect(getByText("Transaction #3")).toBeTruthy();
  });

  it("dispatches fetchTransactions action on mount", () => {
    render(
      <Provider store={store}>
        <PaymentsScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Check if fetchTransactions action was dispatched
    expect(store.dispatch).toHaveBeenCalledTimes(1);
  });

  it("navigates to CreatePayment screen when New Payment button is clicked", () => {
    const { getByText } = render(
      <Provider store={store}>
        <PaymentsScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Find and click the "New Payment" button
    fireEvent.press(getByText("New Payment"));

    // Check if navigation was called with correct screen
    expect(mockNavigation.navigate).toHaveBeenCalledWith("CreatePayment");
  });

  it("navigates to PaymentDetails screen when a transaction is clicked", () => {
    const { getByText } = render(
      <Provider store={store}>
        <PaymentsScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Find and click the first transaction
    fireEvent.press(getByText("Transaction #1"));

    // Check if navigation was called with correct screen and params
    expect(mockNavigation.navigate).toHaveBeenCalledWith("PaymentDetails", {
      id: "1",
    });
  });

  it("shows loading indicator when transactions are loading", () => {
    // Create store with loading state
    const loadingStore = mockStore({
      payments: {
        ...mockPaymentsData.payments,
        isLoading: true,
        transactions: [],
      },
    });

    const { getByText } = render(
      <Provider store={loadingStore}>
        <PaymentsScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Check if loading indicator is shown
    expect(getByText("Loading transactions...")).toBeTruthy();
  });

  it("shows error message and retry button when there is an error", () => {
    // Create store with error
    const errorStore = mockStore({
      payments: {
        ...mockPaymentsData.payments,
        error: "Failed to load transactions",
      },
    });

    const { getByText } = render(
      <Provider store={errorStore}>
        <PaymentsScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Check if error message and retry button are shown
    expect(getByText("Failed to load transactions")).toBeTruthy();
    expect(getByText("Try Again")).toBeTruthy();
  });

  it("dispatches fetchTransactions again when retry button is clicked", () => {
    // Create store with error
    const errorStore = mockStore({
      payments: {
        ...mockPaymentsData.payments,
        error: "Failed to load transactions",
      },
    });

    // Mock dispatch function
    errorStore.dispatch = jest.fn().mockImplementation(() => Promise.resolve());

    const { getByText } = render(
      <Provider store={errorStore}>
        <PaymentsScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Initial dispatch on mount
    expect(errorStore.dispatch).toHaveBeenCalledTimes(1);

    // Find and click the retry button
    fireEvent.press(getByText("Try Again"));

    // Check if fetchTransactions was dispatched again
    expect(errorStore.dispatch).toHaveBeenCalledTimes(2);
  });

  it("shows pagination controls when there are multiple pages", () => {
    // Create store with multiple pages
    const multiPageStore = mockStore({
      payments: {
        ...mockPaymentsData.payments,
        pagination: { page: 1, limit: 10, total: 25, totalPages: 3 },
      },
    });

    const { getByText } = render(
      <Provider store={multiPageStore}>
        <PaymentsScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Check if pagination controls are shown
    expect(getByText("Previous")).toBeTruthy();
    expect(getByText("Next")).toBeTruthy();
    expect(getByText("Page 1 of 3")).toBeTruthy();
  });

  it("disables Previous button on first page", () => {
    // Create store with multiple pages
    const multiPageStore = mockStore({
      payments: {
        ...mockPaymentsData.payments,
        pagination: { page: 1, limit: 10, total: 25, totalPages: 3 },
      },
    });

    const { getByText } = render(
      <Provider store={multiPageStore}>
        <PaymentsScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Check if Previous button is disabled
    const previousButton = getByText("Previous").parent;
    expect(previousButton.props.disabled).toBe(true);
  });
});
