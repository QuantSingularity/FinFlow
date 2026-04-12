import { PrismaClient } from "@prisma/client";
import {
  Payment,
  PaymentCreateInput,
  PaymentUpdateInput,
} from "../types/payment.types";

class PaymentModel {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findById(id: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({ where: { id } }) as any;
  }

  async findByUserId(userId: string): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }) as any;
  }

  async findByProcessorId(processorId: string): Promise<Payment | null> {
    return this.prisma.payment.findFirst({ where: { processorId } }) as any;
  }

  async findByMetadataRequestId(requestId: string): Promise<Payment | null> {
    return this.prisma.payment.findFirst({
      where: {
        metadata: {
          path: ["requestId"],
          equals: requestId,
        },
      },
    }) as any;
  }

  async findRefundByMetadataRequestId(
    requestId: string,
  ): Promise<Payment | null> {
    return this.prisma.payment.findFirst({
      where: {
        status: "REFUNDED",
        metadata: {
          path: ["requestId"],
          equals: requestId,
        },
      },
    }) as any;
  }

  async create(data: PaymentCreateInput): Promise<Payment> {
    return this.prisma.payment.create({ data }) as any;
  }

  async update(id: string, data: PaymentUpdateInput): Promise<Payment> {
    return this.prisma.payment.update({ where: { id }, data }) as any;
  }

  async delete(id: string): Promise<Payment> {
    return this.prisma.payment.delete({ where: { id } }) as any;
  }

  async findAll(): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
    }) as any;
  }
}

export default new PaymentModel();
