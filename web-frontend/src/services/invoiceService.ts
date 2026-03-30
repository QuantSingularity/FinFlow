import type { Invoice } from "../types";
import api from "./api";

export const getInvoices = async (): Promise<Invoice[]> => {
  const response = await api.get("/accounting/invoices");
  return response.data;
};

export const getInvoice = async (id: string): Promise<Invoice> => {
  const response = await api.get(`/accounting/invoices/${id}`);
  return response.data;
};

export const createInvoice = async (
  invoiceData: Omit<Invoice, "id" | "createdAt" | "updatedAt">,
): Promise<Invoice> => {
  const response = await api.post("/accounting/invoices", invoiceData);
  return response.data;
};

export const updateInvoice = async (
  id: string,
  invoiceData: Partial<Invoice>,
): Promise<Invoice> => {
  const response = await api.put(`/accounting/invoices/${id}`, invoiceData);
  return response.data;
};

export const deleteInvoice = async (id: string): Promise<void> => {
  await api.delete(`/accounting/invoices/${id}`);
};
