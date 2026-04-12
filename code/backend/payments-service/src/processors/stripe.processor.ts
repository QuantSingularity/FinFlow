import dotenv from "dotenv";
import Stripe from "stripe";
import { PaymentProcessorInterface } from "../interfaces/payment-processor.interface";
import { logger } from "../utils/logger";

// Load environment variables
dotenv.config();

/**
 * Stripe Payment Processor Implementation
 *
 * This class implements the PaymentProcessorInterface for Stripe payment processing.
 */
export class StripeProcessor implements PaymentProcessorInterface {
  private stripeClient: Stripe;

  constructor() {
    const apiKey = process.env.STRIPE_SECRET || "";
    if (!apiKey && process.env.NODE_ENV === "production") {
      throw new Error("STRIPE_SECRET environment variable is required");
    }

    this.stripeClient = new Stripe(apiKey, {
      apiVersion:
        (process.env.STRIPE_API_VERSION as Stripe.LatestApiVersion) ||
        "2023-10-16",
    });
  }

  getName(): string {
    return "stripe";
  }

  async createPaymentIntent(
    amount: number,
    currency: string = "usd",
    metadata: Record<string, any> = {},
  ): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripeClient.paymentIntents.create({
        amount,
        currency,
        metadata,
      });
    } catch (error) {
      logger.error(`Stripe payment intent creation failed: ${error}`);
      throw error;
    }
  }

  async createCharge(
    amount: number,
    currency: string = "usd",
    source: string,
    metadata: Record<string, any> = {},
  ): Promise<Stripe.Charge> {
    try {
      return await this.stripeClient.charges.create({
        amount,
        currency,
        source,
        metadata,
      });
    } catch (error) {
      logger.error(`Stripe charge creation failed: ${error}`);
      throw error;
    }
  }

  async retrieveCharge(chargeId: string): Promise<Stripe.Charge> {
    try {
      return await this.stripeClient.charges.retrieve(chargeId);
    } catch (error) {
      logger.error(`Stripe charge retrieval failed: ${error}`);
      throw error;
    }
  }

  async createRefund(
    chargeId: string,
    amount?: number,
    reason?: string,
  ): Promise<Stripe.Refund> {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        charge: chargeId,
      };

      if (amount) {
        refundParams.amount = amount;
      }

      if (reason) {
        refundParams.reason = reason as Stripe.RefundCreateParams.Reason;
      }

      return await this.stripeClient.refunds.create(refundParams);
    } catch (error) {
      logger.error(`Stripe refund creation failed: ${error}`);
      throw error;
    }
  }

  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
  ): Stripe.Event {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
      if (!webhookSecret) {
        throw new Error(
          "STRIPE_WEBHOOK_SECRET environment variable is required",
        );
      }

      return this.stripeClient.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (error) {
      logger.error(`Stripe webhook signature verification failed: ${error}`);
      throw error;
    }
  }

  async processWebhookEvent(event: Stripe.Event): Promise<void> {
    // This method will be implemented in the payment service
    // as it requires access to the payment model and other services
    logger.info(`Stripe webhook event received: ${event.type}`);
  }

  getClientConfig(): Record<string, any> {
    return {
      publicKey: process.env.STRIPE_PUBLIC_KEY || "",
      apiVersion: process.env.STRIPE_API_VERSION || "2023-10-16",
    };
  }

  // FIX: these four methods were defined outside the class body (after its
  // closing brace), making the file unparseable. Moved inside the class.

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
    return {
      status: charge.status,
      updatedAt: new Date(charge.created * 1000),
    };
  }
}

export default new StripeProcessor();
