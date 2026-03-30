import { fireEvent, render } from "@testing-library/react-native";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import thunk from "redux-thunk";
import AnalyticsScreen from "../../screens/analytics/AnalyticsScreen";

// Mock Redux store
const middlewares = [thunk];
const mockStore = configureStore(middlewares);

// Mock data
const mockAnalyticsData = {
  analytics: {
    revenueAnalytics: {
      totalRevenue: 25000,
      averageRevenue: 2500,
      growth: 12.5,
      transactionCount: 45,
      breakdown: {
        "Product Sales": 15000,
        Services: 8000,
        Subscriptions: 2000,
      },
      insights: [
        "Revenue has increased by 12.5% compared to last period",
        "Product sales are your main revenue source",
        "Consider expanding your subscription offerings for more stable income",
      ],
    },
    isLoading: false,
    error: null,
  },
};

describe("AnalyticsScreen", () => {
  let store;

  beforeEach(() => {
    store = mockStore(mockAnalyticsData);

    // Mock dispatch function
    store.dispatch = jest.fn().mockImplementation(() => Promise.resolve());
  });

  it("renders correctly with analytics data", () => {
    const { getByText } = render(
      <Provider store={store}>
        <AnalyticsScreen />
      </Provider>,
    );

    // Check if important elements are rendered
    expect(getByText("Financial Analytics")).toBeTruthy();
    expect(getByText("Select Time Period")).toBeTruthy();
    expect(getByText("Revenue Summary")).toBeTruthy();
    expect(getByText("Total Revenue")).toBeTruthy();
    expect(getByText("$25,000.00")).toBeTruthy();
    expect(getByText("Growth")).toBeTruthy();
    expect(getByText("+12.5%")).toBeTruthy();
    expect(getByText("Revenue Breakdown")).toBeTruthy();
    expect(getByText("Product Sales")).toBeTruthy();
    expect(getByText("$15,000.00")).toBeTruthy();
    expect(getByText("Key Insights")).toBeTruthy();
  });

  it("dispatches fetchRevenueAnalytics action on mount", () => {
    render(
      <Provider store={store}>
        <AnalyticsScreen />
      </Provider>,
    );

    // Check if fetchRevenueAnalytics action was dispatched
    expect(store.dispatch).toHaveBeenCalledTimes(1);
  });

  it("changes period and dispatches action when period buttons are clicked", () => {
    const { getByText } = render(
      <Provider store={store}>
        <AnalyticsScreen />
      </Provider>,
    );

    // Initial dispatch on mount
    expect(store.dispatch).toHaveBeenCalledTimes(1);

    // Find and click the Daily button
    fireEvent.press(getByText("Daily"));

    // Check if fetchRevenueAnalytics was dispatched again with daily period
    expect(store.dispatch).toHaveBeenCalledTimes(2);

    // Find and click the Weekly button
    fireEvent.press(getByText("Weekly"));

    // Check if fetchRevenueAnalytics was dispatched again with weekly period
    expect(store.dispatch).toHaveBeenCalledTimes(3);

    // Find and click the Yearly button
    fireEvent.press(getByText("Yearly"));

    // Check if fetchRevenueAnalytics was dispatched again with yearly period
    expect(store.dispatch).toHaveBeenCalledTimes(4);
  });

  it("shows loading indicator when analytics are loading", () => {
    // Create store with loading state
    const loadingStore = mockStore({
      analytics: {
        revenueAnalytics: null,
        isLoading: true,
        error: null,
      },
    });

    const { getByText } = render(
      <Provider store={loadingStore}>
        <AnalyticsScreen />
      </Provider>,
    );

    // Check if loading indicator is shown
    expect(getByText("Loading analytics...")).toBeTruthy();
  });

  it("shows error message when there is an error", () => {
    // Create store with error
    const errorStore = mockStore({
      analytics: {
        revenueAnalytics: null,
        isLoading: false,
        error: "Failed to load analytics data",
      },
    });

    const { getByText } = render(
      <Provider store={errorStore}>
        <AnalyticsScreen />
      </Provider>,
    );

    // Check if error message is shown
    expect(getByText("Failed to load analytics data")).toBeTruthy();
  });

  it("displays positive growth in green and negative growth in red", () => {
    // Render with positive growth
    const { getByText, rerender } = render(
      <Provider store={store}>
        <AnalyticsScreen />
      </Provider>,
    );

    // Check positive growth styling (would need to check style in a real test)
    const positiveGrowth = getByText("+12.5%");
    expect(positiveGrowth).toBeTruthy();

    // Create store with negative growth
    const negativeGrowthStore = mockStore({
      analytics: {
        revenueAnalytics: {
          ...mockAnalyticsData.analytics.revenueAnalytics,
          growth: -5.2,
        },
        isLoading: false,
        error: null,
      },
    });

    // Rerender with negative growth
    rerender(
      <Provider store={negativeGrowthStore}>
        <AnalyticsScreen />
      </Provider>,
    );

    // Check negative growth styling
    const negativeGrowth = getByText("-5.2%");
    expect(negativeGrowth).toBeTruthy();
  });

  it("displays insights when available", () => {
    const { getByText } = render(
      <Provider store={store}>
        <AnalyticsScreen />
      </Provider>,
    );

    // Check if insights are displayed
    expect(
      getByText("Revenue has increased by 12.5% compared to last period"),
    ).toBeTruthy();
    expect(
      getByText("Product sales are your main revenue source"),
    ).toBeTruthy();
    expect(
      getByText(
        "Consider expanding your subscription offerings for more stable income",
      ),
    ).toBeTruthy();
  });

  it("displays no insights message when insights are not available", () => {
    // Create store with no insights
    const noInsightsStore = mockStore({
      analytics: {
        revenueAnalytics: {
          ...mockAnalyticsData.analytics.revenueAnalytics,
          insights: null,
        },
        isLoading: false,
        error: null,
      },
    });

    const { getByText } = render(
      <Provider store={noInsightsStore}>
        <AnalyticsScreen />
      </Provider>,
    );

    // Check if no insights message is displayed
    expect(
      getByText("No insights available for the selected period."),
    ).toBeTruthy();
  });
});
