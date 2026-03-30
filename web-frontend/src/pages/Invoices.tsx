import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Download,
  FileText,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
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
      issueDate: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    }));
};

const Invoices: React.FC = () => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [sortField, setSortField] = React.useState("dueDate");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(
    "asc",
  );
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);

  // Use React Query for data fetching
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: fetchInvoices,
  });

  // Filter and sort invoices
  const filteredInvoices = React.useMemo(() => {
    return invoices
      .filter(
        (invoice) =>
          (statusFilter === null || invoice.status === statusFilter) &&
          (searchTerm === "" ||
            invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.customer.toLowerCase().includes(searchTerm.toLowerCase())),
      )
      .sort((a, b) => {
        if (sortField === "amount") {
          return sortDirection === "asc"
            ? a.amount - b.amount
            : b.amount - a.amount;
        } else if (sortField === "dueDate") {
          return sortDirection === "asc"
            ? new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
            : new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        } else if (sortField === "issueDate") {
          return sortDirection === "asc"
            ? new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime()
            : new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
        }
        return 0;
      });
  }, [invoices, searchTerm, sortField, sortDirection, statusFilter]);

  // Calculate summary statistics
  const totalAmount = filteredInvoices.reduce(
    (sum, invoice) => sum + invoice.amount,
    0,
  );
  const pendingAmount = filteredInvoices
    .filter((invoice) => invoice.status === "PENDING")
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const overdueAmount = filteredInvoices
    .filter((invoice) => invoice.status === "OVERDUE")
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Invoices
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage and track your invoices
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
                Total Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(totalAmount)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {filteredInvoices.length} invoices
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
                  filteredInvoices.filter(
                    (invoice) => invoice.status === "PENDING",
                  ).length
                }{" "}
                invoices
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {formatCurrency(overdueAmount)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {
                  filteredInvoices.filter(
                    (invoice) => invoice.status === "OVERDUE",
                  ).length
                }{" "}
                invoices
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
            New Invoice
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
              placeholder="Search invoices..."
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
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Invoices Table */}
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
              <span>Loading invoices...</span>
            </div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              No invoices found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm || statusFilter
                ? "Try adjusting your search or filter to find what you're looking for."
                : "Create your first invoice to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("issueDate")}
                  >
                    <div className="flex items-center">
                      Issue Date
                      {sortField === "issueDate" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="ml-1 h-4 w-4" />
                        ) : (
                          <ArrowDown className="ml-1 h-4 w-4" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("dueDate")}
                  >
                    <div className="flex items-center">
                      Due Date
                      {sortField === "dueDate" &&
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
                {filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {invoice.id}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {invoice.customer}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(invoice.issueDate)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(invoice.dueDate)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          invoice.status === "PAID"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : invoice.status === "PENDING"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {invoice.status.charAt(0) +
                          invoice.status.slice(1).toLowerCase()}
                      </span>
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
        {filteredInvoices.length > 0 && (
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
                  <span className="font-medium">{filteredInvoices.length}</span>{" "}
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

export default Invoices;
