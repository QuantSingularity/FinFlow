import express from "express";
import transactionController from "./transaction.controller";

const router = express.Router();

router.post(
  "/",
  transactionController.createTransaction.bind(transactionController),
);
router.get(
  "/date-range",
  transactionController.getTransactionsByDateRange.bind(transactionController),
);
router.get(
  "/:id",
  transactionController.getTransactionById.bind(transactionController),
);
router.get(
  "/",
  transactionController.getTransactionsByUserId.bind(transactionController),
);
router.put(
  "/:id",
  transactionController.updateTransaction.bind(transactionController),
);
router.delete(
  "/:id",
  transactionController.deleteTransaction.bind(transactionController),
);

export default router;
