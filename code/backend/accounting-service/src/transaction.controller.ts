import { Request, Response, NextFunction } from "express";
import transactionService from "./transaction.service";
import {
  TransactionCreateInput,
  TransactionUpdateInput,
} from "./transaction.types";

class TransactionController {
  // Create a new transaction
  async createTransaction(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { amount, category, description, date } = req.body;
      const userId = req.user.sub; // Get user ID from JWT token

      // Create transaction input
      const transactionInput: TransactionCreateInput = {
        userId,
        amount,
        category,
        description,
        date: date ? new Date(date) : undefined,
      };

      // Create transaction
      const transaction = await transactionService.create(transactionInput);

      res.status(201).json(transaction);
    } catch (error) {
      next(error);
    }
  }

  // Get transaction by ID
  async getTransactionById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.sub; // Get user ID from JWT token

      // Get transaction by ID
      const transaction = await transactionService.findById(id);

      if (!transaction) {
        res.status(404).json({ message: "Transaction not found" });
        return;
      }

      // Check if user owns the transaction
      if (transaction.userId !== userId) {
        res.status(403).json({
          message: "Forbidden: You do not have access to this transaction",
        });
        return;
      }

      res.status(200).json(transaction);
    } catch (error) {
      next(error);
    }
  }

  // Get transactions by user ID
  async getTransactionsByUserId(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user.sub; // Get user ID from JWT token

      // Get transactions by user ID
      const transactions = await transactionService.findByUserId(userId);

      res.status(200).json(transactions);
    } catch (error) {
      next(error);
    }
  }

  // Update transaction
  async updateTransaction(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { amount, category, description, date } = req.body;
      const userId = req.user.sub; // Get user ID from JWT token

      // Get transaction by ID
      const transaction = await transactionService.findById(id);

      if (!transaction) {
        res.status(404).json({ message: "Transaction not found" });
        return;
      }

      // Check if user owns the transaction
      if (transaction.userId !== userId) {
        res.status(403).json({
          message: "Forbidden: You do not have access to this transaction",
        });
        return;
      }

      // Create transaction update input
      const transactionInput: TransactionUpdateInput = {};

      if (amount !== undefined) transactionInput.amount = amount;
      if (category !== undefined) transactionInput.category = category;
      if (description !== undefined) transactionInput.description = description;
      if (date !== undefined) transactionInput.date = new Date(date);

      // Update transaction
      const updatedTransaction = await transactionService.update(
        id,
        transactionInput,
      );

      res.status(200).json(updatedTransaction);
    } catch (error) {
      next(error);
    }
  }

  // Delete transaction
  async deleteTransaction(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.sub; // Get user ID from JWT token

      // Get transaction by ID
      const transaction = await transactionService.findById(id);

      if (!transaction) {
        res.status(404).json({ message: "Transaction not found" });
        return;
      }

      // Check if user owns the transaction
      if (transaction.userId !== userId) {
        res.status(403).json({
          message: "Forbidden: You do not have access to this transaction",
        });
        return;
      }

      // Delete transaction
      await transactionService.delete(id);

      res.status(200).json({ message: "Transaction deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  // Get transactions by date range
  async getTransactionsByDateRange(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user.sub; // Get user ID from JWT token
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res
          .status(400)
          .json({ message: "Start date and end date are required" });
        return;
      }

      // Get transactions by user ID and date range
      const transactions = await transactionService.findByUserIdAndDateRange(
        userId,
        new Date(startDate as string),
        new Date(endDate as string),
      );

      res.status(200).json(transactions);
    } catch (error) {
      next(error);
    }
  }
}

export default new TransactionController();
