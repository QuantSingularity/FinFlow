import { render } from "@testing-library/react-native";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import thunk from "redux-thunk";
import CreditScoreScreen from "../../screens/credit/CreditScoreScreen";

// Mock Redux store
const middlewares = [thunk];
const mockStore = configureStore(middlewares);

// Mock data
const mockCreditData = {
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
        {
          factor: "Credit Age",
          impact: "negative",
          description: "Your credit history is relatively new",
        },
      ],
    },
    isLoading: false,
    error: null,
  },
};

describe("CreditScoreScreen", () => {
  let store;

  beforeEach(() => {
    store = mockStore(mockCreditData);

    // Mock dispatch function
    store.dispatch = jest.fn().mockImplementation(() => Promise.resolve());
  });

  it("renders correctly with credit score data", () => {
    const { getByText } = render(
      <Provider store={store}>
        <CreditScoreScreen />
      </Provider>,
    );

    // Check if important elements are rendered
    expect(getByText("Your Credit Score")).toBeTruthy();
    expect(getByText("720")).toBeTruthy();
    expect(getByText("Good")).toBeTruthy();
    expect(getByText("Factors Affecting Your Score")).toBeTruthy();
    expect(getByText("Payment History")).toBeTruthy();
    expect(getByText("You have a good payment history")).toBeTruthy();
    expect(getByText("Credit Utilization")).toBeTruthy();
    expect(getByText("Your credit utilization is moderate")).toBeTruthy();
    expect(getByText("Credit Age")).toBeTruthy();
    expect(getByText("Your credit history is relatively new")).toBeTruthy();
    expect(getByText("Tips to Improve Your Score")).toBeTruthy();
  });

  it("dispatches fetchCreditScore action on mount", () => {
    render(
      <Provider store={store}>
        <CreditScoreScreen />
      </Provider>,
    );

    // Check if fetchCreditScore action was dispatched
    expect(store.dispatch).toHaveBeenCalledTimes(1);
  });

  it("shows loading indicator when credit score is loading", () => {
    // Create store with loading state
    const loadingStore = mockStore({
      credit: {
        creditScore: null,
        isLoading: true,
        error: null,
      },
    });

    const { getByText } = render(
      <Provider store={loadingStore}>
        <CreditScoreScreen />
      </Provider>,
    );

    // Check if loading indicator is shown
    expect(getByText("Loading credit score...")).toBeTruthy();
  });

  it("shows error message when there is an error", () => {
    // Create store with error
    const errorStore = mockStore({
      credit: {
        creditScore: null,
        isLoading: false,
        error: "Failed to load credit score",
      },
    });

    const { getByText } = render(
      <Provider store={errorStore}>
        <CreditScoreScreen />
      </Provider>,
    );

    // Check if error message is shown
    expect(getByText("Failed to load credit score")).toBeTruthy();
  });

  it("displays correct credit score category based on score value", () => {
    // Test with different score values
    const testScores = [
      { score: 780, category: "Excellent" },
      { score: 720, category: "Good" },
      { score: 630, category: "Fair" },
      { score: 580, category: "Poor" },
    ];

    for (const testCase of testScores) {
      // Create store with specific score
      const scoreStore = mockStore({
        credit: {
          creditScore: {
            ...mockCreditData.credit.creditScore,
            score: testCase.score,
          },
          isLoading: false,
          error: null,
        },
      });

      const { getByText, unmount } = render(
        <Provider store={scoreStore}>
          <CreditScoreScreen />
        </Provider>,
      );

      // Check if correct category is displayed
      expect(getByText(testCase.category)).toBeTruthy();

      // Unmount to prepare for next test case
      unmount();
    }
  });

  it("displays impact badges with correct styling", () => {
    const { getByText } = render(
      <Provider store={store}>
        <CreditScoreScreen />
      </Provider>,
    );

    // Check if impact badges are displayed
    expect(getByText("positive")).toBeTruthy();
    expect(getByText("neutral")).toBeTruthy();
    expect(getByText("negative")).toBeTruthy();
  });

  it("displays tips to improve credit score", () => {
    const { getByText } = render(
      <Provider store={store}>
        <CreditScoreScreen />
      </Provider>,
    );

    // Check if tips are displayed
    expect(getByText("Tips to Improve Your Score")).toBeTruthy();
    expect(getByText("Pay bills on time")).toBeTruthy();
    expect(getByText("Keep credit utilization low")).toBeTruthy();
    expect(getByText("Maintain a long credit history")).toBeTruthy();
  });
});
