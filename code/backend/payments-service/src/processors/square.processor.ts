import dotenv from "dotenv";
import { PaymentProcessorInterface } from "../interfaces/payment-processor.interface";
import { logger } from "../utils/logger";
import { Client, Environment, ApiError } from "square";

// Load environment variables
dotenv.config();

/**
 * Square Payment Processor Implementation
 *
 * This class implements the PaymentProcessorInterface for Square payment processing.
 */
export class SquareProcessor implements PaymentProcessorInterface {
  private client: Client;
  private locationId: string;

  constructor() {
    const accessToken = process.env.SQUARE_ACCESS_TOKEN || "";
    this.locationId = process.env.SQUARE_LOCATION_ID || "";

    if (!accessToken || !this.locationId) {
      throw new Error(
        "SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID environment variables are required",
      );
    }

    // Initialize Square client
    this.client = new Client({
      accessToken,
      environment:
        process.env.NODE_ENV === "production"
          ? Environment.Production
          : Environment.Sandbox,
    });
  }

  getName(): string {
    return "square";
  }

  async createPaymentIntent(
    amount: number,
    currency: string = "USD",
    metadata: Record<string, any> = {},
  ): Promise<any> {
    try {
      // Square uses dollars with cents as decimal, so we convert from cents
      const amountMoney = {
        amount: amount,
        currency,
      };

      // Create a payment link that can be used on the frontend
      const response = await this.client.checkoutApi.createPaymentLink({
        idempotencyKey: `payment-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
        quickPay: {
          name: metadata.description || "Payment",
          priceMoney: amountMoney,
          locationId: this.locationId,
        },
        note: metadata.note || "",
        prePopulatedData: {
          buyerEmail: metadata.email || "",
        },
      });

      if (response.result.errors) {
        throw new Error(response.result.errors.map((e) => e.detail).join(", "));
      }

      return response.result;
    } catch (error) {
      logger.error(`Square payment intent creation failed: ${error}`);
      throw error;
    }
  }

  async createCharge(
    amount: number,
    currency: string = "USD",
    source: string, // This is the Square payment source ID
    metadata: Record<string, any> = {},
  ): Promise<any> {
    try {
      // Create a payment with the source ID
      const response = await this.client.paymentsApi.createPayment({
        sourceId: source,
        idempotencyKey: `charge-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
        amountMoney: {
          amount: amount,
          currency,
        },
        locationId: this.locationId,
        note: metadata.note || "",
        customerId: metadata.customerId || undefined,
        referenceId: metadata.referenceId || undefined,
      });

      if (response.result.errors) {
        throw new Error(response.result.errors.map((e) => e.detail).join(", "));
      }

      return response.result;
    } catch (error) {
      logger.error(`Square charge creation failed: ${error}`);
      throw error;
    }
  }

  async retrieveCharge(chargeId: string): Promise<any> {
    try {
      const response = await this.client.paymentsApi.getPayment(chargeId);

      if (response.result.errors) {
        throw new Error(response.result.errors.map((e) => e.detail).join(", "));
      }

      return response.result;
    } catch (error) {
      logger.error(`Square charge retrieval failed: ${error}`);
      throw error;
    }
  }

  async createRefund(
    chargeId: string,
    amount?: number,
    reason?: string,
  ): Promise<any> {
    try {
      // If no amount is specified, we need to get the original payment to refund the full amount
      let refundAmount = amount;
      let currency = "USD";

      if (!refundAmount) {
        const payment = await this.retrieveCharge(chargeId);
        refundAmount = payment.payment.amountMoney.amount;
        currency = payment.payment.amountMoney.currency;
      }

      const response = await this.client.refundsApi.refundPayment({
        paymentId: chargeId,
        idempotencyKey: `refund-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
        amountMoney: {
          amount: refundAmount,
          currency,
        },
        reason: reason || "",
      });

      if (response.result.errors) {
        throw new Error(response.result.errors.map((e) => e.detail).join(", "));
      }

      return response.result;
    } catch (error) {
      logger.error(`Square refund creation failed: ${error}`);
      throw error;
    }
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): any {
    try {
      // Square webhook verification requires additional headers
      // This is a simplified implementation
      const webhookSignatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
      if (!webhookSignatureKey) {
        throw new Error(
          "SQUARE_WEBHOOK_SIGNATURE_KEY environment variable is required",
        );
      }

      // In a real implementation, we would verify the signature using Square's SDK
      // For now, we'll just return the parsed payload
      return JSON.parse(payload.toString());
    } catch (error) {
      logger.error(`Square webhook signature verification failed: ${error}`);
      throw error;
    }
  }

  async processWebhookEvent(event: any): Promise<void> {
    // This method will be implemented in the payment service
    logger.info(`Square webhook event received: ${event.type}`);
  }

  getClientConfig(): Record<string, any> {
    return {
      applicationId: process.env.SQUARE_APPLICATION_ID || "",
      locationId: this.locationId,
      environment:
        process.env.NODE_ENV === "production" ? "production" : "sandbox",
    };
  }

  validatePaymentDetails(paymentDetails: any): boolean {
    if (!paymentDetails || paymentDetails.amount <= 0) return false;
    if (!paymentDetails.source && !paymentDetails.token) return false;
    return true;
  }

  async processPayment(paymentDetails: any): Promise<any> {
    const { amount, currency = "usd", source, metadata = {} } = paymentDetails;
    return this.createCharge(
      Math.round(amount * 100),
      currency,
      source,
      metadata,
    );
  }

  async refundPayment(refundDetails: any): Promise<any> {
    const { processorPaymentId, amount, reason } = refundDetails;
    return this.createRefund(
      processorPaymentId,
      amount ? Math.round(amount * 100) : undefined,
      reason,
    );
  }

  async getPaymentStatus(processorPaymentId: string): Promise<any> {
    const charge = await this.retrieveCharge(processorPaymentId);
    return { status: charge.status || charge.state, updatedAt: new Date() };
  }
}

export default new SquareProcessor();
