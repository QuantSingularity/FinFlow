import express from "express";
import journalEntryController from "./journal-entry.controller";

const router = express.Router();

router.post(
  "/",
  journalEntryController.createJournalEntry.bind(journalEntryController),
);
router.get(
  "/:id",
  journalEntryController.getJournalEntryById.bind(journalEntryController),
);
router.get(
  "/invoice/:invoiceId",
  journalEntryController.getJournalEntriesByInvoiceId.bind(
    journalEntryController,
  ),
);
router.put(
  "/:id",
  journalEntryController.updateJournalEntry.bind(journalEntryController),
);
router.delete(
  "/:id",
  journalEntryController.deleteJournalEntry.bind(journalEntryController),
);
router.get(
  "/",
  journalEntryController.getAllJournalEntries.bind(journalEntryController),
);

export default router;
