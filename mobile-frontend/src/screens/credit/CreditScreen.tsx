import type React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSelector } from "react-redux";
import Card from "../../components/common/Card";
import type { RootState } from "../../store";

const CreditScreen: React.FC = ({ navigation }: any) => {
  const { creditScore } = useSelector((state: RootState) => state.credit);

  const menuItems = [
    {
      title: "Credit Score",
      description: "View your credit score and factors",
      icon: "📊",
      screen: "CreditScore",
    },
    {
      title: "My Loans",
      description: "View and manage your loans",
      icon: "💰",
      screen: "Loans",
    },
    {
      title: "Apply for Loan",
      description: "Submit a new loan application",
      icon: "📝",
      screen: "ApplyLoan",
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Credit Management</Text>
        <Text style={styles.subtitle}>Loans & Credit Score</Text>
      </View>

      {creditScore && (
        <Card style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Your Credit Score</Text>
          <Text style={styles.scoreValue}>{creditScore.score}</Text>
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
        </Card>
      )}

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Card style={styles.menuCard}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuDescription}>{item.description}</Text>
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
  scoreCard: {
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
  },
  scoreLabel: {
    fontSize: 16,
    color: "#7f8c8d",
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#3498db",
    marginBottom: 8,
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
  menuContainer: {
    gap: 16,
  },
  menuCard: {
    padding: 20,
    marginBottom: 16,
  },
  menuIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
  },
  menuDescription: {
    fontSize: 14,
    color: "#7f8c8d",
  },
});

export default CreditScreen;
