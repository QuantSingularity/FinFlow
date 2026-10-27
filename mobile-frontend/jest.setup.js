import "react-native-gesture-handler/jestSetup";

jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock("@react-navigation/native", () => {
  return {
    ...jest.requireActual("@react-navigation/native"),
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
  };
});

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// @expo/vector-icons loads fonts asynchronously and updates state after the
// test has finished rendering, which triggers act() warnings and slows tests.
// Replace every icon set with a synchronous stub that still exposes the icon
// name (as accessibilityLabel/testID-friendly text) for assertions.
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const createIconStub = (family) => {
    const Icon = ({ name, size, color, ...rest }) =>
      React.createElement(
        Text,
        { ...rest, accessibilityElementsHidden: true },
        `${family}:${name}`,
      );
    Icon.displayName = `${family}IconStub`;
    return Icon;
  };
  return new Proxy(
    { __esModule: true },
    {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        if (typeof prop !== "string" || prop === "then") return undefined;
        return createIconStub(prop);
      },
    },
  );
});

jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const Icon = ({ name, size, color, ...rest }) =>
    React.createElement(
      Text,
      { ...rest, accessibilityElementsHidden: true },
      `MaterialCommunityIcons:${name}`,
    );
  Icon.displayName = "MaterialCommunityIconsStub";
  return { __esModule: true, default: Icon };
});
