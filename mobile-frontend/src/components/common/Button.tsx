import type React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  type TextStyle,
  TouchableOpacity,
  type ViewStyle,
} from "react-native";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const getButtonStyle = () => {
    let buttonStyle: ViewStyle = { ...styles.button };

    // Variant styles
    switch (variant) {
      case "primary":
        buttonStyle = { ...buttonStyle, ...styles.primaryButton };
        break;
      case "secondary":
        buttonStyle = { ...buttonStyle, ...styles.secondaryButton };
        break;
      case "outline":
        buttonStyle = { ...buttonStyle, ...styles.outlineButton };
        break;
      case "danger":
        buttonStyle = { ...buttonStyle, ...styles.dangerButton };
        break;
    }

    // Size styles
    switch (size) {
      case "small":
        buttonStyle = { ...buttonStyle, ...styles.smallButton };
        break;
      case "medium":
        buttonStyle = { ...buttonStyle, ...styles.mediumButton };
        break;
      case "large":
        buttonStyle = { ...buttonStyle, ...styles.largeButton };
        break;
    }

    // Full width
    if (fullWidth) {
      buttonStyle = { ...buttonStyle, ...styles.fullWidth };
    }

    // Disabled state
    if (disabled) {
      buttonStyle = { ...buttonStyle, ...styles.disabledButton };
    }

    return buttonStyle;
  };

  const getTextStyle = () => {
    let textStyleObj: TextStyle = { ...styles.buttonText };

    // Variant text styles
    switch (variant) {
      case "primary":
        textStyleObj = { ...textStyleObj, ...styles.primaryText };
        break;
      case "secondary":
        textStyleObj = { ...textStyleObj, ...styles.secondaryText };
        break;
      case "outline":
        textStyleObj = { ...textStyleObj, ...styles.outlineText };
        break;
      case "danger":
        textStyleObj = { ...textStyleObj, ...styles.dangerText };
        break;
    }

    // Size text styles
    switch (size) {
      case "small":
        textStyleObj = { ...textStyleObj, ...styles.smallText };
        break;
      case "medium":
        textStyleObj = { ...textStyleObj, ...styles.mediumText };
        break;
      case "large":
        textStyleObj = { ...textStyleObj, ...styles.largeText };
        break;
    }

    // Disabled text
    if (disabled) {
      textStyleObj = { ...textStyleObj, ...styles.disabledText };
    }

    return textStyleObj;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "outline" ? "#3498db" : "#ffffff"}
          size="small"
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  primaryButton: {
    backgroundColor: "#3498db",
  },
  secondaryButton: {
    backgroundColor: "#2ecc71",
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#3498db",
  },
  dangerButton: {
    backgroundColor: "#e74c3c",
  },
  smallButton: {
    height: 32,
    paddingHorizontal: 12,
  },
  mediumButton: {
    height: 44,
    paddingHorizontal: 16,
  },
  largeButton: {
    height: 56,
    paddingHorizontal: 24,
  },
  fullWidth: {
    width: "100%",
  },
  disabledButton: {
    backgroundColor: "#bdc3c7",
    borderColor: "#bdc3c7",
  },
  buttonText: {
    fontWeight: "600",
    textAlign: "center",
  },
  primaryText: {
    color: "#ffffff",
  },
  secondaryText: {
    color: "#ffffff",
  },
  outlineText: {
    color: "#3498db",
  },
  dangerText: {
    color: "#ffffff",
  },
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
  disabledText: {
    color: "#7f8c8d",
  },
});

export default Button;
