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
import type { AppDispatch, RootState } from "../../store";
import { fetchBalanceSheet } from "../../store/slices/accountingSlice";

const BalanceSheetScreen: React.FC = ({ route }: any) => {
  const { date } = route.params || {};
  const dispatch = useDispatch<AppDispatch>();
  const { balanceSheet, isLoading, error } = useSelector(
    (state: RootState) => state.accounting,
  );

  useEffect(() => {
    dispatch(fetchBalanceSheet(date));
  }, [dispatch, date]);

  if (isLoading || !balanceSheet) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading balance sheet...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      </View>
    );
  }

  // Assuming balanceSheet has assets, liabilities, and equity sections
  const { assets, liabilities, equity } = balanceSheet;

  const renderSection = (title: string, items: Record<string, number>) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {Object.entries(items).map(([name, value]) => (
        <View style={styles.item} key={name}>
          <Text style={styles.itemName}>{name}</Text>
          <Text style={styles.itemValue}>
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(value)}
          </Text>
        </View>
      ))}
      <View style={styles.totalItem}>
        <Text style={styles.totalName}>Total {title}</Text>
        <Text style={styles.totalValue}>
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(
            Object.values(items).reduce((sum, value) => sum + value, 0),
          )}
        </Text>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Card style={styles.card}>
        <Text style={styles.title}>Balance Sheet</Text>
        <Text style={styles.subtitle}>
          As of{" "}
          {date
            ? new Date(date).toLocaleDateString()
            : new Date().toLocaleDateString()}
        </Text>

        {renderSection("Assets", assets)}
        {renderSection("Liabilities", liabilities)}
        {renderSection("Equity", equity)}

        <View style={styles.balanceCheck}>
          <Text style={styles.balanceCheckText}>
            Assets = Liabilities + Equity:{" "}
            {Object.values(assets).reduce((sum, value) => sum + value, 0) ===
            Object.values(liabilities).reduce((sum, value) => sum + value, 0) +
              Object.values(equity).reduce((sum, value) => sum + value, 0)
              ? "✓ Balanced"
              : "✗ Unbalanced"}
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
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
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
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
    paddingBottom: 8,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  itemName: {
    fontSize: 16,
    color: "#2c3e50",
  },
  itemValue: {
    fontSize: 16,
    color: "#2c3e50",
    fontWeight: "500",
  },
  totalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#ecf0f1",
    marginTop: 8,
  },
  totalName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  balanceCheck: {
    backgroundColor: "#e8f8f5",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  balanceCheckText: {
    fontSize: 16,
    color: "#16a085",
    fontWeight: "600",
    textAlign: "center",
  },
  errorCard: {
    padding: 16,
    margin: 16,
    backgroundColor: "#fadbd8",
  },
  errorText: {
    color: "#c0392b",
    textAlign: "center",
  },
});

export default BalanceSheetScreen;
