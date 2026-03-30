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
import MetricCard from "../../components/dashboard/MetricCard";
import TransactionList from "../../components/payments/TransactionList";
import type { AppDispatch, RootState } from "../../store";
import { fetchBalanceSheet } from "../../store/slices/accountingSlice";
import { fetchDashboardMetrics } from "../../store/slices/analyticsSlice";
import { fetchCreditScore } from "../../store/slices/creditSlice";
import { fetchTransactions } from "../../store/slices/paymentsSlice";

const DashboardScreen: React.FC = ({ navigation }: any) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { dashboardMetrics, isLoading: analyticsLoading } = useSelector(
    (state: RootState) => state.analytics,
  );
  const { transactions, isLoading: transactionsLoading } = useSelector(
    (state: RootState) => state.payments,
  );
  const { creditScore, isLoading: creditLoading } = useSelector(
    (state: RootState) => state.credit,
  );
  const { balanceSheet, isLoading: accountingLoading } = useSelector(
    (state: RootState) => state.accounting,
  );

  const isLoading =
    analyticsLoading ||
    transactionsLoading ||
    creditLoading ||
    accountingLoading;

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        dispatch(fetchDashboardMetrics());
        dispatch(fetchTransactions({ limit: 5 }));
        dispatch(fetchCreditScore());
        dispatch(fetchBalanceSheet());
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
    };

    loadDashboardData();
  }, [dispatch]);

  if (isLoading && !dashboardMetrics && !transactions.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.firstName || "User"}</Text>
        <Text style={styles.date}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>
      </View>

      <View style={styles.metricsContainer}>
        <Text style={styles.sectionTitle}>Financial Overview</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Total Revenue"
            value={dashboardMetrics?.totalRevenue || "$0"}
            change={dashboardMetrics?.revenueChange || 0}
            icon="trending-up"
          />
          <MetricCard
            title="Expenses"
            value={dashboardMetrics?.totalExpenses || "$0"}
            change={dashboardMetrics?.expensesChange || 0}
            icon="trending-down"
            isNegative
          />
          <MetricCard
            title="Transactions"
            value={dashboardMetrics?.transactionCount || "0"}
            change={dashboardMetrics?.transactionCountChange || 0}
            icon="swap-horizontal"
          />
          <MetricCard
            title="Balance"
            value={dashboardMetrics?.currentBalance || "$0"}
            change={dashboardMetrics?.balanceChange || 0}
            icon="wallet"
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <Button
            title="View All"
            variant="outline"
            size="small"
            onPress={() => navigation.navigate("Payments")}
          />
        </View>
        <TransactionList
          transactions={transactions.slice(0, 5)}
          onPress={(id) =>
            navigation.navigate("Payments", {
              screen: "PaymentDetails",
              params: { id },
            })
          }
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Credit Score</Text>
          <Button
            title="Details"
            variant="outline"
            size="small"
            onPress={() =>
              navigation.navigate("Credit", {
                screen: "CreditScore",
              })
            }
          />
        </View>
        <Card style={styles.creditScoreCard}>
          {creditScore ? (
            <View style={styles.creditScoreContainer}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreValue}>{creditScore.score}</Text>
              </View>
              <View style={styles.scoreDetails}>
                <Text style={styles.scoreLabel}>Your credit score is</Text>
                <Text
                  style={[
                    styles.scoreRating,
                    creditScore.score >= 700
                      ? styles.excellentScore
                      : creditScore.score >= 650
                        ? styles.goodScore
                        : creditScore.score >= 600
                          ? styles.fairScore
                          : styles.poorScore,
                  ]}
                >
                  {creditScore.score >= 700
                    ? "Excellent"
                    : creditScore.score >= 650
                      ? "Good"
                      : creditScore.score >= 600
                        ? "Fair"
                        : "Poor"}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noDataText}>
              Credit score information not available
            </Text>
          )}
        </Card>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Financial Reports</Text>
          <Button
            title="View All"
            variant="outline"
            size="small"
            onPress={() => navigation.navigate("Accounting")}
          />
        </View>
        <View style={styles.reportsGrid}>
          <Card
            style={styles.reportCard}
            onPress={() =>
              navigation.navigate("Accounting", {
                screen: "BalanceSheet",
              })
            }
          >
            <Text style={styles.reportTitle}>Balance Sheet</Text>
            <Text style={styles.reportDate}>
              As of {new Date().toLocaleDateString()}
            </Text>
          </Card>
          <Card
            style={styles.reportCard}
            onPress={() =>
              navigation.navigate("Accounting", {
                screen: "IncomeStatement",
              })
            }
          >
            <Text style={styles.reportTitle}>Income Statement</Text>
            <Text style={styles.reportDate}>Current Month</Text>
          </Card>
          <Card
            style={styles.reportCard}
            onPress={() =>
              navigation.navigate("Accounting", {
                screen: "CashFlow",
              })
            }
          >
            <Text style={styles.reportTitle}>Cash Flow</Text>
            <Text style={styles.reportDate}>Current Month</Text>
          </Card>
        </View>
      </View>
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
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  date: {
    fontSize: 14,
    color: "#7f8c8d",
    marginTop: 4,
  },
  metricsContainer: {
    marginBottom: 24,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  creditScoreCard: {
    padding: 16,
  },
  creditScoreContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#3498db",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  scoreDetails: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 4,
  },
  scoreRating: {
    fontSize: 20,
    fontWeight: "600",
  },
  excellentScore: {
    color: "#27ae60",
  },
  goodScore: {
    color: "#2ecc71",
  },
  fairScore: {
    color: "#f39c12",
  },
  poorScore: {
    color: "#e74c3c",
  },
  noDataText: {
    textAlign: "center",
    color: "#7f8c8d",
    padding: 16,
  },
  reportsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  reportCard: {
    width: "48%",
    padding: 16,
    marginBottom: 16,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
  },
  reportDate: {
    fontSize: 12,
    color: "#7f8c8d",
  },
});

export default DashboardScreen;
