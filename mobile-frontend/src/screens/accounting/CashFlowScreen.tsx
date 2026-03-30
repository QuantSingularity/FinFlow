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
import { fetchCashFlowStatement } from "../../store/slices/accountingSlice";

const CashFlowScreen: React.FC = ({ route }: any) => {
  const dispatch = useDispatch<AppDispatch>();
  const { cashFlowStatement, isLoading, error } = useSelector(
    (state: RootState) => state.accounting,
  );

  const { startDate, endDate } = route.params || {};

  useEffect(() => {
    dispatch(fetchCashFlowStatement({ startDate, endDate }));
  }, [dispatch, startDate, endDate]);

  if (isLoading && !cashFlowStatement) {
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
        onRetry={() => dispatch(fetchCashFlowStatement({ startDate, endDate }))}
      />
    );
  }

  const operating = cashFlowStatement?.operating || 0;
  const investing = cashFlowStatement?.investing || 0;
  const financing = cashFlowStatement?.financing || 0;
  const netCashFlow = operating + investing + financing;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Card style={styles.summaryCard}>
        <Text style={styles.cardTitle}>Cash Flow Statement</Text>
        <Text style={styles.periodText}>
          {startDate && endDate
            ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
            : "Current Period"}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operating Activities</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Cash from Operations</Text>
            <Text
              style={[
                styles.value,
                operating >= 0 ? styles.positiveValue : styles.negativeValue,
              ]}
            >
              ${operating.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Investing Activities</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Cash from Investments</Text>
            <Text
              style={[
                styles.value,
                investing >= 0 ? styles.positiveValue : styles.negativeValue,
              ]}
            >
              ${investing.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financing Activities</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Cash from Financing</Text>
            <Text
              style={[
                styles.value,
                financing >= 0 ? styles.positiveValue : styles.negativeValue,
              ]}
            >
              ${financing.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.totalLabel}>Net Cash Flow</Text>
          <Text
            style={[
              styles.totalValue,
              netCashFlow >= 0 ? styles.positiveValue : styles.negativeValue,
            ]}
          >
            ${netCashFlow.toLocaleString()}
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
  },
  positiveValue: {
    color: "#27ae60",
  },
  negativeValue: {
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
});

export default CashFlowScreen;
