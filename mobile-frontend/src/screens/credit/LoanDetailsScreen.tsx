import type React from "react";
import { useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import ErrorState from "../../components/common/ErrorState";
import type { AppDispatch, RootState } from "../../store";
import { fetchLoanById } from "../../store/slices/creditSlice";

const LoanDetailsScreen: React.FC = ({ route, navigation }: any) => {
  const { id } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const { currentLoan, isLoading, error } = useSelector(
    (state: RootState) => state.credit,
  );

  useEffect(() => {
    if (id) {
      dispatch(fetchLoanById(id));
    }
  }, [dispatch, id]);

  if (isLoading && !currentLoan) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (error) {
    return (
      <ErrorState message={error} onRetry={() => dispatch(fetchLoanById(id))} />
    );
  }

  if (!currentLoan) {
    return (
      <ErrorState
        message="Loan not found"
        onRetry={() => navigation.goBack()}
      />
    );
  }

  const monthlyPayment =
    currentLoan.amount * (currentLoan.interestRate / 100 / 12);
  const totalPayment = monthlyPayment * currentLoan.term;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Card style={styles.summaryCard}>
        <Text style={styles.cardTitle}>Loan Details</Text>

        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Loan Amount</Text>
          <Text style={styles.amountValue}>
            ${currentLoan.amount.toLocaleString()}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            currentLoan.status === "active"
              ? styles.activeBadge
              : currentLoan.status === "approved"
                ? styles.approvedBadge
                : currentLoan.status === "pending"
                  ? styles.pendingBadge
                  : styles.defaultBadge,
          ]}
        >
          <Text style={styles.statusText}>{currentLoan.status}</Text>
        </View>
      </Card>

      <Card style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Loan Information</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Interest Rate</Text>
          <Text style={styles.detailValue}>{currentLoan.interestRate}%</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Term</Text>
          <Text style={styles.detailValue}>{currentLoan.term} months</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Monthly Payment</Text>
          <Text style={styles.detailValue}>${monthlyPayment.toFixed(2)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Payment</Text>
          <Text style={styles.detailValue}>${totalPayment.toFixed(2)}</Text>
        </View>

        {currentLoan.startDate && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Start Date</Text>
            <Text style={styles.detailValue}>
              {new Date(currentLoan.startDate).toLocaleDateString()}
            </Text>
          </View>
        )}

        {currentLoan.endDate && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>End Date</Text>
            <Text style={styles.detailValue}>
              {new Date(currentLoan.endDate).toLocaleDateString()}
            </Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Applied On</Text>
          <Text style={styles.detailValue}>
            {new Date(currentLoan.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </Card>

      {currentLoan.status === "active" && (
        <Button
          title="Make Payment"
          onPress={() => {
            // Navigate to payment screen or show payment dialog
          }}
          fullWidth
          style={styles.paymentButton}
        />
      )}
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
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryCard: {
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#7f8c8d",
    marginBottom: 16,
  },
  amountContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  activeBadge: {
    backgroundColor: "#27ae60",
  },
  approvedBadge: {
    backgroundColor: "#2ecc71",
  },
  pendingBadge: {
    backgroundColor: "#f39c12",
  },
  defaultBadge: {
    backgroundColor: "#95a5a6",
  },
  statusText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  detailsCard: {
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  detailLabel: {
    fontSize: 16,
    color: "#7f8c8d",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
  },
  paymentButton: {
    marginTop: 8,
  },
});

export default LoanDetailsScreen;
