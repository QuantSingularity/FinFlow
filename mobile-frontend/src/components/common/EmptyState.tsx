import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: string;
  buttonText?: string;
  onButtonPress?: () => void;
  loading?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon = "information-circle-outline",
  buttonText,
  onButtonPress,
  loading = false,
}) => {
  return (
    <View style={styles.container}>
      <Ionicons
        name={icon as any}
        size={64}
        color="#bdc3c7"
        style={styles.icon}
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {buttonText && onButtonPress && (
        <TouchableOpacity
          style={styles.button}
          onPress={onButtonPress}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>{buttonText}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#3498db",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default EmptyState;
