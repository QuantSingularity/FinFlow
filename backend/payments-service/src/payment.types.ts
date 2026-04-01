import { PaymentStatus } from "@prisma/client";

export enum ProcessorType {
  STRIPE = "stripe",
  PAYPAL = "paypal",
  SQUARE = "square",
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  processorId?: string;
  processorType: ProcessorType;
  processorData: any;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentCreateInput {
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  processorId?: string;
  processorType: ProcessorType;
  processorData: any;
  metadata?: any;
}

export interface PaymentUpdateInput {
  status?: PaymentStatus;
  processorId?: string;
  processorData?: any;
  metadata?: any;
}

export interface ChargeInput {
  userId: string;
  amount: number;
  currency?: string;
  source: string;
  processorType?: ProcessorType;
  metadata?: any;
}

export interface RefundInput {
  paymentId: string;
  amount?: number;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface PaymentMethodInput {
  userId: string;
  type: string;
  token: string;
  isDefault?: boolean;
  metadata?: any;
}

export interface PaymentMethodUpdateInput {
  isDefault?: boolean;
  metadata?: any;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  type: string;
  token: string;
  isDefault: boolean;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentWebhookInput {
  processorType: ProcessorType;
  event: any;
  signature: string;
  payload: string | Buffer;
}
