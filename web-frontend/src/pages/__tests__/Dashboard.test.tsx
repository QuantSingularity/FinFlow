import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import configureStore from "redux-mock-store";
import thunk from "redux-thunk";
import Dashboard from "../Dashboard";

// Mock store
const middlewares = [thunk];
const mockStore = configureStore(middlewares);

// Mock services
jest.mock("../../services/analyticsService", () => ({
  getDashboardMetrics: jest.fn().mockResolvedValue({
    revenueMetrics: {
      currentMonth: 15000,
      previousMonth: 12000,
      percentageChange: 25,
      trend: [10000, 11000, 12000, 15000],
    },
    expenseMetrics: {
      currentMonth: 9000,
      previousMonth: 8500,
      percentageChange: 5.88,
      trend: [7000, 8000, 8500, 9000],
    },
    profitMetrics: {
      currentMonth: 6000,
      previousMonth: 3500,
      percentageChange: 71.43,
      trend: [3000, 3000, 3500, 6000],
    },
    cashFlowMetrics: {
      currentMonth: 5000,
      previousMonth: 4000,
      percentageChange: 25,
      trend: [2000, 3000, 4000, 5000],
    },
    topExpenseCategories: [
      { category: "Rent", amount: 3000, percentage: 33.33 },
      { category: "Salaries", amount: 4000, percentage: 44.44 },
      { category: "Utilities", amount: 1000, percentage: 11.11 },
      { category: "Supplies", amount: 1000, percentage: 11.11 },
    ],
    recentTransactions: [
      {
        id: "tx_1",
        date: new Date(),
        description: "Sale",
        amount: 1000,
        type: "income",
      },
      {
        id: "tx_2",
        date: new Date(),
        description: "Rent payment",
        amount: 3000,
        type: "expense",
      },
    ],
  }),
  getPaymentAnalytics: jest.fn().mockResolvedValue({
    processorBreakdown: [
      { processor: "STRIPE", count: 150, amount: 15000, percentage: 60 },
      { processor: "PAYPAL", count: 75, amount: 7500, percentage: 30 },
      { processor: "SQUARE", count: 25, amount: 2500, percentage: 10 },
    ],
    statusBreakdown: [
      { status: "COMPLETED", count: 200, amount: 20000, percentage: 80 },
      { status: "PENDING", count: 30, amount: 3000, percentage: 12 },
      { status: "FAILED", count: 20, amount: 2000, percentage: 8 },
    ],
  }),
}));

describe("Dashboard Component", () => {
  let store;

  beforeEach(() => {
    store = mockStore({
      auth: {
        user: {
          id: "user_123",
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
          role: "admin",
        },
        isAuthenticated: true,
      },
      ui: {
        dashboardLoading: false,
        error: null,
      },
    });

    // Mock dispatch
    store.dispatch = jest.fn().mockImplementation(() => Promise.resolve());
  });

  test("renders dashboard with all sections", async () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </Provider>,
    );

    // Check if dashboard title is rendered
    expect(screen.getByText(/financial overview/i)).toBeInTheDocument();

    // Check if KPI sections are rendered
    await waitFor(() => {
      expect(screen.getByText(/revenue/i)).toBeInTheDocument();
      expect(screen.getByText(/expenses/i)).toBeInTheDocument();
      expect(screen.getByText(/profit/i)).toBeInTheDocument();
      expect(screen.getByText(/cash flow/i)).toBeInTheDocument();
    });

    // Check if charts are rendered
    await waitFor(() => {
      expect(screen.getByTestId("revenue-chart")).toBeInTheDocument();
      expect(screen.getByTestId("expense-breakdown-chart")).toBeInTheDocument();
    });

    // Check if recent transactions section is rendered
    await waitFor(() => {
      expect(screen.getByText(/recent transactions/i)).toBeInTheDocument();
      expect(screen.getByText(/sale/i)).toBeInTheDocument();
      expect(screen.getByText(/rent payment/i)).toBeInTheDocument();
    });
  });

  test("displays loading state while fetching data", async () => {
    // Set loading state to true
    store = mockStore({
      auth: {
        user: {
          id: "user_123",
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
          role: "admin",
        },
        isAuthenticated: true,
      },
      ui: {
        dashboardLoading: true,
        error: null,
      },
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </Provider>,
    );

    // Check if loading indicators are displayed
    expect(screen.getByTestId("dashboard-loading")).toBeInTheDocument();
  });

  test("displays error message when data fetching fails", async () => {
    // Set error state
    store = mockStore({
      auth: {
        user: {
          id: "user_123",
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
          role: "admin",
        },
        isAuthenticated: true,
      },
      ui: {
        dashboardLoading: false,
        error: "Failed to load dashboard data",
      },
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </Provider>,
    );

    // Check if error message is displayed
    expect(
      screen.getByText(/failed to load dashboard data/i),
    ).toBeInTheDocument();

    // Check if retry button is displayed
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  test("refreshes data when date range is changed", async () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </Provider>,
    );

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/financial overview/i)).toBeInTheDocument();
    });

    // Find and click date range selector
    const dateRangeSelector = screen.getByLabelText(/date range/i);
    fireEvent.click(dateRangeSelector);

    // Select a different date range
    const monthlyOption = screen.getByText(/monthly/i);
    fireEvent.click(monthlyOption);

    // Check if dispatch was called to refresh data
    await waitFor(() => {
      expect(store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining("FETCH_DASHBOARD_DATA"),
        }),
      );
    });
  });

  test("navigates to detailed view when clicking on a KPI card", async () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </Provider>,
    );

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/revenue/i)).toBeInTheDocument();
    });

    // Find and click on revenue card
    const revenueCard = screen.getByTestId("revenue-card");
    fireEvent.click(revenueCard);

    // Check if navigation occurred
    expect(window.location.pathname).toBe("/analytics/revenue");
  });

  test("displays correct percentage changes in KPI cards", async () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </Provider>,
    );

    // Wait for dashboard to load and check percentage changes
    await waitFor(() => {
      // Revenue: 25% increase
      expect(screen.getByTestId("revenue-percentage")).toHaveTextContent("25%");
      expect(screen.getByTestId("revenue-percentage")).toHaveClass("positive");

      // Expenses: 5.88% increase (negative for expenses)
      expect(screen.getByTestId("expenses-percentage")).toHaveTextContent(
        "5.88%",
      );
      expect(screen.getByTestId("expenses-percentage")).toHaveClass("negative");

      // Profit: 71.43% increase
      expect(screen.getByTestId("profit-percentage")).toHaveTextContent(
        "71.43%",
      );
      expect(screen.getByTestId("profit-percentage")).toHaveClass("positive");
    });
  });

  test("allows filtering transactions by type", async () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </Provider>,
    );

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/recent transactions/i)).toBeInTheDocument();
    });

    // Find and click on filter dropdown
    const filterDropdown = screen.getByLabelText(/filter transactions/i);
    fireEvent.click(filterDropdown);

    // Select "Income only" filter
    const incomeFilter = screen.getByText(/income only/i);
    fireEvent.click(incomeFilter);

    // Check if only income transactions are displayed
    expect(screen.getByText(/sale/i)).toBeInTheDocument();
    expect(screen.queryByText(/rent payment/i)).not.toBeInTheDocument();
  });
});
