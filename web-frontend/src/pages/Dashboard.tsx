import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity, // TrendingUp, Calendar
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  DollarSign,
  FileText,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Sample data for charts
const sampleRevenueData = [
  { month: "Jan", revenue: 12500, expenses: 8700 },
  { month: "Feb", revenue: 14200, expenses: 9200 },
  { month: "Mar", revenue: 15800, expenses: 9800 },
  { month: "Apr", revenue: 16200, expenses: 10100 },
  { month: "May", revenue: 18900, expenses: 11200 },
  { month: "Jun", revenue: 19500, expenses: 11800 },
];

const sampleCashFlowData = [
  { month: "Jul", actual: 21000, forecast: 22000 },
  { month: "Aug", actual: 22500, forecast: 23000 },
  { month: "Sep", actual: 0, forecast: 24500 },
  { month: "Oct", actual: 0, forecast: 26000 },
  { month: "Nov", actual: 0, forecast: 27500 },
  { month: "Dec", actual: 0, forecast: 29000 },
];

const samplePaymentMethodData = [
  { name: "Credit Card", value: 65, color: "#0088FE" },
  { name: "PayPal", value: 20, color: "#00C49F" },
  { name: "Square", value: 10, color: "#FFBB28" },
  { name: "Bank Transfer", value: 5, color: "#FF8042" },
];

const sampleFinancialMetrics = {
  currentRatio: 2.5,
  quickRatio: 1.8,
  debtToEquity: 0.45,
  returnOnAssets: 12.5,
  returnOnEquity: 18.7,
  profitMargin: 22.3,
  assetTurnover: 1.2,
  inventoryTurnover: 8.5,
  daysReceivable: 32,
  daysPayable: 28,
};

// Mock API services
const fetchInvoices = async () => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 800));
  return Array(24)
    .fill(null)
    .map((_, i) => ({
      id: `INV-${1000 + i}`,
      customer: `Customer ${i + 1}`,
      amount: Math.floor(Math.random() * 10000) + 1000,
      status: ["PAID", "PENDING", "OVERDUE"][Math.floor(Math.random() * 3)],
      dueDate: new Date(
        Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    }));
};

const fetchPayments = async () => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 600));
  return Array(36)
    .fill(null)
    .map((_, i) => ({
      id: `PAY-${2000 + i}`,
      customer: `Customer ${Math.floor(Math.random() * 20) + 1}`,
      amount: Math.floor(Math.random() * 5000) + 500,
      status: ["COMPLETED", "PENDING", "FAILED"][Math.floor(Math.random() * 3)],
      method: ["Credit Card", "PayPal", "Bank Transfer", "Square"][
        Math.floor(Math.random() * 4)
      ],
      date: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    }));
};

const fetchTransactions = async () => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 700));
  return Array(87)
    .fill(null)
    .map((_, i) => ({
      id: `TRX-${3000 + i}`,
      description: [
        "Software subscription",
        "Office supplies",
        "Client payment",
        "Marketing services",
        "Cloud hosting",
        "Employee salary",
        "Equipment purchase",
      ][Math.floor(Math.random() * 7)],
      amount: Math.floor(Math.random() * 5000) + 100,
      category: [
        "Software",
        "Office",
        "Income",
        "Marketing",
        "IT",
        "Salary",
        "Equipment",
      ][Math.floor(Math.random() * 7)],
      transactionDate: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    }));
};

const fetchFinancialMetrics = async () => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 500));
  return sampleFinancialMetrics;
};

