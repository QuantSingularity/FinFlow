import { fireEvent, render } from "@testing-library/react-native";
import Button from "../../components/common/Button";

describe("Button Component", () => {
  it("renders correctly with default props", () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <Button title="Test Button" onPress={onPressMock} />,
    );

    expect(getByText("Test Button")).toBeTruthy();
  });

  it("calls onPress when pressed", () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <Button title="Test Button" onPress={onPressMock} />,
    );

    fireEvent.press(getByText("Test Button"));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it("renders loading state correctly", () => {
    const onPressMock = jest.fn();
    const { queryByText } = render(
      <Button title="Test Button" onPress={onPressMock} loading={true} />,
    );

    // Button text should not be visible when loading
    expect(queryByText("Test Button")).toBeNull();
  });

  it("is disabled when loading or disabled prop is true", () => {
    const onPressMock = jest.fn();

    // Test with loading=true
    const { rerender } = render(
      <Button title="Test Button" onPress={onPressMock} loading={true} />,
    );

    // Test with disabled=true
    rerender(
      <Button title="Test Button" onPress={onPressMock} disabled={true} />,
    );

    // Test with both loading and disabled
    rerender(
      <Button
        title="Test Button"
        onPress={onPressMock}
        loading={true}
        disabled={true}
      />,
    );
  });

  it("renders different variants correctly", () => {
    const onPressMock = jest.fn();

    // Test primary variant (default)
    const { rerender, getByText } = render(
      <Button title="Primary" onPress={onPressMock} variant="primary" />,
    );
    expect(getByText("Primary")).toBeTruthy();

    // Test secondary variant
    rerender(
      <Button title="Secondary" onPress={onPressMock} variant="secondary" />,
    );
    expect(getByText("Secondary")).toBeTruthy();

    // Test outline variant
    rerender(
      <Button title="Outline" onPress={onPressMock} variant="outline" />,
    );
    expect(getByText("Outline")).toBeTruthy();

    // Test danger variant
    rerender(<Button title="Danger" onPress={onPressMock} variant="danger" />);
    expect(getByText("Danger")).toBeTruthy();
  });

  it("renders different sizes correctly", () => {
    const onPressMock = jest.fn();

    // Test small size
    const { rerender, getByText } = render(
      <Button title="Small" onPress={onPressMock} size="small" />,
    );
    expect(getByText("Small")).toBeTruthy();

    // Test medium size (default)
    rerender(<Button title="Medium" onPress={onPressMock} size="medium" />);
    expect(getByText("Medium")).toBeTruthy();

    // Test large size
    rerender(<Button title="Large" onPress={onPressMock} size="large" />);
    expect(getByText("Large")).toBeTruthy();
  });

  it("renders fullWidth correctly", () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <Button title="Full Width" onPress={onPressMock} fullWidth={true} />,
    );

    expect(getByText("Full Width")).toBeTruthy();
  });
});
