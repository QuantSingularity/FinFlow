import transactionModel from "./models/transaction.model";
import {
  TransactionCreateInput,
  TransactionUpdateInput,
  Transaction,
} from "./transaction.types";
import { sendMessage } from "../../common/kafka";
import { logger } from "../../common/logger";
import categoryService from "./category.service";

class TransactionService {
  // Find transaction by ID
  async findById(id: string): Promise<Transaction | null> {
    try {
      return await transactionModel.findById(id);
    } catch (error) {
      logger.error(`Error finding transaction by ID: ${error}`);
      throw error;
    }
  }

  // Find transactions by user ID
  async findByUserId(userId: string): Promise<Transaction[]> {
    try {
      return await transactionModel.findByUserId(userId);
    } catch (error) {
      logger.error(`Error finding transactions by user ID: ${error}`);
      throw error;
    }
  }

  // Create transaction
  async create(data: TransactionCreateInput): Promise<Transaction> {
    try {
      // Auto-categorize transaction if no category provided
      if (!data.category && data.description) {
        data.category = await categoryService.categorizeTransaction(
          data.description,
        );
      }

      const transaction = await transactionModel.create(data);

      // Publish transaction_created event to Kafka
      await this.publishTransactionCreatedEvent(transaction);

      return transaction;
    } catch (error) {
      logger.error(`Error creating transaction: ${error}`);
      throw error;
    }
  }

  // Update transaction
  async update(id: string, data: TransactionUpdateInput): Promise<Transaction> {
    try {
      // Check if transaction exists
      const existingTransaction = await this.findById(id);
      if (!existingTransaction) {
        const error = new Error("Transaction not found");
        error.name = "NotFoundError";
        throw error;
      }

      // Auto-categorize transaction if description changed but no category provided
      if (data.description && !data.category) {
        data.category = await categoryService.categorizeTransaction(
          data.description,
        );
      }

      const transaction = await transactionModel.update(id, data);

      return transaction;
    } catch (error) {
      logger.error(`Error updating transaction: ${error}`);
      throw error;
    }
  }

  // Delete transaction
  async delete(id: string): Promise<Transaction> {
    try {
      // Check if transaction exists
      const existingTransaction = await this.findById(id);
      if (!existingTransaction) {
        const error = new Error("Transaction not found");
        error.name = "NotFoundError";
        throw error;
      }

      return await transactionModel.delete(id);
    } catch (error) {
      logger.error(`Error deleting transaction: ${error}`);
      throw error;
    }
  }

  // Find all transactions
  async findAll(): Promise<Transaction[]> {
    try {
      return await transactionModel.findAll();
    } catch (error) {
      logger.error(`Error finding all transactions: ${error}`);
      throw error;
    }
  }

  // Find transactions by user ID and date range
  async findByUserIdAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Transaction[]> {
    try {
      return await transactionModel.findByUserIdAndDateRange(
        userId,
        startDate,
        endDate,
      );
    } catch (error) {
      logger.error(
        `Error finding transactions by user ID and date range: ${error}`,
      );
      throw error;
    }
  }

  // Publish transaction_created event to Kafka
  private async publishTransactionCreatedEvent(
    transaction: Transaction,
  ): Promise<void> {
    try {
      await sendMessage("transaction_created", {
        id: transaction.id,
        userId: transaction.userId,
        amount: transaction.amount,
        category: transaction.category,
        description: transaction.description,
        date: transaction.date,
        createdAt: transaction.createdAt,
      });
    } catch (error) {
      logger.error(`Error publishing transaction_created event: ${error}`);
      // Don't throw error, just log it
    }
  }
}

export default new TransactionService();