const Dashboard: React.FC = () => {
  const [timeframe, setTimeframe] = useState("month");

  // Use React Query for data fetching
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: fetchInvoices,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: fetchPayments,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: fetchTransactions,
  });

  const { data: financialMetrics = sampleFinancialMetrics } = useQuery({
    queryKey: ["financialMetrics"],
    queryFn: fetchFinancialMetrics,
  });

  // Calculate KPIs
  const totalInvoices = invoices.length;
  const pendingInvoices = invoices.filter(
    (invoice) => invoice.status === "PENDING",
  ).length;
  const totalRevenue = invoices.reduce(
    (sum, invoice) => sum + invoice.amount,
    0,
  );
  const totalPayments = payments.length;
  const completedPayments = payments.filter(
    (payment) => payment.status === "COMPLETED",
  ).length;
  const totalTransactions = transactions.length;

  // Get recent transactions
  const recentTransactions = transactions.slice(0, 5);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Financial Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Welcome back, Admin</p>
      </motion.div>

      {/* Time period selector */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <div className="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-800">
          {["week", "month", "quarter", "year"].map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`px-4 py-2 text-sm font-medium ${
                timeframe === period
                  ? "bg-primary-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              } ${period === "week" ? "rounded-l-md" : ""} ${period === "year" ? "rounded-r-md" : ""}`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        <motion.div
          variants={itemVariants}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Revenue
              </h3>
              <span className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                <DollarSign className="h-5 w-5 text-blue-500 dark:text-blue-400" />
              </span>
            </div>
            <div className="flex items-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                ${totalRevenue.toLocaleString()}
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500 font-medium">12.5%</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">
                from last {timeframe}
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Invoices
              </h3>
              <span className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-full">
                <FileText className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
              </span>
            </div>
            <div className="flex items-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalInvoices}
              </div>
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <div className="flex items-center">
                <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-500 font-medium">8.2%</span>
              </div>
              <div className="text-amber-500">{pendingInvoices} pending</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Payments
              </h3>
              <span className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-full">
                <CreditCard className="h-5 w-5 text-purple-500 dark:text-purple-400" />
              </span>
            </div>
            <div className="flex items-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalPayments}
              </div>
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <div className="flex items-center">
                <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-500 font-medium">5.3%</span>
              </div>
              <div className="text-green-500">
                {completedPayments} completed
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Transactions
              </h3>
              <span className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-full">
                <Activity className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
              </span>
            </div>
            <div className="flex items-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalTransactions}
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
              <span className="text-red-500 font-medium">2.1%</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">
                from last {timeframe}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Charts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Revenue vs Expenses
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Monthly comparison of revenue and expenses
            </p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sampleRevenueData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fill: "#6b7280" }} />
                  <YAxis tick={{ fill: "#6b7280" }} />
                  <Tooltip
                    formatter={(value) => [`$${value.toLocaleString()}`, ""]}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      borderRadius: "6px",
                      boxShadow:
                        "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                      border: "none",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="revenue"
                    name="Revenue"
                    fill="#4F46E5"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Expenses"
                    fill="#F97316"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Cash Flow Forecast
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Actual vs projected cash flow for next 6 months
            </p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={sampleCashFlowData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fill: "#6b7280" }} />
                  <YAxis tick={{ fill: "#6b7280" }} />
                  <Tooltip
                    formatter={(value) => [`$${value.toLocaleString()}`, ""]}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      borderRadius: "6px",
                      boxShadow:
                        "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                      border: "none",
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    name="Actual"
                    stroke="#4F46E5"
                    fill="#4F46E5"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="forecast"
                    name="Forecast"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden lg:col-span-2">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Financial Metrics
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Key performance indicators and financial ratios
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Current Ratio
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {financialMetrics.currentRatio.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  Liquidity
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Debt to Equity
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {financialMetrics.debtToEquity.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  Leverage
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Profit Margin
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {financialMetrics.profitMargin.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  Profitability
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  ROE
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {financialMetrics.returnOnEquity.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  Return on Equity
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Days Receivable
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {financialMetrics.daysReceivable}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  Collection Period
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Days Payable
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {financialMetrics.daysPayable}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  Payment Period
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Payment Methods
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Distribution by payment processor
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={samplePaymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {samplePaymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Percentage"]}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      borderRadius: "6px",
                      boxShadow:
                        "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                      border: "none",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-8"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Recent Transactions
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Latest financial activities
          </p>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {transaction.description}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {transaction.category}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(
                        transaction.transactionDate,
                      ).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                      ${transaction.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-center">
            <button className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
              View all transactions
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
