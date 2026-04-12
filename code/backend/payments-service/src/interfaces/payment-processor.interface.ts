export interface PaymentProcessorInterface {
  getName(): string;
  createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, any>,
  ): Promise<any>;
  createCharge(
    amount: number,
    currency: string,
    source: string,
    metadata?: Record<string, any>,
  ): Promise<any>;
  retrieveCharge(chargeId: string): Promise<any>;
  createRefund(
    chargeId: string,
    amount?: number,
    reason?: string,
  ): Promise<any>;
  verifyWebhookSignature(payload: string | Buffer, signature: string): any;
  processWebhookEvent(event: any): Promise<void>;
  getClientConfig(): Record<string, any>;
  processPayment(paymentDetails: any): Promise<any>;
  refundPayment(refundDetails: any): Promise<any>;
  getPaymentStatus(processorPaymentId: string): Promise<any>;
  validatePaymentDetails(paymentDetails: any): boolean;
}
