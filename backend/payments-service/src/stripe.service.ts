import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16" as Stripe.LatestApiVersion,
});

export const createPaymentIntent = async (
  amount: number,
  currency: string = "usd",
  metadata: any = {},
): Promise<Stripe.PaymentIntent> => {
  return stripeClient.paymentIntents.create({ amount, currency, metadata });
};

export const createCharge = async (
  amount: number,
  currency: string = "usd",
  source: string,
  metadata: any = {},
): Promise<Stripe.Charge> => {
  return stripeClient.charges.create({ amount, currency, source, metadata });
};

export const retrieveCharge = async (
  chargeId: string,
): Promise<Stripe.Charge> => {
  return stripeClient.charges.retrieve(chargeId);
};

export const createRefund = async (
  chargeId: string,
  amount?: number,
  reason?: string,
): Promise<Stripe.Refund> => {
  const refundParams: Stripe.RefundCreateParams = { charge: chargeId };
  if (amount) refundParams.amount = amount;
  if (reason) refundParams.reason = reason as Stripe.RefundCreateParams.Reason;
  return stripeClient.refunds.create(refundParams);
};

export const verifyWebhookSignature = (
  payload: string | Buffer,
  signature: string,
): Stripe.Event => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is required");
  }
  return stripeClient.webhooks.constructEvent(
    payload,
    signature,
    webhookSecret,
  );
};

export default {
  stripeClient,
  createPaymentIntent,
  createCharge,
  retrieveCharge,
  createRefund,
  verifyWebhookSignature,
};
