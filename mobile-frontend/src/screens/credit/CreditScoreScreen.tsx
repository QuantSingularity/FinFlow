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
import { fetchCreditScore } from "../../store/slices/creditSlice";

const CreditScoreScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { creditScore, isLoading, error } = useSelector(
    (state: RootState) => state.credit,
  );

  useEffect(() => {
    dispatch(fetchCreditScore());
  }, [dispatch]);

  if (isLoading || !creditScore) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading credit score...</Text>
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

  const getScoreColor = (score: number) => {
    if (score >= 750) return "#27ae60"; // Excellent
    if (score >= 700) return "#2ecc71"; // Very Good
    if (score >= 650) return "#f39c12"; // Good
    if (score >= 600) return "#e67e22"; // Fair
    return "#e74c3c"; // Poor
  };

  const getScoreCategory = (score: number) => {
    if (score >= 750) return "Excellent";
    if (score >= 700) return "Very Good";
    if (score >= 650) return "Good";
    if (score >= 600) return "Fair";
    return "Poor";
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Card style={styles.scoreCard}>
        <Text style={styles.title}>Your Credit Score</Text>

        <View style={styles.scoreContainer}>
          <View
            style={[
              styles.scoreCircle,
              { backgroundColor: getScoreColor(creditScore.score) },
            ]}
          >
            <Text style={styles.scoreValue}>{creditScore.score}</Text>
          </View>
          <Text
            style={[
              styles.scoreCategory,
              { color: getScoreColor(creditScore.score) },
            ]}
          >
            {getScoreCategory(creditScore.score)}
          </Text>
        </View>

        <View style={styles.rangeContainer}>
          <View style={styles.rangeBar}>
            <View style={styles.rangePoor} />
            <View style={styles.rangeFair} />
            <View style={styles.rangeGood} />
            <View style={styles.rangeVeryGood} />
            <View style={styles.rangeExcellent} />
          </View>
          <View style={styles.rangeLabels}>
            <Text style={styles.rangeLabel}>300</Text>
            <Text style={styles.rangeLabel}>850</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.factorsCard}>
        <Text style={styles.factorsTitle}>Factors Affecting Your Score</Text>

        {creditScore.factors.map((factor, index) => (
          <View key={index} style={styles.factor}>
            <View style={styles.factorHeader}>
              <Text style={styles.factorName}>{factor.factor}</Text>
              <View
                style={[
                  styles.impactBadge,
                  factor.impact === "positive"
                    ? styles.positiveImpact
                    : factor.impact === "negative"
                      ? styles.negativeImpact
                      : styles.neutralImpact,
                ]}
              >
                <Text style={styles.impactText}>{factor.impact}</Text>
              </View>
            </View>
            <Text style={styles.factorDescription}>{factor.description}</Text>
          </View>
        ))}
      </Card>

      <Card style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>Tips to Improve Your Score</Text>

        <View style={styles.tip}>
          <Text style={styles.tipNumber}>1</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Pay bills on time</Text>
            <Text style={styles.tipDescription}>
              Payment history is the most important factor in your credit score.
              Set up automatic payments or reminders to ensure you never miss a
              due date.
            </Text>
          </View>
        </View>

        <View style={styles.tip}>
          <Text style={styles.tipNumber}>2</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Keep credit utilization low</Text>
            <Text style={styles.tipDescription}>
              Try to keep your credit card balances below 30% of your available
              credit limit.
            </Text>
          </View>
        </View>

        <View style={styles.tip}>
          <Text style={styles.tipNumber}>3</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Maintain a long credit history</Text>
            <Text style={styles.tipDescription}>
              Keep old accounts open, even if you don't use them frequently, to
              maintain a longer credit history.
            </Text>
          </View>
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
  scoreCard: {
    padding: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "center",
    marginBottom: 24,
  },
  scoreContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#ffffff",
  },
  scoreCategory: {
    fontSize: 20,
    fontWeight: "600",
  },
  rangeContainer: {
    marginTop: 16,
  },
  rangeBar: {
    height: 8,
    flexDirection: "row",
    borderRadius: 4,
    overflow: "hidden",
  },
  rangePoor: {
    flex: 1,
    backgroundColor: "#e74c3c",
  },
  rangeFair: {
    flex: 1,
    backgroundColor: "#e67e22",
  },
  rangeGood: {
    flex: 1,
    backgroundColor: "#f39c12",
  },
  rangeVeryGood: {
    flex: 1,
    backgroundColor: "#2ecc71",
  },
  rangeExcellent: {
    flex: 1,
    backgroundColor: "#27ae60",
  },
  rangeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  rangeLabel: {
    fontSize: 12,
    color: "#7f8c8d",
  },
  factorsCard: {
    padding: 16,
    marginBottom: 16,
  },
  factorsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 16,
  },
  factor: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  factorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  factorName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    flex: 1,
  },
  impactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  positiveImpact: {
    backgroundColor: "#d5f5e3",
  },
  negativeImpact: {
    backgroundColor: "#fadbd8",
  },
  neutralImpact: {
    backgroundColor: "#f8f9f9",
  },
  impactText: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  factorDescription: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  tipsCard: {
    padding: 16,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 16,
  },
  tip: {
    flexDirection: "row",
    marginBottom: 16,
  },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#3498db",
    color: "#ffffff",
    textAlign: "center",
    lineHeight: 24,
    fontSize: 14,
    fontWeight: "bold",
    marginRight: 12,
    marginTop: 2,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 14,
    color: "#7f8c8d",
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

export default CreditScoreScreen;
