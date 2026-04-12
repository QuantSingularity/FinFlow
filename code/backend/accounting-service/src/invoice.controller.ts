import { Request, Response, NextFunction } from "express";
import invoiceService from "./invoice.service";
import { InvoiceCreateInput, InvoiceUpdateInput } from "./invoice.types";

class InvoiceController {
  // Create a new invoice
  async createInvoice(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { client, amount, dueDate, status } = req.body;
      const userId = req.user.sub; // Get user ID from JWT token

      // Create invoice input
      const invoiceInput: InvoiceCreateInput = {
        userId,
        client,
        amount,
        dueDate: new Date(dueDate),
        status,
      };

      // Create invoice
      const invoice = await invoiceService.create(invoiceInput);

      res.status(201).json(invoice);
    } catch (error) {
      next(error);
    }
  }

  // Get invoice by ID
  async getInvoiceById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.sub; // Get user ID from JWT token

      // Get invoice by ID
      const invoice = await invoiceService.findById(id);

      if (!invoice) {
        res.status(404).json({ message: "Invoice not found" });
        return;
      }

      // Check if user owns the invoice
      if (invoice.userId !== userId) {
        res.status(403).json({
          message: "Forbidden: You do not have access to this invoice",
        });
        return;
      }

      res.status(200).json(invoice);
    } catch (error) {
      next(error);
    }
  }

  // Get invoices by user ID
  async getInvoicesByUserId(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user.sub; // Get user ID from JWT token

      // Get invoices by user ID
      const invoices = await invoiceService.findByUserId(userId);

      res.status(200).json(invoices);
    } catch (error) {
      next(error);
    }
  }

  // Update invoice
  async updateInvoice(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { client, amount, dueDate, status } = req.body;
      const userId = req.user.sub; // Get user ID from JWT token

      // Get invoice by ID
      const invoice = await invoiceService.findById(id);

      if (!invoice) {
        res.status(404).json({ message: "Invoice not found" });
        return;
      }

      // Check if user owns the invoice
      if (invoice.userId !== userId) {
        res.status(403).json({
          message: "Forbidden: You do not have access to this invoice",
        });
        return;
      }

      // Create invoice update input
      const invoiceInput: InvoiceUpdateInput = {};

      if (client !== undefined) invoiceInput.client = client;
      if (amount !== undefined) invoiceInput.amount = amount;
      if (dueDate !== undefined) invoiceInput.dueDate = new Date(dueDate);
      if (status !== undefined) invoiceInput.status = status;

      // Update invoice
      const updatedInvoice = await invoiceService.update(id, invoiceInput);

      res.status(200).json(updatedInvoice);
    } catch (error) {
      next(error);
    }
  }

  // Delete invoice
  async deleteInvoice(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.sub; // Get user ID from JWT token

      // Get invoice by ID
      const invoice = await invoiceService.findById(id);

      if (!invoice) {
        res.status(404).json({ message: "Invoice not found" });
        return;
      }

      // Check if user owns the invoice
      if (invoice.userId !== userId) {
        res.status(403).json({
          message: "Forbidden: You do not have access to this invoice",
        });
        return;
      }

      // Delete invoice
      await invoiceService.delete(id);

      res.status(200).json({ message: "Invoice deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

export default new InvoiceController();
