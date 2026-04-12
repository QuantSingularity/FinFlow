import logger from "../../common/logger";
import transactionModel from "./models/transaction.model";
import forecastModel from "./models/forecast.model";
import { ForecastCreateInput } from "./forecast.types";

const TRANSACTION_HISTORY_MONTHS = parseInt(
  process.env.TRANSACTION_HISTORY_MONTHS || "12",
);

class ForecastService {
  async generateForecast(userId: string, months: number = 3): Promise<any[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - TRANSACTION_HISTORY_MONTHS);

      const transactions = await transactionModel.findByUserIdAndDateRange(
        userId,
        startDate,
        endDate,
      );

      if (transactions.length < 3) {
        throw new Error("Insufficient transaction data for forecast");
      }

      const processedData = this.preprocessTransactions(transactions);
      const forecast = await this.runForecastModel(
        userId,
        processedData,
        months,
      );
      await this.saveForecastResults(userId, forecast);

      return forecast;
    } catch (error) {
      logger.error(`Error generating forecast: ${error}`);
      throw error;
    }
  }

  private preprocessTransactions(transactions: any[]): any[] {
    const monthlyData: { [key: string]: number } = {};

    transactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyData[monthKey]) monthlyData[monthKey] = 0;
      monthlyData[monthKey] += transaction.amount;
    });

    const sortedKeys = Object.keys(monthlyData).sort();
    return sortedKeys.map((key) => ({ date: key, amount: monthlyData[key] }));
  }

  private async runForecastModel(
    userId: string,
    data: any[],
    months: number,
  ): Promise<any[]> {
    try {
      if (data.length < 2) {
        throw new Error("Not enough data points to calculate trend");
      }

      let sum = 0;
      for (let i = 1; i < data.length; i++) {
        sum += data[i].amount - data[i - 1].amount;
      }
      const avgChange = sum / (data.length - 1);

      const forecast = [];
      const lastAmount = data[data.length - 1].amount;

      for (let i = 1; i <= months; i++) {
        const forecastDate = new Date();
        forecastDate.setMonth(forecastDate.getMonth() + i);
        const forecastAmount = lastAmount + avgChange * i;
        const confidence = Math.max(0.5, 1 - i * 0.1);

        forecast.push({
          userId,
          month: forecastDate.getMonth() + 1,
          year: forecastDate.getFullYear(),
          amount: forecastAmount,
          confidence,
        });
      }

      return forecast;
    } catch (error) {
      logger.error(`Error running forecast model: ${error}`);
      throw error;
    }
  }

  private async saveForecastResults(
    userId: string,
    forecast: any[],
  ): Promise<void> {
    try {
      await forecastModel.deleteByUserId(userId);

      for (const item of forecast) {
        const forecastInput: ForecastCreateInput = {
          userId: item.userId,
          month: item.month,
          year: item.year,
          amount: item.amount,
          confidence: item.confidence,
        };
        await forecastModel.create(forecastInput);
      }
    } catch (error) {
      logger.error(`Error saving forecast results: ${error}`);
      throw error;
    }
  }

  async getForecastsByUserId(userId: string): Promise<any[]> {
    try {
      return await forecastModel.findByUserId(userId);
    } catch (error) {
      logger.error(`Error getting forecasts by user ID: ${error}`);
      throw error;
    }
  }
}

export default new ForecastService();
