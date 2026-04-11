import axios from "axios";
import logger from "../../common/logger";
import forecastModel from "./forecast.model";

class AnalyticsService {
  private analyticsApiUrl: string;

  constructor() {
    this.analyticsApiUrl =
      process.env.ANALYTICS_API_URL || "http://analytics-service:3004/api";
  }

  async getTransactionsByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    try {
      return [];
    } catch (error) {
      logger.error("Error getting transactions by date range: " + error);
      throw error;
    }
  }

  /**
   * Generate transaction summary. Accepts either an array of transactions or (startDate, endDate).
   */
  async generateTransactionSummary(
    transactionsOrStart: any,
    endDate?: Date,
  ): Promise<any> {
    try {
      // If called with an array of transactions, post to analytics API
      if (Array.isArray(transactionsOrStart)) {
        const transactions = transactionsOrStart;
        const response = await axios.post(
          `${this.analyticsApiUrl}/transaction-summary`,
          { transactions },
        );
        return response.data;
      }
      // Legacy date-range form
      return {
        startDate: transactionsOrStart,
        endDate,
        totalTransactions: 0,
        totalAmount: 0,
        currency: "USD",
        byType: {},
        byStatus: {},
      };
    } catch (error) {
      logger.error("Error generating transaction summary: " + error);
      // Fallback: calculate locally
      if (Array.isArray(transactionsOrStart)) {
        return this.generateBasicTransactionSummary(transactionsOrStart);
      }
      throw error;
    }
  }

  /**
   * Calculate financial metrics by posting to the analytics API.
   */
  async calculateFinancialMetrics(
    incomeStatement: any,
    balanceSheet: any,
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.analyticsApiUrl}/financial-metrics`,
        { incomeStatement, balanceSheet },
      );
      return response.data;
    } catch (error) {
      logger.error(`Error calculating financial metrics: ${error}`);
      return this.calculateBasicFinancialMetrics(incomeStatement, balanceSheet);
    }
  }

  /**
   * Send accounting data to analytics service for processing.
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
    }
  }

  /**
   * Generate a financial forecast using historical data from forecastModel.
   */
  async generateForecast(
    startDate: Date,
    endDate: Date,
    forecastType: string,
  ): Promise<any> {
    const validTypes = [
      "revenue",
      "expenses",
      "cashflow",
      "REVENUE",
      "EXPENSES",
      "CASHFLOW",
    ];
    if (!validTypes.includes(forecastType)) {
      const err = new Error(`Invalid forecast type: ${forecastType}`);
      err.name = "ValidationError";
      throw err;
    }
    try {
      const historicalData =
        await forecastModel.getHistoricalData(forecastType);

      if (!historicalData || historicalData.length < 2) {
        throw new Error("Insufficient historical data for forecast");
      }

      const forecastData = await forecastModel.generateForecast(
        historicalData,
        startDate,
        endDate,
      );

      const averageGrowth = this.calculateAverageGrowth(historicalData);
      const confidenceLevel = 0.85;

      return {
        forecastType,
        startDate,
        endDate,
        historicalData,
        forecastData,
        averageGrowth,
        confidenceLevel,
      };
    } catch (error) {
      logger.error("Error generating forecast: " + error);
      throw error;
    }
  }

  async getDashboardMetrics(): Promise<any> {
    try {
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        netIncome: 0,
        activeUsers: 0,
        pendingPayments: 0,
        updatedAt: new Date(),
      };
    } catch (error) {
      logger.error("Error getting dashboard metrics: " + error);
      throw error;
    }
  }

  async getPaymentAnalytics(startDate: Date, endDate: Date): Promise<any> {
    try {
      return {
        startDate,
        endDate,
        totalPayments: 0,
        successRate: 0,
        averageAmount: 0,
        byProcessor: {},
        byStatus: {},
      };
    } catch (error) {
      logger.error("Error getting payment analytics: " + error);
      throw error;
    }
  }

  async generateCustomReport(reportConfig: any): Promise<any> {
    if (!reportConfig || !reportConfig.reportType) {
      const err = new Error(
        "Invalid report configuration: reportType is required",
      );
      err.name = "ValidationError";
      throw err;
    }
    try {
      return {
        reportId: "report_" + Date.now(),
        reportType: reportConfig.reportType,
        generatedAt: new Date(),
        data: [],
        metadata: reportConfig,
      };
    } catch (error) {
      logger.error("Error generating custom report: " + error);
      throw error;
    }
  }

  private calculateAverageGrowth(historicalData: any[]): number {
    if (!historicalData || historicalData.length < 2) return 0;
    let totalGrowth = 0;
    for (let i = 1; i < historicalData.length; i++) {
      const prev = historicalData[i - 1].amount;
      if (prev > 0) {
        totalGrowth += (historicalData[i].amount - prev) / prev;
      }
    }
    return totalGrowth / (historicalData.length - 1);
  }

  private calculateBasicFinancialMetrics(
    incomeStatement: any,
    balanceSheet: any,
  ): any {
    const netIncome = incomeStatement.netIncome || 0;
    const totalAssets = balanceSheet.totalAssets || 0;
    const totalLiabilities = balanceSheet.totalLiabilities || 0;
    const totalEquity = balanceSheet.totalEquity || 0;
    const totalRevenue = incomeStatement.totalRevenue || 0;

    const returnOnAssets =
      totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0;
    const returnOnEquity =
      totalEquity > 0 ? (netIncome / totalEquity) * 100 : 0;
    const profitMargin =
      totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
    const debtToEquityRatio =
      totalEquity > 0 ? totalLiabilities / totalEquity : 0;

    const currentAssets = (balanceSheet.assetItems || [])
      .filter((item: any) => String(item.accountCode || "").startsWith("1"))
      .reduce((sum: number, item: any) => sum + item.amount, 0);
    const currentLiabilities = (balanceSheet.liabilityItems || [])
      .filter((item: any) => String(item.accountCode || "").startsWith("2"))
      .reduce((sum: number, item: any) => sum + item.amount, 0);
    const currentRatio =
      currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;

    const inventory = (balanceSheet.assetItems || [])
      .filter((item: any) => String(item.accountCode || "").startsWith("12"))
      .reduce((sum: number, item: any) => sum + item.amount, 0);
    const quickRatio =
      currentLiabilities > 0
        ? (currentAssets - inventory) / currentLiabilities
        : 0;

    return {
      returnOnAssets,
      returnOnEquity,
      profitMargin,
      debtToEquityRatio,
      currentRatio,
      quickRatio,
      calculatedLocally: true,
    };
  }

  private generateBasicTransactionSummary(transactions: any[]): any {
    const categoryMap: Record<string, number> = {};
    const dateMap: Record<string, number> = {};
    let totalAmount = 0;

    for (const t of transactions) {
      const cat = t.category || "Uncategorized";
      categoryMap[cat] = (categoryMap[cat] || 0) + (t.amount || 0);
      totalAmount += t.amount || 0;
      const dateStr =
        t.date instanceof Date
          ? t.date.toISOString().split("T")[0]
          : String(t.date).split("T")[0];
      dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
    }

    return {
      totalTransactions: transactions.length,
      totalAmount,
      averageAmount:
        transactions.length > 0 ? totalAmount / transactions.length : 0,
      categorySummary: Object.entries(categoryMap).map(
        ([category, amount]) => ({ category, amount }),
      ),
      transactionsByDate: Object.entries(dateMap).map(([date, count]) => ({
        date,
        count,
      })),
      calculatedLocally: true,
    };
  }
}

export default new AnalyticsService();
