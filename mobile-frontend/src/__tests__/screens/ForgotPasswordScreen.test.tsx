import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import ForgotPasswordScreen from "../../../screens/auth/ForgotPasswordScreen";

const mockStore = configureStore([]);

describe("ForgotPasswordScreen", () => {
  let store: any;
  let navigation: any;

  beforeEach(() => {
    store = mockStore({
      auth: {
        isLoading: false,
        error: null,
      },
    });
    navigation = {
      navigate: jest.fn(),
    };
  });

  it("renders correctly", () => {
    const { getByText, getByPlaceholderText } = render(
      <Provider store={store}>
        <ForgotPasswordScreen navigation={navigation} />
      </Provider>,
    );

    expect(getByText("Reset Password")).toBeTruthy();
    expect(getByPlaceholderText("Enter your email")).toBeTruthy();
  });

  it("validates email field", async () => {
    const { getByText, getByPlaceholderText } = render(
      <Provider store={store}>
        <ForgotPasswordScreen navigation={navigation} />
      </Provider>,
    );

    const submitButton = getByText("Send Reset Link");
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(getByText("Email is required")).toBeTruthy();
    });
  });

  it("validates email format", async () => {
    const { getByText, getByPlaceholderText } = render(
      <Provider store={store}>
        <ForgotPasswordScreen navigation={navigation} />
      </Provider>,
    );

    const emailInput = getByPlaceholderText("Enter your email");
    fireEvent.changeText(emailInput, "invalid-email");

    const submitButton = getByText("Send Reset Link");
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(getByText("Email is invalid")).toBeTruthy();
    });
  });

  it("navigates to login screen", () => {
    const { getByText } = render(
      <Provider store={store}>
        <ForgotPasswordScreen navigation={navigation} />
      </Provider>,
    );

    const backButton = getByText("← Back to Login");
    fireEvent.press(backButton);

    expect(navigation.navigate).toHaveBeenCalledWith("Login");
  });
});
