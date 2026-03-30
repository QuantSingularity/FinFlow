import type React from "react";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";

const SettingsScreen: React.FC = ({ navigation }: any) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  const handleChangePassword = () => {
    Alert.alert("Change Password", "This feature is coming soon!");
  };

  const handleClearCache = () => {
    Alert.alert("Clear Cache", "Are you sure you want to clear the cache?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          Alert.alert("Success", "Cache cleared successfully");
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Push Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: "#bdc3c7", true: "#3498db" }}
            thumbColor="#ffffff"
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Biometric Authentication</Text>
          <Switch
            value={biometricsEnabled}
            onValueChange={setBiometricsEnabled}
            trackColor={{ false: "#bdc3c7", true: "#3498db" }}
            thumbColor="#ffffff"
          />
        </View>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleChangePassword}
        >
          <Text style={styles.actionLabel}>Change Password</Text>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Dark Mode</Text>
          <Switch
            value={darkModeEnabled}
            onValueChange={setDarkModeEnabled}
            trackColor={{ false: "#bdc3c7", true: "#3498db" }}
            thumbColor="#ffffff"
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>App Info</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Build</Text>
          <Text style={styles.infoValue}>100</Text>
        </View>
      </Card>

      <Button
        title="Clear Cache"
        variant="outline"
        onPress={handleClearCache}
        fullWidth
        style={styles.clearCacheButton}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2024 FinFlow</Text>
        <Text style={styles.footerText}>Made with ❤️</Text>
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
  section: {
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  settingLabel: {
    fontSize: 16,
    color: "#34495e",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  actionLabel: {
    fontSize: 16,
    color: "#3498db",
  },
  actionArrow: {
    fontSize: 20,
    color: "#3498db",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: "#7f8c8d",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
  },
  clearCacheButton: {
    marginTop: 8,
  },
  footer: {
    alignItems: "center",
    marginTop: 32,
    marginBottom: 16,
  },
  footerText: {
    fontSize: 14,
    color: "#95a5a6",
    marginBottom: 4,
  },
});

export default SettingsScreen;
