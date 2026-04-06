import { Router } from "express";
import accountingController from "./accounting.controller";

const router = Router();

router.post("/journal-entries", accountingController.createJournalEntry);
router.get("/journal-entries", accountingController.getAllJournalEntries);
router.get("/journal-entries/:id", accountingController.getJournalEntryById);
router.get("/reports/trial-balance", accountingController.getTrialBalance);
router.get(
  "/reports/income-statement",
  accountingController.getIncomeStatement,
);
router.get("/reports/balance-sheet", accountingController.getBalanceSheet);
router.get("/reports/cash-flow", accountingController.getCashFlowStatement);
router.get("/accounts", accountingController.getAllAccounts);
router.get("/accounts/:id", accountingController.getAccountById);
router.get("/accounts/:id/balance", accountingController.getAccountBalance);
router.get(
  "/analytics/financial-metrics",
  accountingController.getFinancialMetrics,
);
router.get(
  "/analytics/transaction-summary",
  accountingController.getTransactionSummary,
);

export default router;
