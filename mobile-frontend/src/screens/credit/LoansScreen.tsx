import type React from "react";
import { useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import type { AppDispatch, RootState } from "../../store";
import { fetchLoans } from "../../store/slices/creditSlice";

const LoansScreen: React.FC = ({ navigation }: any) => {
  const dispatch = useDispatch<AppDispatch>();
  const { loans, isLoading, error } = useSelector(
    (state: RootState) => state.credit,
  );

  useEffect(() => {
    dispatch(fetchLoans());
  }, [dispatch]);

  if (isLoading && loans.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (error) {
    return (
      <ErrorState message={error} onRetry={() => dispatch(fetchLoans())} />
    );
  }

  if (loans.length === 0) {
    return (
      <EmptyState
        title="No Loans"
        message="You don't have any active loans."
        actionText="Apply for Loan"
        onAction={() => navigation.navigate("ApplyLoan")}
      />
    );
  }

  const renderLoanItem = ({ item }: any) => (
    <Card
      style={styles.loanCard}
      onPress={() => navigation.navigate("LoanDetails", { id: item.id })}
    >
      <View style={styles.loanHeader}>
        <Text style={styles.loanAmount}>${item.amount.toLocaleString()}</Text>
        <View
          style={[
            styles.statusBadge,
            item.status === "active"
              ? styles.activeBadge
              : item.status === "approved"
                ? styles.approvedBadge
                : item.status === "pending"
                  ? styles.pendingBadge
                  : styles.defaultBadge,
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.loanDetail}>
        Rate: {item.interestRate}% | Term: {item.term} months
      </Text>
      <Text style={styles.loanDate}>
        Created: {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </Card>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={loans}
        renderItem={renderLoanItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>My Loans</Text>
            <Button
              title="Apply for Loan"
              onPress={() => navigation.navigate("ApplyLoan")}
              size="small"
            />
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  loanCard: {
    padding: 16,
    marginBottom: 12,
  },
  loanHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  loanAmount: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
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
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  loanDetail: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 4,
  },
  loanDate: {
    fontSize: 12,
    color: "#95a5a6",
  },
});

export default LoansScreen;
