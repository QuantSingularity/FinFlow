import type React from "react";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import type { AppDispatch, RootState } from "../../store";
import {
  fetchTransactionById,
  refundPayment,
} from "../../store/slices/paymentsSlice";

const PaymentDetailsScreen: React.FC = ({ route, navigation }: any) => {
  const { id } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const { currentTransaction, isLoading, error } = useSelector(
    (state: RootState) => state.payments,
  );

  useEffect(() => {
    if (id) {
      dispatch(fetchTransactionById(id));
    }
  }, [dispatch, id]);

  const handleRefund = () => {
    Alert.alert(
      "Confirm Refund",
      "Are you sure you want to refund this payment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Refund",
          style: "destructive",
          onPress: async () => {
            try {
              await dispatch(refundPayment({ id })).unwrap();
              Alert.alert("Success", "Payment has been refunded successfully.");
            } catch (err) {
              Alert.alert("Refund Failed", err.toString());
            }
          },
        },
      ],
    );
  };

  if (isLoading || !currentTransaction) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="outline"
          />
        </Card>
      </View>
    );
  }

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currentTransaction.currency,
  }).format(currentTransaction.amount);

  const formattedDate = new Date(currentTransaction.createdAt).toLocaleString();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#2ecc71";
      case "pending":
        return "#f39c12";
      case "failed":
        return "#e74c3c";
      case "refunded":
        return "#3498db";
      default:
        return "#7f8c8d";
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Card style={styles.card}>
        <Text style={styles.title}>Payment Details</Text>

        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(currentTransaction.status) },
            ]}
          >
            <Text style={styles.statusText}>{currentTransaction.status}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Transaction ID</Text>
          <Text style={styles.detailValue}>{currentTransaction.id}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount</Text>
          <Text style={styles.detailValue}>{formattedAmount}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Processor</Text>
          <Text style={styles.detailValue}>
            {currentTransaction.processorType}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Processor ID</Text>
          <Text style={styles.detailValue}>
            {currentTransaction.processorId}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date</Text>
          <Text style={styles.detailValue}>{formattedDate}</Text>
        </View>

        {currentTransaction.metadata && (
          <View style={styles.metadataContainer}>
            <Text style={styles.metadataTitle}>Additional Information</Text>
            {Object.entries(currentTransaction.metadata).map(([key, value]) => (
              <View style={styles.detailRow} key={key}>
                <Text style={styles.detailLabel}>{key}</Text>
                <Text style={styles.detailValue}>{value?.toString()}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actionsContainer}>
          {currentTransaction.status === "completed" && (
            <Button
              title="Refund Payment"
              onPress={handleRefund}
              variant="danger"
              fullWidth
              style={styles.actionButton}
            />
          )}

          <Button
            title="Back to Payments"
            onPress={() => navigation.goBack()}
            variant="outline"
            fullWidth
          />
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#7f8c8d",
  },
  card: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 16,
    textAlign: "center",
  },
  statusContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  detailLabel: {
    fontSize: 16,
    color: "#7f8c8d",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 16,
    color: "#2c3e50",
    fontWeight: "600",
    maxWidth: "60%",
    textAlign: "right",
  },
  metadataContainer: {
    marginTop: 24,
  },
  metadataTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 12,
  },
  actionsContainer: {
    marginTop: 24,
  },
  actionButton: {
    marginBottom: 12,
  },
  errorCard: {
    padding: 16,
    margin: 16,
  },
  errorText: {
    color: "#e74c3c",
    marginBottom: 16,
    textAlign: "center",
  },
});

export default PaymentDetailsScreen;
