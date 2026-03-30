import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider, useDispatch } from "react-redux";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { store } from "./src/store";
import { checkAuth } from "./src/store/slices/authSlice";

// App content with auth check
function AppContent() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Check for stored authentication on app startup
    dispatch(checkAuth() as any);
  }, [dispatch]);

  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}

// Root app component
export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </Provider>
  );
}

const _styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
