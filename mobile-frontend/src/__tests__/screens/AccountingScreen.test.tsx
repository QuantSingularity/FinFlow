import { render } from "@testing-library/react-native";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import AccountingScreen from "../../../screens/accounting/AccountingScreen";

const mockStore = configureStore([]);

describe("AccountingScreen", () => {
  let store: any;
  let navigation: any;

  beforeEach(() => {
    store = mockStore({
      accounting: {
        journalEntries: [],
        balanceSheet: null,
        incomeStatement: null,
        cashFlowStatement: null,
        isLoading: false,
        error: null,
      },
    });
    navigation = {
      navigate: jest.fn(),
    };
  });

  it("renders correctly", () => {
    const { getByText } = render(
      <Provider store={store}>
        <AccountingScreen navigation={navigation} />
      </Provider>,
    );

    expect(getByText("Accounting")).toBeTruthy();
    expect(getByText("Financial Reports & Statements")).toBeTruthy();
    expect(getByText("Balance Sheet")).toBeTruthy();
    expect(getByText("Income Statement")).toBeTruthy();
    expect(getByText("Cash Flow")).toBeTruthy();
  });

  it("displays report cards", () => {
    const { getByText } = render(
      <Provider store={store}>
        <AccountingScreen navigation={navigation} />
      </Provider>,
    );

    expect(getByText("View assets, liabilities, and equity")).toBeTruthy();
    expect(getByText("Revenue and expenses report")).toBeTruthy();
    expect(getByText("Cash inflows and outflows")).toBeTruthy();
  });
});
