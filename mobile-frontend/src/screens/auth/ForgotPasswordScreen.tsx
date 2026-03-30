import type React from "react";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";

const ForgotPasswordScreen: React.FC = ({ navigation }: any) => {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = () => {
    if (!email) {
      setEmailError("Email is required");
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Email is invalid");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleResetPassword = async () => {
    if (validateEmail()) {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setEmailSent(true);
        Alert.alert(
          "Email Sent",
          "Password reset instructions have been sent to your email address.",
          [{ text: "OK", onPress: () => navigation.navigate("Login") }],
        );
      } catch (_error) {
        Alert.alert("Error", "Failed to send reset email. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter your email address and we'll send you instructions to reset your
          password.
        </Text>

        {!emailSent && (
          <>
            <InputField
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={emailError}
              required
            />

            <Button
              title="Send Reset Link"
              onPress={handleResetPassword}
              loading={isLoading}
              fullWidth
              style={styles.resetButton}
            />
          </>
        )}

        <TouchableOpacity
          onPress={() => navigation.navigate("Login")}
          style={styles.backContainer}
        >
          <Text style={styles.backText}>← Back to Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f9f9f9",
    justifyContent: "center",
    padding: 20,
  },
  formContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#3498db",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  resetButton: {
    marginTop: 8,
  },
  backContainer: {
    marginTop: 24,
    alignItems: "center",
  },
  backText: {
    color: "#3498db",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ForgotPasswordScreen;
