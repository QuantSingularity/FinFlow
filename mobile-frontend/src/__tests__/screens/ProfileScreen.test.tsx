import { render } from "@testing-library/react-native";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import ProfileScreen from "../../../screens/profile/ProfileScreen";

const mockStore = configureStore([]);

describe("ProfileScreen", () => {
  let store: any;
  let navigation: any;

  beforeEach(() => {
    store = mockStore({
      auth: {
        user: {
          id: "1",
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
          role: "user",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
        token: "test-token",
        isLoading: false,
        error: null,
      },
    });
    navigation = {
      navigate: jest.fn(),
      goBack: jest.fn(),
    };
  });

  it("renders correctly with user data", () => {
    const { getByText } = render(
      <Provider store={store}>
        <ProfileScreen navigation={navigation} />
      </Provider>,
    );

    expect(getByText("John Doe")).toBeTruthy();
    expect(getByText("test@example.com")).toBeTruthy();
    expect(getByText("user")).toBeTruthy();
  });

  it("displays personal information section", () => {
    const { getByText } = render(
      <Provider store={store}>
        <ProfileScreen navigation={navigation} />
      </Provider>,
    );

    expect(getByText("Personal Information")).toBeTruthy();
    expect(getByText("Edit")).toBeTruthy();
  });

  it("displays logout button", () => {
    const { getByText } = render(
      <Provider store={store}>
        <ProfileScreen navigation={navigation} />
      </Provider>,
    );

    expect(getByText("Logout")).toBeTruthy();
  });
});
