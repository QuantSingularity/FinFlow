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
    return this.prisma.forecast.create({
      data,
    });
  }

  async update(id: string, data: ForecastUpdateInput): Promise<Forecast> {
    return this.prisma.forecast.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Forecast> {
    return this.prisma.forecast.delete({
      where: { id },
    });
  }

  async findByUserIdAndPeriod(
    userId: string,
    year: number,
    month: number,
  ): Promise<Forecast | null> {
    return this.prisma.forecast.findFirst({
      where: {
        userId,
        year,
        month,
      },
    });
  }

  async deleteByUserId(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.forecast.deleteMany({
      where: { userId },
    });

    return { count: result.count };
  }
}

export default new ForecastModel();
