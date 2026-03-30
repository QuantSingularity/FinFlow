import type React from "react";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import InputField from "../../components/common/InputField";
import type { AppDispatch, RootState } from "../../store";
import {
  getProfile,
  logout,
  updateProfile,
} from "../../store/slices/authSlice";

const ProfileScreen: React.FC = ({ navigation }: any) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoading } = useSelector((state: RootState) => state.auth);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    dispatch(getProfile());
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleUpdate = async () => {
    try {
      await dispatch(
        updateProfile({
          firstName,
          lastName,
          email,
        }),
      ).unwrap();
      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch (error: any) {
      Alert.alert("Error", error.toString());
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => dispatch(logout()),
      },
    ]);
  };

  if (isLoading && !user) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Card style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {firstName.charAt(0)}
              {lastName.charAt(0)}
            </Text>
          </View>
        </View>

        <Text style={styles.userName}>
          {firstName} {lastName}
        </Text>
        <Text style={styles.userEmail}>{email}</Text>
        <Text style={styles.userRole}>{user?.role || "User"}</Text>
      </Card>

      <Card style={styles.formCard}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Personal Information</Text>
          {!isEditing && (
            <Button
              title="Edit"
              variant="outline"
              size="small"
              onPress={() => setIsEditing(true)}
            />
          )}
        </View>

        <InputField
          label="First Name"
          value={firstName}
          onChangeText={setFirstName}
          editable={isEditing}
          required
        />

        <InputField
          label="Last Name"
          value={lastName}
          onChangeText={setLastName}
          editable={isEditing}
          required
        />

        <InputField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={isEditing}
          required
        />

        {isEditing && (
          <View style={styles.buttonRow}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => {
                setIsEditing(false);
                if (user) {
                  setFirstName(user.firstName || "");
                  setLastName(user.lastName || "");
                  setEmail(user.email || "");
                }
              }}
              style={styles.button}
            />
            <Button
              title="Save"
              onPress={handleUpdate}
              loading={isLoading}
              style={styles.button}
            />
          </View>
        )}
      </Card>

      <Button
        title="Logout"
        variant="outline"
        onPress={handleLogout}
        fullWidth
        style={styles.logoutButton}
      />
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
  profileCard: {
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#3498db",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: "#7f8c8d",
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: "#95a5a6",
    textTransform: "capitalize",
  },
  formCard: {
    padding: 20,
    marginBottom: 16,
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
  },
  logoutButton: {
    marginTop: 8,
  },
});

export default ProfileScreen;
