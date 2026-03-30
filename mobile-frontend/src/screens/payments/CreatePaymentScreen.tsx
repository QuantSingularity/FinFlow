import type React from "react";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import InputField from "../../components/common/InputField";
import type { AppDispatch, RootState } from "../../store";
import { createPayment } from "../../store/slices/paymentsSlice";

const CreatePaymentScreen: React.FC = ({ navigation }: any) => {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("usd");
  const [processorType, setProcessorType] = useState("stripe");
  const [source, setSource] = useState("");
  const [description, setDescription] = useState("");

  const [amountError, setAmountError] = useState("");
  const [sourceError, setSourceError] = useState("");

  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector(
    (state: RootState) => state.payments,
  );

  const validateForm = () => {
    let isValid = true;

    // Amount validation
    if (!amount) {
      setAmountError("Amount is required");
      isValid = false;
    } else if (Number.isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setAmountError("Amount must be a positive number");
      isValid = false;
    } else {
      setAmountError("");
    }

    // Source validation
    if (!source) {
      setSourceError("Payment source is required");
      isValid = false;
    } else {
      setSourceError("");
    }

    return isValid;
  };

  const handleCreatePayment = async () => {
    if (validateForm()) {
      try {
        const paymentData = {
          amount: parseFloat(amount),
          currency,
          processorType,
          source,
          metadata: {
            description,
          },
        };

        await dispatch(createPayment(paymentData)).unwrap();
        Alert.alert(
          "Payment Created",
          "Your payment has been processed successfully.",
          [{ text: "OK", onPress: () => navigation.goBack() }],
        );
      } catch (err) {
        Alert.alert("Payment Failed", err.toString());
      }
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Card style={styles.formCard}>
        <Text style={styles.title}>Create New Payment</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <InputField
          label="Amount"
          placeholder="Enter payment amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          error={amountError}
          required
        />

        <InputField
          label="Currency"
          placeholder="Enter currency code"
          value={currency}
          onChangeText={setCurrency}
          autoCapitalize="none"
        />

        <InputField
          label="Payment Processor"
          placeholder="stripe, paypal, or square"
          value={processorType}
          onChangeText={setProcessorType}
          autoCapitalize="none"
        />

        <InputField
          label="Payment Source"
          placeholder="Enter payment source or token"
          value={source}
          onChangeText={setSource}
          error={sourceError}
          required
        />

        <InputField
          label="Description"
          placeholder="Enter payment description"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <Button
          title="Process Payment"
          onPress={handleCreatePayment}
          loading={isLoading}
          fullWidth
          style={styles.submitButton}
        />

        <Button
          title="Cancel"
          onPress={() => navigation.goBack()}
          variant="outline"
          fullWidth
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
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 16,
    textAlign: "center",
  },
  errorText: {
    color: "#e74c3c",
    textAlign: "center",
    marginBottom: 16,
    padding: 10,
    backgroundColor: "#fadbd8",
    borderRadius: 4,
  },
  submitButton: {
    marginBottom: 12,
  },
});

export default CreatePaymentScreen;
