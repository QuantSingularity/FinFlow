import type React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Card from "../../components/common/Card";

const AccountingScreen: React.FC = ({ navigation }: any) => {
  const reports = [
    {
      title: "Balance Sheet",
      description: "View assets, liabilities, and equity",
      icon: "📊",
      screen: "BalanceSheet",
    },
    {
      title: "Income Statement",
      description: "Revenue and expenses report",
      icon: "📈",
      screen: "IncomeStatement",
    },
    {
      title: "Cash Flow",
      description: "Cash inflows and outflows",
      icon: "💵",
      screen: "CashFlow",
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Accounting</Text>
        <Text style={styles.subtitle}>Financial Reports & Statements</Text>
      </View>

      <View style={styles.reportsContainer}>
        {reports.map((report, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => navigation.navigate(report.screen)}
          >
            <Card style={styles.reportCard}>
              <Text style={styles.reportIcon}>{report.icon}</Text>
              <Text style={styles.reportTitle}>{report.title}</Text>
              <Text style={styles.reportDescription}>{report.description}</Text>
            </Card>
          </TouchableOpacity>
        ))}
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
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  subtitle: {
    fontSize: 16,
    color: "#7f8c8d",
    marginTop: 4,
  },
  reportsContainer: {
    gap: 16,
  },
  reportCard: {
    padding: 20,
    marginBottom: 16,
  },
  reportIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
  },
  reportDescription: {
    fontSize: 14,
    color: "#7f8c8d",
  },
});

export default AccountingScreen;
