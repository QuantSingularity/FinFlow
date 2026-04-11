import invoiceModel from "./models/invoice.model";
import {
  InvoiceCreateInput,
  InvoiceUpdateInput,
  Invoice,
} from "./invoice.types";
import { sendMessage } from "../../common/kafka";
import { logger } from "../../common/logger";
import { InvoiceStatus } from "./invoice.types";

class InvoiceService {
  // Find invoice by ID
  async findById(id: string): Promise<Invoice | null> {
    try {
      return await invoiceModel.findById(id);
    } catch (error) {
      logger.error(`Error finding invoice by ID: ${error}`);
      throw error;
    }
  }

  // Find invoices by user ID
  async findByUserId(userId: string): Promise<Invoice[]> {
    try {
      return await invoiceModel.findByUserId(userId);
    } catch (error) {
      logger.error(`Error finding invoices by user ID: ${error}`);
      throw error;
    }
  }

  // Create invoice
  async create(data: InvoiceCreateInput): Promise<Invoice> {
    try {
      const invoice = await invoiceModel.create(data);

      // Publish invoice_created event to Kafka
      await this.publishInvoiceCreatedEvent(invoice);

      return invoice;
    } catch (error) {
      logger.error(`Error creating invoice: ${error}`);
      throw error;
    }
  }

  // Update invoice
  async update(id: string, data: InvoiceUpdateInput): Promise<Invoice> {
    try {
      // Check if invoice exists
      const existingInvoice = await this.findById(id);
      if (!existingInvoice) {
        const error = new Error("Invoice not found");
        error.name = "NotFoundError";
        throw error;
      }

      const invoice = await invoiceModel.update(id, data);

      // If status changed to PAID, publish invoice_paid event
      if (
        data.status === InvoiceStatus.PAID &&
        existingInvoice.status !== InvoiceStatus.PAID
      ) {
        await this.publishInvoicePaidEvent(invoice);
      }

      return invoice;
    } catch (error) {
      logger.error(`Error updating invoice: ${error}`);
      throw error;
    }
  }

  // Delete invoice
  async delete(id: string): Promise<Invoice> {
    try {
      // Check if invoice exists
      const existingInvoice = await this.findById(id);
      if (!existingInvoice) {
        const error = new Error("Invoice not found");
        error.name = "NotFoundError";
        throw error;
      }

      return await invoiceModel.delete(id);
    } catch (error) {
      logger.error(`Error deleting invoice: ${error}`);
      throw error;
    }
  }

  // Find all invoices
  async findAll(): Promise<Invoice[]> {
    try {
      return await invoiceModel.findAll();
    } catch (error) {
      logger.error(`Error finding all invoices: ${error}`);
      throw error;
    }
  }

  // Check for overdue invoices and update status
  async checkOverdueInvoices(): Promise<void> {
    try {
      const invoices = await invoiceModel.findAll();
      const now = new Date();

      for (const invoice of invoices) {
        if (invoice.status === InvoiceStatus.PENDING && invoice.dueDate < now) {
          await this.update(invoice.id, { status: InvoiceStatus.OVERDUE });

          // Publish invoice_overdue event
          await this.publishInvoiceOverdueEvent({
            ...invoice,
            status: InvoiceStatus.OVERDUE,
          });
        }
      }
    } catch (error) {
      logger.error(`Error checking overdue invoices: ${error}`);
      throw error;
    }
  }

  // Publish invoice_created event to Kafka
  private async publishInvoiceCreatedEvent(invoice: Invoice): Promise<void> {
    try {
      await sendMessage("invoice_created", {
        id: invoice.id,
        userId: invoice.userId,
        client: invoice.client,
        amount: invoice.amount,
        dueDate: invoice.dueDate,
        status: invoice.status,
        createdAt: invoice.createdAt,
      });
    } catch (error) {
      logger.error(`Error publishing invoice_created event: ${error}`);
      // Don't throw error, just log it
    }
  }

  // Publish invoice_paid event to Kafka
  private async publishInvoicePaidEvent(invoice: Invoice): Promise<void> {
    try {
      await sendMessage("invoice_paid", {
        id: invoice.id,
        userId: invoice.userId,
        client: invoice.client,
        amount: invoice.amount,
        paidDate: new Date(),
        createdAt: invoice.createdAt,
      });
    } catch (error) {
      logger.error(`Error publishing invoice_paid event: ${error}`);
      // Don't throw error, just log it
    }
  }

  // Publish invoice_overdue event to Kafka
  private async publishInvoiceOverdueEvent(invoice: Invoice): Promise<void> {
    try {
      await sendMessage("invoice_overdue", {
        id: invoice.id,
        userId: invoice.userId,
        client: invoice.client,
        amount: invoice.amount,
        dueDate: invoice.dueDate,
        createdAt: invoice.createdAt,
      });
    } catch (error) {
      logger.error(`Error publishing invoice_overdue event: ${error}`);
      // Don't throw error, just log it
    }
  }
}

export default new InvoiceService();
