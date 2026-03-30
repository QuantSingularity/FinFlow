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
import Card from "../../components/common/Card";
import ErrorState from "../../components/common/ErrorState";
import type { AppDispatch, RootState } from "../../store";
import { fetchIncomeStatement } from "../../store/slices/accountingSlice";

const IncomeStatementScreen: React.FC = ({ route }: any) => {
  const dispatch = useDispatch<AppDispatch>();
  const { incomeStatement, isLoading, error } = useSelector(
    (state: RootState) => state.accounting,
  );

  const { startDate, endDate } = route.params || {};

  useEffect(() => {
    dispatch(fetchIncomeStatement({ startDate, endDate }));
  }, [dispatch, startDate, endDate]);

  if (isLoading && !incomeStatement) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => dispatch(fetchIncomeStatement({ startDate, endDate }))}
      />
    );
  }

  const revenue = incomeStatement?.revenue || 0;
  const expenses = incomeStatement?.expenses || 0;
  const netIncome = revenue - expenses;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Card style={styles.summaryCard}>
        <Text style={styles.cardTitle}>Income Statement</Text>
        <Text style={styles.periodText}>
          {startDate && endDate
            ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
            : "Current Period"}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total Revenue</Text>
            <Text style={styles.value}>${revenue.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expenses</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total Expenses</Text>
            <Text style={[styles.value, styles.expenseValue]}>
              ${expenses.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.totalLabel}>Net Income</Text>
          <Text
            style={[
              styles.totalValue,
              netIncome >= 0 ? styles.profitValue : styles.lossValue,
            ]}
          >
            ${netIncome.toLocaleString()}
          </Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryCard: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 8,
  },
  periodText: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  label: {
    fontSize: 16,
    color: "#34495e",
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    color: "#27ae60",
  },
  expenseValue: {
    color: "#e74c3c",
  },
  divider: {
    height: 1,
    backgroundColor: "#ecf0f1",
    marginVertical: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  profitValue: {
    color: "#27ae60",
  },
  lossValue: {
    color: "#e74c3c",
  },
});

export default IncomeStatementScreen;
