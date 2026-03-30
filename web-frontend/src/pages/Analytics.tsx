import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart as BarChartIcon,
  Download, // Calendar, Filter,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Table as TableIcon,
  TrendingUp,
} from "lucide-react";
import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { formatCurrency } from "../lib/utils";

// Mock API service
const fetchAnalyticsData = async () => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return {
    revenueByMonth: [
      { month: "Jan", revenue: 12500, expenses: 8700, profit: 3800 },
      { month: "Feb", revenue: 14200, expenses: 9200, profit: 5000 },
      { month: "Mar", revenue: 15800, expenses: 9800, profit: 6000 },
      { month: "Apr", revenue: 16200, expenses: 10100, profit: 6100 },
      { month: "May", revenue: 18900, expenses: 11200, profit: 7700 },
      { month: "Jun", revenue: 19500, expenses: 11800, profit: 7700 },
      { month: "Jul", revenue: 21000, expenses: 12300, profit: 8700 },
      { month: "Aug", revenue: 22500, expenses: 13100, profit: 9400 },
      { month: "Sep", revenue: 24000, expenses: 14200, profit: 9800 },
      { month: "Oct", revenue: 25500, expenses: 15000, profit: 10500 },
      { month: "Nov", revenue: 27000, expenses: 15800, profit: 11200 },
      { month: "Dec", revenue: 29000, expenses: 16500, profit: 12500 },
    ],
    revenueByCategory: [
      { name: "Software Services", value: 45, color: "#4F46E5" },
      { name: "Consulting", value: 30, color: "#10B981" },
      { name: "Product Sales", value: 15, color: "#F59E0B" },
      { name: "Training", value: 10, color: "#EF4444" },
    ],
    expensesByCategory: [
      { name: "Salaries", value: 55, color: "#4F46E5" },
      { name: "Marketing", value: 15, color: "#10B981" },
      { name: "Operations", value: 20, color: "#F59E0B" },
      { name: "Other", value: 10, color: "#EF4444" },
    ],
    customerAcquisition: [
      { month: "Jan", newCustomers: 12, churnedCustomers: 2 },
      { month: "Feb", newCustomers: 15, churnedCustomers: 3 },
      { month: "Mar", newCustomers: 18, churnedCustomers: 4 },
      { month: "Apr", newCustomers: 22, churnedCustomers: 3 },
      { month: "May", newCustomers: 25, churnedCustomers: 5 },
      { month: "Jun", newCustomers: 28, churnedCustomers: 4 },
      { month: "Jul", newCustomers: 30, churnedCustomers: 6 },
      { month: "Aug", newCustomers: 32, churnedCustomers: 5 },
      { month: "Sep", newCustomers: 35, churnedCustomers: 7 },
      { month: "Oct", newCustomers: 38, churnedCustomers: 6 },
      { month: "Nov", newCustomers: 40, churnedCustomers: 8 },
      { month: "Dec", newCustomers: 45, churnedCustomers: 7 },
    ],
    kpis: {
      totalRevenue: 246100,
      totalExpenses: 147700,
      totalProfit: 98400,
      profitMargin: 40,
      customerLifetimeValue: 12500,
      customerAcquisitionCost: 1200,
      averageRevenuePerCustomer: 4500,
      totalCustomers: 340,
      activeCustomers: 290,
      churnRate: 5.2,
    },
  };
};

const Analytics: React.FC = () => {
  const [timeframe, setTimeframe] = React.useState("year");
  const [chartType, setChartType] = React.useState("revenue");

  // Use React Query for data fetching
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalyticsData,
  });

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

  if (isLoading || !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex items-center justify-center h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Loading analytics data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Financial Analytics
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive insights into your financial performance
        </p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(data.kpis.totalRevenue)}
              </div>
              <div className="flex items-center mt-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-500 font-medium">12.5%</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">
                  from last {timeframe}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(data.kpis.totalProfit)}
              </div>
              <div className="flex items-center mt-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-500 font-medium">8.3%</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">
                  from last {timeframe}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Profit Margin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.kpis.profitMargin}%
              </div>
              <div className="flex items-center mt-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-500 font-medium">2.1%</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">
                  from last {timeframe}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Active Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.kpis.activeCustomers}
              </div>
              <div className="flex items-center mt-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-500 font-medium">15.2%</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">
                  from last {timeframe}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Time period and chart type selectors */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
      >
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-800">
            {["month", "quarter", "year"].map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-4 py-2 text-sm font-medium ${
                  timeframe === period
                    ? "bg-primary-500 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                } ${period === "month" ? "rounded-l-md" : ""} ${period === "year" ? "rounded-r-md" : ""}`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>

          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setChartType("revenue")}
            className={`p-2 rounded-md ${
              chartType === "revenue"
                ? "bg-primary-500 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <BarChartIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setChartType("customers")}
            className={`p-2 rounded-md ${
              chartType === "customers"
                ? "bg-primary-500 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <LineChartIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setChartType("categories")}
            className={`p-2 rounded-md ${
              chartType === "categories"
                ? "bg-primary-500 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <PieChartIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setChartType("metrics")}
            className={`p-2 rounded-md ${
              chartType === "metrics"
                ? "bg-primary-500 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <TableIcon className="h-5 w-5" />
          </button>
        </div>
      </motion.div>

      {/* Main Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        {chartType === "revenue" && (
          <Card>
            <CardHeader>
              <CardTitle>Revenue, Expenses & Profit</CardTitle>
              <CardDescription>
                Monthly breakdown of financial performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.revenueByMonth}
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
                    <Bar
                      dataKey="profit"
                      name="Profit"
                      fill="#10B981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {chartType === "customers" && (
          <Card>
            <CardHeader>
              <CardTitle>Customer Acquisition & Churn</CardTitle>
              <CardDescription>
                Monthly customer growth and retention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.customerAcquisition}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fill: "#6b7280" }} />
                    <YAxis tick={{ fill: "#6b7280" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderRadius: "6px",
                        boxShadow:
                          "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                        border: "none",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="newCustomers"
                      name="New Customers"
                      stroke="#4F46E5"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="churnedCustomers"
                      name="Churned Customers"
                      stroke="#EF4444"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {chartType === "categories" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Category</CardTitle>
                <CardDescription>
                  Distribution of revenue sources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.revenueByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {data.revenueByCategory.map((entry, index) => (
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
                <CardDescription>
                  Distribution of expense categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.expensesByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {data.expensesByCategory.map((entry, index) => (
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
              </CardContent>
            </Card>
          </div>
        )}

        {chartType === "metrics" && (
          <Card>
            <CardHeader>
              <CardTitle>Key Performance Metrics</CardTitle>
              <CardDescription>
                Detailed financial and customer metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Customer Lifetime Value
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(data.kpis.customerLifetimeValue)}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    Average revenue per customer lifetime
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Customer Acquisition Cost
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(data.kpis.customerAcquisitionCost)}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    Cost to acquire a new customer
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Average Revenue Per Customer
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(data.kpis.averageRevenuePerCustomer)}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    Average revenue generated per customer
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Total Customers
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {data.kpis.totalCustomers}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    Total number of customers
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Churn Rate
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {data.kpis.churnRate}%
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    Percentage of customers lost
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    CLV:CAC Ratio
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {(
                      data.kpis.customerLifetimeValue /
                      data.kpis.customerAcquisitionCost
                    ).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    Value generated per acquisition cost
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
};

export default Analytics;
