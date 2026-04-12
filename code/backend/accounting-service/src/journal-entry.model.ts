import { PrismaClient } from "@prisma/client";
import {
  JournalEntry,
  JournalEntryCreateInput,
  JournalEntryUpdateInput,
} from "./journal-entry.types";

class JournalEntryModel {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findById(id: string): Promise<JournalEntry | null> {
    return this.prisma.journalEntry.findUnique({
      where: { id },
    });
  }

  async findByInvoiceId(invoiceId: string): Promise<JournalEntry[]> {
    return this.prisma.journalEntry.findMany({
      where: { invoiceId },
      orderBy: { date: "desc" },
    });
  }

  async create(data: JournalEntryCreateInput): Promise<JournalEntry> {
    return this.prisma.journalEntry.create({
      data,
    });
  }

  async update(
    id: string,
    data: JournalEntryUpdateInput,
  ): Promise<JournalEntry> {
    return this.prisma.journalEntry.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<JournalEntry> {
    return this.prisma.journalEntry.delete({
      where: { id },
    });
  }

  async findAll(): Promise<JournalEntry[]> {
    return this.prisma.journalEntry.findMany({
      orderBy: { date: "desc" },
    });
  }
}

export default new JournalEntryModel();
