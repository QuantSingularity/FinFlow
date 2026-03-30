import type React from "react";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import InputField from "../../components/common/InputField";
import type { AppDispatch, RootState } from "../../store";
import { applyForLoan } from "../../store/slices/creditSlice";

const ApplyLoanScreen: React.FC = ({ navigation }: any) => {
  const [amount, setAmount] = useState("");
  const [term, setTerm] = useState("");
  const [purpose, setPurpose] = useState("");
  const [errors, setErrors] = useState({ amount: "", term: "", purpose: "" });

  const dispatch = useDispatch<AppDispatch>();
  const { isLoading } = useSelector((state: RootState) => state.credit);

  const validateForm = () => {
    const newErrors = { amount: "", term: "", purpose: "" };
    let isValid = true;

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = "Please enter a valid amount";
      isValid = false;
    }

    if (!term || parseInt(term, 10) <= 0 || parseInt(term, 10) > 360) {
      newErrors.term = "Please enter a valid term (1-360 months)";
      isValid = false;
    }

    if (!purpose || purpose.length < 10) {
      newErrors.purpose =
        "Please provide a detailed purpose (min 10 characters)";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        await dispatch(
          applyForLoan({
            amount: parseFloat(amount),
            term: parseInt(term, 10),
            purpose,
          }),
        ).unwrap();

        Alert.alert(
          "Application Submitted",
          "Your loan application has been submitted successfully. We will review it and get back to you soon.",
          [
            {
              text: "OK",
              onPress: () => navigation.navigate("Loans"),
            },
          ],
        );
      } catch (error: any) {
        Alert.alert("Error", error.toString());
      }
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Card style={styles.formCard}>
        <Text style={styles.title}>Apply for Loan</Text>
        <Text style={styles.subtitle}>
          Fill in the details below to submit your loan application
        </Text>

        <InputField
          label="Loan Amount"
          placeholder="Enter amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          error={errors.amount}
          required
        />

        <InputField
          label="Loan Term (months)"
          placeholder="Enter term in months"
          value={term}
          onChangeText={setTerm}
          keyboardType="numeric"
          error={errors.term}
          required
        />

        <InputField
          label="Purpose"
          placeholder="Describe the purpose of the loan"
          value={purpose}
          onChangeText={setPurpose}
          multiline
          numberOfLines={4}
          error={errors.purpose}
          required
        />

        <Button
          title="Submit Application"
          onPress={handleSubmit}
          loading={isLoading}
          fullWidth
          style={styles.submitButton}
        />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  contentContainer: {
    padding: 16,
  },
  formCard: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 24,
  },
  submitButton: {
    marginTop: 16,
  },
});

export default ApplyLoanScreen;
