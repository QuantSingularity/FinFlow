import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import AccountingScreen from "../screens/accounting/AccountingScreen";
import BalanceSheetScreen from "../screens/accounting/BalanceSheetScreen";
import CashFlowScreen from "../screens/accounting/CashFlowScreen";
import IncomeStatementScreen from "../screens/accounting/IncomeStatementScreen";
import AnalyticsScreen from "../screens/analytics/AnalyticsScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
// Import screens
// Auth screens
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import ApplyLoanScreen from "../screens/credit/ApplyLoanScreen";
import CreditScoreScreen from "../screens/credit/CreditScoreScreen";
import CreditScreen from "../screens/credit/CreditScreen";
import LoanDetailsScreen from "../screens/credit/LoanDetailsScreen";
import LoansScreen from "../screens/credit/LoansScreen";
// Main screens
import DashboardScreen from "../screens/dashboard/DashboardScreen";
import CreatePaymentScreen from "../screens/payments/CreatePaymentScreen";
import PaymentDetailsScreen from "../screens/payments/PaymentDetailsScreen";
import PaymentsScreen from "../screens/payments/PaymentsScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import SettingsScreen from "../screens/settings/SettingsScreen";
import type { RootState } from "../store";

// Define navigation types
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Payments: undefined;
  Accounting: undefined;
  Analytics: undefined;
  Credit: undefined;
};

export type PaymentsStackParamList = {
  PaymentsList: undefined;
  PaymentDetails: { id: string };
  CreatePayment: undefined;
};

export type AccountingStackParamList = {
  AccountingHome: undefined;
  BalanceSheet: { date?: string };
  IncomeStatement: { startDate?: string; endDate?: string };
  CashFlow: { startDate?: string; endDate?: string };
};

export type CreditStackParamList = {
  CreditHome: undefined;
  CreditScore: undefined;
  Loans: undefined;
  LoanDetails: { id: string };
  ApplyLoan: undefined;
};

export type DrawerParamList = {
  MainTabs: undefined;
  Profile: undefined;
  Settings: undefined;
};

// Create navigators
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const PaymentsStack = createNativeStackNavigator<PaymentsStackParamList>();
const AccountingStack = createNativeStackNavigator<AccountingStackParamList>();
const CreditStack = createNativeStackNavigator<CreditStackParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();

// Stack navigators for each tab
const PaymentsNavigator = () => (
  <PaymentsStack.Navigator>
    <PaymentsStack.Screen
      name="PaymentsList"
      component={PaymentsScreen}
      options={{ headerShown: false }}
    />
    <PaymentsStack.Screen
      name="PaymentDetails"
      component={PaymentDetailsScreen}
    />
    <PaymentsStack.Screen
      name="CreatePayment"
      component={CreatePaymentScreen}
    />
  </PaymentsStack.Navigator>
);

const AccountingNavigator = () => (
  <AccountingStack.Navigator>
    <AccountingStack.Screen
      name="AccountingHome"
      component={AccountingScreen}
      options={{ headerShown: false }}
    />
    <AccountingStack.Screen
      name="BalanceSheet"
      component={BalanceSheetScreen}
    />
    <AccountingStack.Screen
      name="IncomeStatement"
      component={IncomeStatementScreen}
    />
    <AccountingStack.Screen name="CashFlow" component={CashFlowScreen} />
  </AccountingStack.Navigator>
);

const CreditNavigator = () => (
  <CreditStack.Navigator>
    <CreditStack.Screen
      name="CreditHome"
      component={CreditScreen}
      options={{ headerShown: false }}
    />
    <CreditStack.Screen name="CreditScore" component={CreditScoreScreen} />
    <CreditStack.Screen name="Loans" component={LoansScreen} />
    <CreditStack.Screen name="LoanDetails" component={LoanDetailsScreen} />
    <CreditStack.Screen name="ApplyLoan" component={ApplyLoanScreen} />
  </CreditStack.Navigator>
);

// Main tab navigator
const MainTabNavigator = () => (
  <MainTab.Navigator>
    <MainTab.Screen name="Dashboard" component={DashboardScreen} />
    <MainTab.Screen name="Payments" component={PaymentsNavigator} />
    <MainTab.Screen name="Accounting" component={AccountingNavigator} />
    <MainTab.Screen name="Analytics" component={AnalyticsScreen} />
    <MainTab.Screen name="Credit" component={CreditNavigator} />
  </MainTab.Navigator>
);

// Drawer navigator wrapping the main tab navigator
const DrawerNavigator = () => (
  <Drawer.Navigator>
    <Drawer.Screen
      name="MainTabs"
      component={MainTabNavigator}
      options={{ headerShown: false }}
    />
    <Drawer.Screen name="Profile" component={ProfileScreen} />
    <Drawer.Screen name="Settings" component={SettingsScreen} />
  </Drawer.Navigator>
);

// Auth navigator
const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
    <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </AuthStack.Navigator>
);

// Root navigator
export const AppNavigator = () => {
  const { token } = useSelector((state: RootState) => state.auth);

  return (
    <NavigationContainer>
      {token ? <DrawerNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};
