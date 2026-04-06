import journalEntryModel from "./models/journal-entry.model";
import {
  JournalEntryCreateInput,
  JournalEntryUpdateInput,
  JournalEntry,
} from "./journal-entry.types";
import { sendMessage } from "../../common/kafka";
import { logger } from "../../common/logger";

class JournalEntryService {
  // Find journal entry by ID
  async findById(id: string): Promise<JournalEntry | null> {
    try {
      return await journalEntryModel.findById(id);
    } catch (error) {
      logger.error(`Error finding journal entry by ID: ${error}`);
      throw error;
    }
  }

  // Find journal entries by invoice ID
  async findByInvoiceId(invoiceId: string): Promise<JournalEntry[]> {
    try {
      return await journalEntryModel.findByInvoiceId(invoiceId);
    } catch (error) {
      logger.error(`Error finding journal entries by invoice ID: ${error}`);
      throw error;
    }
  }

  // Create journal entry
  async create(data: JournalEntryCreateInput): Promise<JournalEntry> {
    try {
      const journalEntry = await journalEntryModel.create(data);

      // Publish journal_entry_created event to Kafka
      await this.publishJournalEntryCreatedEvent(journalEntry);

      return journalEntry;
    } catch (error) {
      logger.error(`Error creating journal entry: ${error}`);
      throw error;
    }
  }

  // Update journal entry
  async update(
    id: string,
    data: JournalEntryUpdateInput,
  ): Promise<JournalEntry> {
    try {
      // Check if journal entry exists
      const existingJournalEntry = await this.findById(id);
      if (!existingJournalEntry) {
        const error = new Error("Journal entry not found");
        error.name = "NotFoundError";
        throw error;
      }

      return await journalEntryModel.update(id, data);
    } catch (error) {
      logger.error(`Error updating journal entry: ${error}`);
      throw error;
    }
  }

  // Delete journal entry
  async delete(id: string): Promise<JournalEntry> {
    try {
      // Check if journal entry exists
      const existingJournalEntry = await this.findById(id);
      if (!existingJournalEntry) {
        const error = new Error("Journal entry not found");
        error.name = "NotFoundError";
        throw error;
      }

      return await journalEntryModel.delete(id);
    } catch (error) {
      logger.error(`Error deleting journal entry: ${error}`);
      throw error;
    }
  }

  // Find all journal entries
  async findAll(): Promise<JournalEntry[]> {
    try {
      return await journalEntryModel.findAll();
    } catch (error) {
      logger.error(`Error finding all journal entries: ${error}`);
      throw error;
    }
  }

  // Publish journal_entry_created event to Kafka
  private async publishJournalEntryCreatedEvent(
    journalEntry: JournalEntry,
  ): Promise<void> {
    try {
      await sendMessage("journal_entry_created", {
        id: journalEntry.id,
        invoiceId: journalEntry.invoiceId,
        debitAccount: journalEntry.debitAccount,
        creditAccount: journalEntry.creditAccount,
        amount: journalEntry.amount,
        date: journalEntry.date,
        description: journalEntry.description,
        createdAt: journalEntry.createdAt,
      });
    } catch (error) {
      logger.error(`Error publishing journal_entry_created event: ${error}`);
      // Don't throw error, just log it
    }
  }
}

export default new JournalEntryService();
