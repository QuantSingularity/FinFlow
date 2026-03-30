import type { Payment } from "../types";
import api from "./api";

export const getPayments = async (): Promise<Payment[]> => {
  const response = await api.get("/payments");
  return response.data;
};

export const getPayment = async (id: string): Promise<Payment> => {
  const response = await api.get(`/payments/${id}`);
  return response.data;
};

export const createPayment = async (
  paymentData: Omit<
    Payment,
    | "id"
    | "status"
    | "processorId"
    | "processorData"
    | "createdAt"
    | "updatedAt"
  >,
): Promise<Payment> => {
  const response = await api.post("/payments/charge", paymentData);
  return response.data;
};

export const updatePayment = async (
  id: string,
  paymentData: Partial<Payment>,
): Promise<Payment> => {
  const response = await api.put(`/payments/${id}`, paymentData);
  return response.data;
};
