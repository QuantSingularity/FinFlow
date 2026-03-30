import React, { useEffect } from "react";
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
import type { AppDispatch, RootState } from "../../store";
import { fetchRevenueAnalytics } from "../../store/slices/analyticsSlice";

const AnalyticsScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { revenueAnalytics, isLoading, error } = useSelector(
    (state: RootState) => state.analytics,
  );
  const [period, setPeriod] = React.useState<
    "daily" | "weekly" | "monthly" | "yearly"
  >("monthly");

  useEffect(() => {
    dispatch(fetchRevenueAnalytics(period));
  }, [dispatch, period]);

  if (isLoading && !revenueAnalytics) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.title}>Financial Analytics</Text>

      <Card style={styles.periodCard}>
        <Text style={styles.periodTitle}>Select Time Period</Text>
        <View style={styles.periodButtons}>
          <Button
            title="Daily"
            variant={period === "daily" ? "primary" : "outline"}
            size="small"
            onPress={() => setPeriod("daily")}
            style={styles.periodButton}
          />
          <Button
            title="Weekly"
            variant={period === "weekly" ? "primary" : "outline"}
            size="small"
            onPress={() => setPeriod("weekly")}
            style={styles.periodButton}
          />
          <Button
            title="Monthly"
            variant={period === "monthly" ? "primary" : "outline"}
            size="small"
            onPress={() => setPeriod("monthly")}
            style={styles.periodButton}
          />
          <Button
            title="Yearly"
            variant={period === "yearly" ? "primary" : "outline"}
            size="small"
            onPress={() => setPeriod("yearly")}
            style={styles.periodButton}
          />
        </View>
      </Card>

      <Card style={styles.summaryCard}>
        <Text style={styles.cardTitle}>Revenue Summary</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
            <Text style={styles.summaryValue}>
              {revenueAnalytics?.totalRevenue
                ? new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(revenueAnalytics.totalRevenue)
                : "$0.00"}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Average</Text>
            <Text style={styles.summaryValue}>
              {revenueAnalytics?.averageRevenue
                ? new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(revenueAnalytics.averageRevenue)
                : "$0.00"}
            </Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Growth</Text>
            <Text
              style={[
                styles.summaryValue,
                revenueAnalytics?.growth && revenueAnalytics.growth > 0
                  ? styles.positiveValue
                  : revenueAnalytics?.growth && revenueAnalytics.growth < 0
                    ? styles.negativeValue
                    : {},
              ]}
            >
              {revenueAnalytics?.growth
                ? `${revenueAnalytics.growth > 0 ? "+" : ""}${revenueAnalytics.growth}%`
                : "0%"}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Transactions</Text>
            <Text style={styles.summaryValue}>
              {revenueAnalytics?.transactionCount || "0"}
            </Text>
          </View>
        </View>
      </Card>

      <Card style={styles.detailsCard}>
        <Text style={styles.cardTitle}>Revenue Breakdown</Text>
        {revenueAnalytics?.breakdown &&
          Object.entries(revenueAnalytics.breakdown).map(
            ([category, value]) => (
              <View key={category} style={styles.breakdownItem}>
                <Text style={styles.breakdownCategory}>{category}</Text>
                <Text style={styles.breakdownValue}>
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(value as number)}
                </Text>
              </View>
            ),
          )}
      </Card>

      <Card style={styles.trendsCard}>
        <Text style={styles.cardTitle}>Trends</Text>
        <Text style={styles.chartPlaceholder}>
          [Chart visualization would be displayed here]
        </Text>
        <Text style={styles.trendsNote}>
          Note: In a production app, this would display an actual chart using a
          library like react-native-chart-kit or Victory Native.
        </Text>
      </Card>

      <Card style={styles.insightsCard}>
        <Text style={styles.cardTitle}>Key Insights</Text>
        {revenueAnalytics?.insights ? (
          revenueAnalytics.insights.map((insight, index) => (
            <View key={index} style={styles.insightItem}>
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>
            No insights available for the selected period.
          </Text>
        )}
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 16,
  },
  periodCard: {
    padding: 16,
    marginBottom: 16,
  },
  periodTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 12,
  },
  periodButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  periodButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  summaryCard: {
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  positiveValue: {
    color: "#2ecc71",
  },
  negativeValue: {
    color: "#e74c3c",
  },
  detailsCard: {
    padding: 16,
    marginBottom: 16,
  },
  breakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  breakdownCategory: {
    fontSize: 16,
    color: "#2c3e50",
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2c3e50",
  },
  trendsCard: {
    padding: 16,
    marginBottom: 16,
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: "#ecf0f1",
    borderRadius: 8,
    textAlign: "center",
    textAlignVertical: "center",
    color: "#7f8c8d",
    fontSize: 16,
  },
  trendsNote: {
    fontSize: 12,
    color: "#7f8c8d",
    fontStyle: "italic",
    marginTop: 8,
  },
  insightsCard: {
    padding: 16,
  },
  insightItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  insightText: {
    fontSize: 14,
    color: "#2c3e50",
    lineHeight: 20,
  },
  noDataText: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "center",
    padding: 16,
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

export default AnalyticsScreen;
