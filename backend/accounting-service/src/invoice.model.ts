import { PrismaClient } from "@prisma/client";
import {
  Invoice,
  InvoiceCreateInput,
  InvoiceUpdateInput,
} from "./invoice.types";

class InvoiceModel {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findById(id: string): Promise<Invoice | null> {
    return this.prisma.invoice.findUnique({
      where: { id },
    });
  }

  async findByUserId(userId: string): Promise<Invoice[]> {
    return this.prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: InvoiceCreateInput): Promise<Invoice> {
    return this.prisma.invoice.create({
      data,
    });
  }

  async update(id: string, data: InvoiceUpdateInput): Promise<Invoice> {
    return this.prisma.invoice.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Invoice> {
    return this.prisma.invoice.delete({
      where: { id },
    });
  }

  async findAll(): Promise<Invoice[]> {
    return this.prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
    });
  }
}

export default new InvoiceModel();
