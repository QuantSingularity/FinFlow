import axios from "axios";
import { logger } from "../../common/logger";

class AnalyticsService {
  private analyticsApiUrl: string;

  constructor() {
    this.analyticsApiUrl =
      process.env.ANALYTICS_API_URL || "http://analytics-service:3004/api";
  }

  /**
   * Calculate financial metrics based on income statement and balance sheet data
   */
  async calculateFinancialMetrics(
    incomeStatement: any,
    balanceSheet: any,
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.analyticsApiUrl}/financial-metrics`,
        {
          incomeStatement,
          balanceSheet,
        },
      );

      return response.data;
    } catch (error) {
      logger.error(`Error calculating financial metrics: ${error}`);

      // If analytics service is unavailable, calculate basic metrics locally
      return this.calculateBasicFinancialMetrics(incomeStatement, balanceSheet);
    }
  }

  /**
   * Generate transaction summary based on transaction data
   */
  async generateTransactionSummary(transactions: any[]): Promise<any> {
    try {
      const response = await axios.post(
        `${this.analyticsApiUrl}/transaction-summary`,
        {
          transactions,
        },
      );

      return response.data;
    } catch (error) {
      logger.error(`Error generating transaction summary: ${error}`);

      // If analytics service is unavailable, generate basic summary locally
      return this.generateBasicTransactionSummary(transactions);
    }
  }

  /**
   * Send accounting data to analytics service for processing and storage
   */
  async sendAccountingDataToAnalytics(
    data: any,
    dataType: string,
  ): Promise<void> {
    try {
      await axios.post(`${this.analyticsApiUrl}/accounting-data`, {
        dataType,
        data,
      });
    } catch (error) {
      logger.error(`Error sending accounting data to analytics: ${error}`);
      // Don't throw error, just log it
    }
  }

  /**
   * Calculate basic financial metrics locally (fallback if analytics service is unavailable)
   */
  private calculateBasicFinancialMetrics(
    incomeStatement: any,
    balanceSheet: any,
  ): any {
    // Calculate basic financial ratios
    const netIncome = incomeStatement.netIncome;
    const totalAssets = balanceSheet.totalAssets;
    const totalLiabilities = balanceSheet.totalLiabilities;
    const totalEquity = balanceSheet.totalEquity;
    const totalRevenue = incomeStatement.totalRevenue;

    // Return on Assets (ROA)
    const returnOnAssets =
      totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0;

    // Return on Equity (ROE)
    const returnOnEquity =
      totalEquity > 0 ? (netIncome / totalEquity) * 100 : 0;

    // Profit Margin
    const profitMargin =
      totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

    // Debt to Equity Ratio
    const debtToEquityRatio =
      totalEquity > 0 ? totalLiabilities / totalEquity : 0;

    // Current Ratio (simplified)
    const currentAssets = balanceSheet.assetItems
      .filter((item: any) => item.accountCode.startsWith("1")) // Assuming current assets start with 1
      .reduce((sum: number, item: any) => sum + item.amount, 0);

    const currentLiabilities = balanceSheet.liabilityItems
      .filter((item: any) => item.accountCode.startsWith("2")) // Assuming current liabilities start with 2
      .reduce((sum: number, item: any) => sum + item.amount, 0);

    const currentRatio =
      currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;

    return {
      returnOnAssets,
      returnOnEquity,
      profitMargin,
      debtToEquityRatio,
      currentRatio,
      calculatedLocally: true,
    };
  }

  /**
   * Generate basic transaction summary locally (fallback if analytics service is unavailable)
   */
  private generateBasicTransactionSummary(transactions: any[]): any {
    // Group transactions by category
    const categorySummary: Record<string, number> = {};

    for (const transaction of transactions) {
      const category = transaction.category || "Uncategorized";

      if (!categorySummary[category]) {
        categorySummary[category] = 0;
      }

      categorySummary[category] += transaction.amount;
    }

    // Convert to array format
    const categorySummaryArray = Object.entries(categorySummary).map(
      ([category, amount]) => ({
        category,
        amount,
      }),
    );

    // Calculate total amount
    const totalAmount = transactions.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );

    // Calculate average transaction amount
    const averageAmount =
      transactions.length > 0 ? totalAmount / transactions.length : 0;

    // Get transaction count by date
    const transactionsByDate: Record<string, number> = {};

    for (const transaction of transactions) {
      const dateStr = transaction.date.toISOString().split("T")[0];

      if (!transactionsByDate[dateStr]) {
        transactionsByDate[dateStr] = 0;
      }

      transactionsByDate[dateStr]++;
    }

    return {
      totalTransactions: transactions.length,
      totalAmount,
      averageAmount,
      categorySummary: categorySummaryArray,
      transactionsByDate: Object.entries(transactionsByDate).map(
        ([date, count]) => ({
          date,
          count,
        }),
      ),
      calculatedLocally: true,
    };
  }
}

export default new AnalyticsService();
