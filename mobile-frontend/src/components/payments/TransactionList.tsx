import type React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { Transaction } from "../../types";
import Card from "../common/Card";

interface TransactionListProps {
  transactions: Transaction[];
  onPress?: (id: string) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onPress,
}) => {
  if (!transactions || transactions.length === 0) {
    return (
      <Card>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No transactions found</Text>
        </View>
      </Card>
    );
  }

  const renderItem = ({ item }: { item: Transaction }) => {
    const statusColor =
      item.status === "completed"
        ? "#2ecc71"
        : item.status === "pending"
          ? "#f39c12"
          : item.status === "failed"
            ? "#e74c3c"
            : "#7f8c8d";

    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: item.currency,
    }).format(item.amount);

    const formattedDate = new Date(item.createdAt).toLocaleDateString();

    return (
      <Card onPress={() => onPress?.(item.id)}>
        <View style={styles.transactionItem}>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionId}>
              Transaction #{item.id.slice(-8)}
            </Text>
            <Text style={styles.transactionDate}>{formattedDate}</Text>
          </View>
          <View style={styles.transactionDetails}>
            <Text style={styles.transactionAmount}>{formattedAmount}</Text>
            <View
              style={[styles.statusBadge, { backgroundColor: statusColor }]}
            >
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <FlatList
      data={transactions}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      scrollEnabled={false}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingBottom: 8,
  },
  emptyContainer: {
    padding: 16,
    alignItems: "center",
  },
  emptyText: {
    color: "#7f8c8d",
    fontSize: 16,
  },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionId: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2c3e50",
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  transactionDetails: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },
});

export default TransactionList;
