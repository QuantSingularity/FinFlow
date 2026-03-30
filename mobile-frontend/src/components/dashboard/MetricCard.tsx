import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import { StyleSheet, Text, View } from "react-native";

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: string;
  isNegative?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  isNegative = false,
}) => {
  const isPositiveChange = isNegative ? change < 0 : change > 0;
  const isZeroChange = change === 0;

  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon as any} size={24} color="#3498db" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
      <View style={styles.changeContainer}>
        {!isZeroChange && (
          <Ionicons
            name={isPositiveChange ? "arrow-up" : "arrow-down"}
            size={16}
            color={isPositiveChange ? "#2ecc71" : "#e74c3c"}
            style={styles.changeIcon}
          />
        )}
        <Text
          style={[
            styles.changeText,
            isZeroChange
              ? styles.neutralChange
              : isPositiveChange
                ? styles.positiveChange
                : styles.negativeChange,
          ]}
        >
          {change > 0 ? "+" : ""}
          {change}%
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    width: "48%",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  changeIcon: {
    marginRight: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  positiveChange: {
    color: "#2ecc71",
  },
  negativeChange: {
    color: "#e74c3c",
  },
  neutralChange: {
    color: "#7f8c8d",
  },
});

export default MetricCard;
