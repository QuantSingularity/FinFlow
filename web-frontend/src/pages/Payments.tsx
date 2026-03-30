import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  Clock,
  CreditCard,
  Download,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  XCircle,
} from "lucide-react";
import React from "react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { formatCurrency, formatDate } from "../lib/utils";

// Mock API service
const fetchPayments = async () => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 800));
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

const Payments: React.FC = () => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [sortField, setSortField] = React.useState("date");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(
    "desc",
  );
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
  const [methodFilter, setMethodFilter] = React.useState<string | null>(null);

  // Use React Query for data fetching
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: fetchPayments,
  });

  // Filter and sort payments
  const filteredPayments = React.useMemo(() => {
    return payments
      .filter(
        (payment) =>
          (statusFilter === null || payment.status === statusFilter) &&
          (methodFilter === null || payment.method === methodFilter) &&
          (searchTerm === "" ||
            payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            payment.customer.toLowerCase().includes(searchTerm.toLowerCase())),
      )
      .sort((a, b) => {
        if (sortField === "amount") {
          return sortDirection === "asc"
            ? a.amount - b.amount
            : b.amount - a.amount;
        } else if (sortField === "date") {
          return sortDirection === "asc"
            ? new Date(a.date).getTime() - new Date(b.date).getTime()
            : new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        return 0;
      });
  }, [
    payments,
    searchTerm,
    sortField,
    sortDirection,
    statusFilter,
    methodFilter,
  ]);

  // Calculate summary statistics
  const totalAmount = filteredPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  const completedAmount = filteredPayments
    .filter((payment) => payment.status === "COMPLETED")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const pendingAmount = filteredPayments
    .filter((payment) => payment.status === "PENDING")
    .reduce((sum, payment) => sum + payment.amount, 0);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
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

  // Status icon mapping
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "PENDING":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
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
          Payments
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Process and track your payment transactions
        </p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
      >
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(totalAmount)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {filteredPayments.length} transactions
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {formatCurrency(completedAmount)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {
                  filteredPayments.filter(
                    (payment) => payment.status === "COMPLETED",
                  ).length
                }{" "}
                transactions
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">
                {formatCurrency(pendingAmount)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {
                  filteredPayments.filter(
                    (payment) => payment.status === "PENDING",
                  ).length
                }{" "}
                transactions
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Actions and Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
      >
        <div className="flex items-center gap-2">
          <Button variant="primary" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Payment
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-64 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          <div className="relative w-full sm:w-auto">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={statusFilter || ""}
              onChange={(e) => setStatusFilter(e.target.value || null)}
              className="pl-9 pr-4 py-2 w-full sm:w-40 appearance-none rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <div className="relative w-full sm:w-auto">
            <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={methodFilter || ""}
              onChange={(e) => setMethodFilter(e.target.value || null)}
              className="pl-9 pr-4 py-2 w-full sm:w-40 appearance-none rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="">All Methods</option>
              <option value="Credit Card">Credit Card</option>
              <option value="PayPal">PayPal</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Square">Square</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Payments Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
      >
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              <span>Loading payments...</span>
            </div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-8 text-center">
            <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              No payments found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm || statusFilter || methodFilter
                ? "Try adjusting your search or filters to find what you're looking for."
                : "Create your first payment to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Transaction ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Method
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("date")}
                  >
                    <div className="flex items-center">
                      Date
                      {sortField === "date" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="ml-1 h-4 w-4" />
                        ) : (
                          <ArrowDown className="ml-1 h-4 w-4" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("amount")}
                  >
                    <div className="flex items-center">
                      Amount
                      {sortField === "amount" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="ml-1 h-4 w-4" />
                        ) : (
                          <ArrowDown className="ml-1 h-4 w-4" />
                        ))}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {payment.id}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {payment.customer}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {payment.method}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(payment.date)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(payment.status)}
                        <span
                          className={`ml-2 inline-flex items-center text-sm font-medium ${
                            payment.status === "COMPLETED"
                              ? "text-green-600 dark:text-green-400"
                              : payment.status === "PENDING"
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {payment.status.charAt(0) +
                            payment.status.slice(1).toLowerCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filteredPayments.length > 0 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button variant="outline" size="sm">
                Previous
              </Button>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-400">
                  Showing <span className="font-medium">1</span> to{" "}
                  <span className="font-medium">10</span> of{" "}
                  <span className="font-medium">{filteredPayments.length}</span>{" "}
                  results
                </p>
              </div>
              <div>
                <nav
                  className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  aria-label="Pagination"
                >
                  <Button variant="outline" size="sm" className="rounded-l-md">
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-r-md">
                    Next
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Payments;
