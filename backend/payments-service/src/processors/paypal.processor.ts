import dotenv from "dotenv";
import { PaymentProcessorInterface } from "../interfaces/payment-processor.interface";
import { logger } from "../utils/logger";
import axios from "axios";

// Load environment variables
dotenv.config();

/**
 * PayPal Payment Processor Implementation
 *
 * This class implements the PaymentProcessorInterface for PayPal payment processing.
 */
export class PayPalProcessor implements PaymentProcessorInterface {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID || "";
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET || "";
    this.baseUrl =
      process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com";

    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        "PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables are required",
      );
    }
  }

  getName(): string {
    return "paypal";
  }

  /**
   * Get OAuth access token for PayPal API
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if it's still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(
        `${this.clientId}:${this.clientSecret}`,
      ).toString("base64");
      const response = await axios({
        method: "post",
        url: `${this.baseUrl}/v1/oauth2/token`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${auth}`,
        },
        data: "grant_type=client_credentials",
      });

      this.accessToken = response.data.access_token;
      // Set expiry time with a small buffer (5 minutes)
      this.tokenExpiry =
        Date.now() + response.data.expires_in * 1000 - 5 * 60 * 1000;

      return this.accessToken;
    } catch (error) {
      logger.error(`PayPal access token retrieval failed: ${error}`);
      throw error;
    }
  }

  async createPaymentIntent(
    amount: number,
    currency: string = "USD",
    metadata: Record<string, any> = {},
  ): Promise<any> {
    try {
      const token = await this.getAccessToken();

      // Convert amount to dollars with 2 decimal places for PayPal (they use dollars, not cents)
      const paypalAmount = (amount / 100).toFixed(2);

      const response = await axios({
        method: "post",
        url: `${this.baseUrl}/v2/checkout/orders`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        data: {
          intent: "CAPTURE",
          purchase_units: [
            {
              amount: {
                currency_code: currency.toUpperCase(),
                value: paypalAmount,
              },
              custom_id: metadata.userId || "",
              description: metadata.description || "Payment intent",
            },
          ],
          application_context: {
            return_url:
              process.env.PAYPAL_RETURN_URL || "https://example.com/success",
            cancel_url:
              process.env.PAYPAL_CANCEL_URL || "https://example.com/cancel",
          },
        },
      });

      return response.data;
    } catch (error) {
      logger.error(`PayPal payment intent creation failed: ${error}`);
      throw error;
    }
  }

  async createCharge(
    amount: number,
    currency: string = "USD",
    source: string, // This is the PayPal order ID
    metadata: Record<string, any> = {},
  ): Promise<any> {
    try {
      const token = await this.getAccessToken();

      // In PayPal, we capture an existing order to complete the payment
      const response = await axios({
        method: "post",
        url: `${this.baseUrl}/v2/checkout/orders/${source}/capture`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      logger.error(`PayPal charge creation failed: ${error}`);
      throw error;
    }
  }

  async retrieveCharge(chargeId: string): Promise<any> {
    try {
      const token = await this.getAccessToken();

      const response = await axios({
        method: "get",
        url: `${this.baseUrl}/v2/checkout/orders/${chargeId}`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      logger.error(`PayPal charge retrieval failed: ${error}`);
      throw error;
    }
  }

  async createRefund(
    chargeId: string,
    amount?: number,
    reason?: string,
  ): Promise<any> {
    try {
      const token = await this.getAccessToken();

      // For PayPal, we need to get the capture ID from the order first
      const order = await this.retrieveCharge(chargeId);
      const captureId = order.purchase_units[0].payments.captures[0].id;

      // Create refund request
      const refundData: any = {};

      if (amount) {
        // Convert amount to dollars with 2 decimal places for PayPal
        const paypalAmount = (amount / 100).toFixed(2);
        refundData.amount = {
          value: paypalAmount,
          currency_code:
            order.purchase_units[0].payments.captures[0].amount.currency_code,
        };
      }

      if (reason) {
        refundData.note_to_payer = reason;
      }

      const response = await axios({
        method: "post",
        url: `${this.baseUrl}/v2/payments/captures/${captureId}/refund`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        data: refundData,
      });

      return response.data;
    } catch (error) {
      logger.error(`PayPal refund creation failed: ${error}`);
      throw error;
    }
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): any {
    try {
      // PayPal webhook verification requires additional headers
      // This is a simplified implementation
      const webhookId = process.env.PAYPAL_WEBHOOK_ID;
      if (!webhookId) {
        throw new Error("PAYPAL_WEBHOOK_ID environment variable is required");
      }

      // In a real implementation, we would verify the signature using PayPal's SDK
      // For now, we'll just return the parsed payload
      return JSON.parse(payload.toString());
    } catch (error) {
      logger.error(`PayPal webhook signature verification failed: ${error}`);
      throw error;
    }
  }

  async processWebhookEvent(event: any): Promise<void> {
    // This method will be implemented in the payment service
    logger.info(`PayPal webhook event received: ${event.event_type}`);
  }

  getClientConfig(): Record<string, any> {
    return {
      clientId: this.clientId,
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

export default new PayPalProcessor();
