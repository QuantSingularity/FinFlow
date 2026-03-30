import type { Transaction } from "../types";
import api from "./api";

export const getTransactions = async (): Promise<Transaction[]> => {
  const response = await api.get("/analytics/transactions");
  return response.data;
};

export const getTransaction = async (id: string): Promise<Transaction> => {
  const response = await api.get(`/analytics/transactions/${id}`);
  return response.data;
};

export const createTransaction = async (
  transactionData: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
): Promise<Transaction> => {
  const response = await api.post("/analytics/transactions", transactionData);
  return response.data;
};

export const updateTransaction = async (
  id: string,
  transactionData: Partial<Transaction>,
): Promise<Transaction> => {
  const response = await api.put(
    `/analytics/transactions/${id}`,
    transactionData,
  );
  return response.data;
};

export const deleteTransaction = async (id: string): Promise<void> => {
  await api.delete(`/analytics/transactions/${id}`);
};

export const getCategorizedTransactions = async (): Promise<Transaction[]> => {
  const response = await api.get("/analytics/categorize");
  return response.data;
};

export const getForecast = async (
  startDate: string,
  endDate: string,
  type: "revenue" | "expense" | "cashflow",
): Promise<any> => {
  const response = await api.get("/analytics/forecast", {
    params: { startDate, endDate, type },
  });
  return response.data;
};
