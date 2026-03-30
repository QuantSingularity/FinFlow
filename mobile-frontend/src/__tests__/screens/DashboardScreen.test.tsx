import { fireEvent, render } from "@testing-library/react-native";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import thunk from "redux-thunk";
import DashboardScreen from "../../screens/dashboard/DashboardScreen";

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
};

// Mock Redux store
const middlewares = [thunk];
const mockStore = configureStore(middlewares);

// Mock data
const mockDashboardData = {
  auth: {
    user: {
      id: "123",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
    },
    token: "mock-token",
    isLoading: false,
    error: null,
  },
  analytics: {
    dashboardMetrics: {
      totalRevenue: "$15,000",
      revenueChange: 5.2,
      totalExpenses: "$8,500",
      expensesChange: -2.1,
      transactionCount: "120",
      transactionCountChange: 12.5,
      currentBalance: "$6,500",
      balanceChange: 8.3,
    },
    isLoading: false,
    error: null,
  },
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
    ],
    isLoading: false,
    error: null,
    pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
  },
  credit: {
    creditScore: {
      score: 720,
      factors: [
        {
          factor: "Payment History",
          impact: "positive",
          description: "You have a good payment history",
        },
        {
          factor: "Credit Utilization",
          impact: "neutral",
          description: "Your credit utilization is moderate",
        },
      ],
    },
    isLoading: false,
    error: null,
  },
  accounting: {
    balanceSheet: {
      assets: { Cash: 5000, "Accounts Receivable": 3000 },
      liabilities: { "Accounts Payable": 2000 },
      equity: { "Owner Equity": 6000 },
    },
    isLoading: false,
    error: null,
  },
};

describe("DashboardScreen", () => {
  let store;

  beforeEach(() => {
    store = mockStore(mockDashboardData);

    // Mock dispatch function
    store.dispatch = jest.fn().mockImplementation(() => Promise.resolve());

    // Clear navigation mocks
    mockNavigation.navigate.mockClear();
  });

  it("renders correctly with data", () => {
    const { getByText } = render(
      <Provider store={store}>
        <DashboardScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Check if important elements are rendered
    expect(getByText("Hello, John")).toBeTruthy();
    expect(getByText("Financial Overview")).toBeTruthy();
    expect(getByText("Total Revenue")).toBeTruthy();
    expect(getByText("$15,000")).toBeTruthy();
    expect(getByText("Recent Transactions")).toBeTruthy();
    expect(getByText("Credit Score")).toBeTruthy();
    expect(getByText("Financial Reports")).toBeTruthy();
  });

  it("dispatches required actions on mount", () => {
    render(
      <Provider store={store}>
        <DashboardScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Check if all required actions were dispatched
    expect(store.dispatch).toHaveBeenCalledTimes(4);
  });

  it("navigates to Payments screen when View All is clicked", () => {
    const { getAllByText } = render(
      <Provider store={store}>
        <DashboardScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Find and click the "View All" button for transactions
    const viewAllButtons = getAllByText("View All");
    fireEvent.press(viewAllButtons[0]);

    // Check if navigation was called with correct screen
    expect(mockNavigation.navigate).toHaveBeenCalledWith("Payments");
  });

  it("navigates to Credit Score screen when Details is clicked", () => {
    const { getByText } = render(
      <Provider store={store}>
        <DashboardScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Find and click the "Details" button for credit score
    fireEvent.press(getByText("Details"));

    // Check if navigation was called with correct screen
    expect(mockNavigation.navigate).toHaveBeenCalledWith("Credit", {
      screen: "CreditScore",
    });
  });

  it("navigates to Accounting screen when View All is clicked for reports", () => {
    const { getAllByText } = render(
      <Provider store={store}>
        <DashboardScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Find and click the second "View All" button (for financial reports)
    const viewAllButtons = getAllByText("View All");
    fireEvent.press(viewAllButtons[1]);

    // Check if navigation was called with correct screen
    expect(mockNavigation.navigate).toHaveBeenCalledWith("Accounting");
  });

  it("shows loading indicator when data is loading", () => {
    // Create store with loading state
    const loadingStore = mockStore({
      ...mockDashboardData,
      analytics: {
        ...mockDashboardData.analytics,
        isLoading: true,
        dashboardMetrics: null,
      },
      payments: {
        ...mockDashboardData.payments,
        isLoading: true,
        transactions: [],
      },
      credit: {
        ...mockDashboardData.credit,
        isLoading: true,
        creditScore: null,
      },
      accounting: {
        ...mockDashboardData.accounting,
        isLoading: true,
        balanceSheet: null,
      },
    });

    const { getByText } = render(
      <Provider store={loadingStore}>
        <DashboardScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Check if loading indicator is shown
    expect(getByText("Loading dashboard...")).toBeTruthy();
  });

  it("displays correct credit score category based on score value", () => {
    const { getByText } = render(
      <Provider store={store}>
        <DashboardScreen navigation={mockNavigation} />
      </Provider>,
    );

    // Credit score of 720 should be in the "Good" category
    expect(getByText("Good")).toBeTruthy();
  });
});
