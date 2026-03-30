import type React from "react";
import { useEffect, useState } from "react";
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
import TransactionList from "../../components/payments/TransactionList";
import type { AppDispatch, RootState } from "../../store";
import { fetchTransactions } from "../../store/slices/paymentsSlice";

const PaymentsScreen: React.FC = ({ navigation }: any) => {
  const [currentPage, setCurrentPage] = useState(1);
  const dispatch = useDispatch<AppDispatch>();
  const { transactions, isLoading, error, pagination } = useSelector(
    (state: RootState) => state.payments,
  );

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const loadTransactions = () => {
    dispatch(fetchTransactions({ page: currentPage, limit: 10 }));
  };

  const handleNextPage = () => {
    if (currentPage < pagination.totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleTransactionPress = (id: string) => {
    navigation.navigate("PaymentDetails", { id });
  };

  if (isLoading && !transactions.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Payments</Text>
        <Button
          title="New Payment"
          onPress={() => navigation.navigate("CreatePayment")}
          size="small"
        />
      </View>

      {error && (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title="Try Again"
            onPress={loadTransactions}
            variant="outline"
            size="small"
            style={styles.retryButton}
          />
        </Card>
      )}

      <TransactionList
        transactions={transactions}
        onPress={handleTransactionPress}
      />

      {pagination.totalPages > 1 && (
        <View style={styles.pagination}>
          <Button
            title="Previous"
            onPress={handlePrevPage}
            disabled={currentPage === 1}
            variant="outline"
            size="small"
          />
          <Text style={styles.pageInfo}>
            Page {currentPage} of {pagination.totalPages}
          </Text>
          <Button
            title="Next"
            onPress={handleNextPage}
            disabled={currentPage === pagination.totalPages}
            variant="outline"
            size="small"
          />
        </View>
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
  errorCard: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: "#fadbd8",
  },
  errorText: {
    color: "#c0392b",
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: "flex-end",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  pageInfo: {
    fontSize: 14,
    color: "#7f8c8d",
  },
});

export default PaymentsScreen;
