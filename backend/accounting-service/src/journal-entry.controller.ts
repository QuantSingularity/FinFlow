import { Request, Response, NextFunction } from "express";
import journalEntryService from "./journal-entry.service";
import {
  JournalEntryCreateInput,
  JournalEntryUpdateInput,
} from "./journal-entry.types";

class JournalEntryController {
  // Create a new journal entry
  async createJournalEntry(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const {
        invoiceId,
        debitAccount,
        creditAccount,
        amount,
        date,
        description,
      } = req.body;

      // Create journal entry input
      const journalEntryInput: JournalEntryCreateInput = {
        invoiceId,
        debitAccount,
        creditAccount,
        amount,
        date: date ? new Date(date) : undefined,
        description,
      };

      // Create journal entry
      const journalEntry = await journalEntryService.create(journalEntryInput);

      res.status(201).json(journalEntry);
    } catch (error) {
      next(error);
    }
  }

  // Get journal entry by ID
  async getJournalEntryById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;

      // Get journal entry by ID
      const journalEntry = await journalEntryService.findById(id);

      if (!journalEntry) {
        res.status(404).json({ message: "Journal entry not found" });
        return;
      }

      res.status(200).json(journalEntry);
    } catch (error) {
      next(error);
    }
  }

  // Get journal entries by invoice ID
  async getJournalEntriesByInvoiceId(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { invoiceId } = req.params;

      // Get journal entries by invoice ID
      const journalEntries =
        await journalEntryService.findByInvoiceId(invoiceId);

      res.status(200).json(journalEntries);
    } catch (error) {
      next(error);
    }
  }

  // Update journal entry
  async updateJournalEntry(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { debitAccount, creditAccount, amount, date, description } =
        req.body;

      // Get journal entry by ID
      const journalEntry = await journalEntryService.findById(id);

      if (!journalEntry) {
        res.status(404).json({ message: "Journal entry not found" });
        return;
      }

      // Create journal entry update input
      const journalEntryInput: JournalEntryUpdateInput = {};

      if (debitAccount !== undefined)
        journalEntryInput.debitAccount = debitAccount;
      if (creditAccount !== undefined)
        journalEntryInput.creditAccount = creditAccount;
      if (amount !== undefined) journalEntryInput.amount = amount;
      if (date !== undefined) journalEntryInput.date = new Date(date);
      if (description !== undefined)
        journalEntryInput.description = description;

      // Update journal entry
      const updatedJournalEntry = await journalEntryService.update(
        id,
        journalEntryInput,
      );

      res.status(200).json(updatedJournalEntry);
    } catch (error) {
      next(error);
    }
  }

  // Delete journal entry
  async deleteJournalEntry(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;

      // Get journal entry by ID
      const journalEntry = await journalEntryService.findById(id);

      if (!journalEntry) {
        res.status(404).json({ message: "Journal entry not found" });
        return;
      }

      // Delete journal entry
      await journalEntryService.delete(id);

      res.status(200).json({ message: "Journal entry deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  // Get all journal entries
  async getAllJournalEntries(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Get all journal entries
      const journalEntries = await journalEntryService.findAll();

      res.status(200).json(journalEntries);
    } catch (error) {
      next(error);
    }
  }
}

export default new JournalEntryController();
