/** Shared metadata type used across all processor calls */
export type ProcessorMetadata = Record<
  string,
  string | number | boolean | null | undefined
>;

/** Generic processor response — processors return different shapes; callers should narrow */
export interface ProcessorResult {
  id: string;
  status: string;
  amount?: number;
  currency?: string;
  [key: string]: unknown;
}

export interface PaymentDetails {
  amount: number;
  currency?: string;
  source: string;
  description?: string;
  metadata?: ProcessorMetadata;
  processorType?: string;
  userId?: string;
}

export interface RefundDetails {
  chargeId: string;
  amount?: number;
  reason?: string;
  metadata?: ProcessorMetadata;
}

export interface PaymentProcessorInterface {
  getName(): string;
  createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: ProcessorMetadata,
  ): Promise<ProcessorResult>;
  createCharge(
    amount: number,
    currency: string,
    source: string,
    metadata?: ProcessorMetadata,
  ): Promise<ProcessorResult>;
  retrieveCharge(chargeId: string): Promise<ProcessorResult>;
  createRefund(
    chargeId: string,
    amount?: number,
    reason?: string,
  ): Promise<ProcessorResult>;
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;
  processWebhookEvent(event: Record<string, unknown>): Promise<void>;
  getClientConfig(): Record<string, string | number | boolean | null>;
  processPayment(paymentDetails: PaymentDetails): Promise<ProcessorResult>;
  refundPayment(refundDetails: RefundDetails): Promise<ProcessorResult>;
  getPaymentStatus(processorPaymentId: string): Promise<ProcessorResult>;
  validatePaymentDetails(paymentDetails: PaymentDetails): boolean;
}
