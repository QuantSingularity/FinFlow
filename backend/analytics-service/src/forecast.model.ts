import { PrismaClient } from "@prisma/client";
import {
  Forecast,
  ForecastCreateInput,
  ForecastUpdateInput,
} from "./forecast.types";

class ForecastModel {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findById(id: string): Promise<Forecast | null> {
    return this.prisma.forecast.findUnique({
      where: { id },
    });
  }

  async findByUserId(userId: string): Promise<Forecast[]> {
    return this.prisma.forecast.findMany({
      where: { userId },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });
  }

  async create(data: ForecastCreateInput): Promise<Forecast> {
    return this.prisma.forecast.create({ data });
  }

  async update(id: string, data: ForecastUpdateInput): Promise<Forecast> {
    return this.prisma.forecast.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Forecast> {
    return this.prisma.forecast.delete({ where: { id } });
  }

  async findByUserIdAndPeriod(
    userId: string,
    year: number,
    month: number,
  ): Promise<Forecast | null> {
    return this.prisma.forecast.findFirst({
      where: { userId, year, month },
    });
  }

  async deleteByUserId(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.forecast.deleteMany({
      where: { userId },
    });
    return { count: result.count };
  }

  /**
   * Get historical data for a given forecast type (e.g. "REVENUE").
   */
  async getHistoricalData(forecastType: string): Promise<any[]> {
    const forecasts = await this.prisma.forecast.findMany({
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });
    return forecasts.map((f: any) => ({
      date: new Date(f.year, f.month - 1, 1),
      amount: f.actualAmount ?? f.forecastedAmount ?? 0,
      forecastType,
    }));
  }

  /**
   * Generate forecast data points from historical data between startDate and endDate.
   */
  async generateForecast(
    historicalData: any[],
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    if (!historicalData || historicalData.length < 2) return [];

    const lastAmount = historicalData[historicalData.length - 1].amount;
    const growth =
      historicalData[0].amount > 0
        ? (historicalData[historicalData.length - 1].amount -
            historicalData[0].amount) /
          historicalData[0].amount /
          (historicalData.length - 1)
        : 0;

    const results: any[] = [];
    const current = new Date(startDate);
    let step = 0;

    while (current <= endDate) {
      results.push({
        date: new Date(current),
        amount: lastAmount * (1 + growth) ** (step + 1),
        confidence: Math.max(0.5, 0.9 - step * 0.05),
      });
      current.setMonth(current.getMonth() + 1);
      step++;
    }

    return results;
  }
}

export default new ForecastModel();
