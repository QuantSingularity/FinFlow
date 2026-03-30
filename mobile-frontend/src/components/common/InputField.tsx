import type React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: ViewStyle;
  required?: boolean;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  containerStyle,
  required = false,
  ...props
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          error ? styles.inputError : null,
          props.editable === false ? styles.disabledInput : null,
        ]}
        placeholderTextColor="#95a5a6"
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
    color: "#2c3e50",
  },
  required: {
    color: "#e74c3c",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#bdc3c7",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#2c3e50",
    backgroundColor: "#ffffff",
  },
  inputError: {
    borderColor: "#e74c3c",
  },
  disabledInput: {
    backgroundColor: "#ecf0f1",
    color: "#7f8c8d",
  },
  errorText: {
    color: "#e74c3c",
    fontSize: 12,
    marginTop: 4,
  },
});

export default InputField;
