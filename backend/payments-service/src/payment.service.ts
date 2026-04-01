import { PaymentStatus } from "@prisma/client";
import paymentModel from "./models/payment.model";
import { sendMessage } from "../../../common/kafka";
import {
  Payment,
  PaymentCreateInput,
  PaymentUpdateInput,
  ChargeInput,
  RefundInput,
  ProcessorType,
} from "./payment.types";
import logger from "./utils/logger";
import paymentProcessorFactory from "./factories/payment-processor.factory";

class PaymentService {
  async findById(id: string): Promise<Payment | null> {
    try {
      return await paymentModel.findById(id);
    } catch (error) {
      logger.error(`Error finding payment by ID: ${error}`);
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<Payment[]> {
    try {
      return await paymentModel.findByUserId(userId);
    } catch (error) {
      logger.error(`Error finding payments by user ID: ${error}`);
      throw error;
    }
  }

  async findByRequestId(requestId: string): Promise<Payment | null> {
    try {
      return await paymentModel.findByMetadataRequestId(requestId);
    } catch (error) {
      logger.error(`Error finding payment by request ID: ${error}`);
      return null;
    }
  }

  async findRefundByRequestId(requestId: string): Promise<Payment | null> {
    try {
      return await paymentModel.findRefundByMetadataRequestId(requestId);
    } catch (error) {
      logger.error(`Error finding refund by request ID: ${error}`);
      return null;
    }
  }

  getAvailableProcessors(): string[] {
    return paymentProcessorFactory
      .getAllProcessors()
      .map((processor) => processor.getName());
  }

  getProcessorConfigs(): Record<string, Record<string, any>> {
    return paymentProcessorFactory.getAllClientConfigs();
  }

  async createCharge(chargeInput: ChargeInput): Promise<Payment> {
    try {
      const {
        userId,
        amount,
        currency = "usd",
        source,
        metadata,
        processorType = ProcessorType.STRIPE,
      } = chargeInput;

      const processor = paymentProcessorFactory.getProcessor(processorType);

      const processorCharge = await processor.createCharge(
        Math.round(amount * 100),
        currency,
        source,
        metadata,
      );

      const paymentData: PaymentCreateInput = {
        userId,
        amount,
        currency,
        status: PaymentStatus.COMPLETED,
        processorId:
          processorCharge.id ||
          processorCharge.payment?.id ||
          processorCharge.order_id,
        processorType,
        processorData: processorCharge,
        metadata,
      };

      const payment = await paymentModel.create(paymentData);
      await this.publishPaymentCompletedEvent(payment);

      return payment;
    } catch (error: any) {
      logger.error(`Error creating payment charge: ${error}`);

      const {
        userId,
        amount,
        currency = "usd",
        metadata,
        processorType = ProcessorType.STRIPE,
      } = chargeInput;

      const paymentData: PaymentCreateInput = {
        userId,
        amount,
        currency,
        status: PaymentStatus.FAILED,
        processorType,
        processorData: { error: error.message },
        metadata,
      };

      const payment = await paymentModel.create(paymentData);
      await this.publishPaymentFailedEvent(payment, error.message);

      return payment;
    }
  }

  async createPaymentIntent(chargeInput: ChargeInput): Promise<any> {
    try {
      const {
        amount,
        currency = "usd",
        metadata,
        processorType = ProcessorType.STRIPE,
      } = chargeInput;

      const processor = paymentProcessorFactory.getProcessor(processorType);

      const paymentIntent = await processor.createPaymentIntent(
        Math.round(amount * 100),
        currency,
        { ...metadata, userId: chargeInput.userId },
      );

      return {
        processorType,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
      };
    } catch (error) {
      logger.error(`Error creating payment intent: ${error}`);
      throw error;
    }
  }

  async createRefund(refundInput: RefundInput): Promise<Payment> {
    try {
      const { paymentId, amount, reason } = refundInput;

      const payment = await this.findById(paymentId);
      if (!payment) {
        const error = new Error("Payment not found");
        error.name = "NotFoundError";
        throw error;
      }

      if (payment.status !== PaymentStatus.COMPLETED) {
        const error = new Error("Payment cannot be refunded");
        error.name = "ValidationError";
        throw error;
      }

      const processor = paymentProcessorFactory.getProcessor(
        payment.processorType,
      );

      const processorRefund = await processor.createRefund(
        payment.processorId!,
        amount ? Math.round(amount * 100) : undefined,
        reason,
      );

      const paymentData: PaymentUpdateInput = {
        status: PaymentStatus.REFUNDED,
        processorData: { ...payment.processorData, refund: processorRefund },
      };

      const updatedPayment = await paymentModel.update(paymentId, paymentData);

      await sendMessage("payment_refunded", {
        id: updatedPayment.id,
        userId: updatedPayment.userId,
        amount: updatedPayment.amount,
        currency: updatedPayment.currency,
        status: updatedPayment.status,
        processorId: updatedPayment.processorId,
        processorType: updatedPayment.processorType,
        createdAt: updatedPayment.createdAt,
        refundAmount: amount || updatedPayment.amount,
        reason,
      });

      return updatedPayment;
    } catch (error) {
      logger.error(`Error creating refund: ${error}`);
      throw error;
    }
  }

  async handleWebhookEvent(
    processorType: string,
    event: any,
    signature: string,
    payload: string | Buffer,
  ): Promise<void> {
    try {
      const processor = paymentProcessorFactory.getProcessor(processorType);
      const verifiedEvent = processor.verifyWebhookSignature(
        payload,
        signature,
      );

      switch (processorType) {
        case ProcessorType.STRIPE:
          await this.handleStripeWebhookEvent(verifiedEvent);
          break;
        case ProcessorType.PAYPAL:
          await this.handlePayPalWebhookEvent(verifiedEvent);
          break;
        case ProcessorType.SQUARE:
          await this.handleSquareWebhookEvent(verifiedEvent);
          break;
        default:
          logger.info(`Unhandled processor type for webhook: ${processorType}`);
      }
    } catch (error) {
      logger.error(`Error handling webhook event: ${error}`);
      throw error;
    }
  }

  private async handleStripeWebhookEvent(event: any): Promise<void> {
    switch (event.type) {
      case "charge.succeeded":
        await this.handleStripeChargeSucceeded(event.data.object);
        break;
      case "charge.failed":
        await this.handleStripeChargeFailed(event.data.object);
        break;
      case "charge.refunded":
        await this.handleStripeChargeRefunded(event.data.object);
        break;
      default:
        logger.info(`Unhandled Stripe webhook event type: ${event.type}`);
    }
  }

  private async handlePayPalWebhookEvent(event: any): Promise<void> {
    switch (event.event_type) {
      case "PAYMENT.CAPTURE.COMPLETED":
        await this.handlePayPalPaymentCompleted(event.resource);
        break;
      case "PAYMENT.CAPTURE.DENIED":
        await this.handlePayPalPaymentDenied(event.resource);
        break;
      case "PAYMENT.CAPTURE.REFUNDED":
        await this.handlePayPalPaymentRefunded(event.resource);
        break;
      default:
        logger.info(`Unhandled PayPal webhook event type: ${event.event_type}`);
    }
  }

  private async handleSquareWebhookEvent(event: any): Promise<void> {
    switch (event.type) {
      case "payment.created":
        await this.handleSquarePaymentCreated(event.data.object.payment);
        break;
      case "payment.updated":
        await this.handleSquarePaymentUpdated(event.data.object.payment);
        break;
      case "refund.created":
        await this.handleSquareRefundCreated(event.data.object.refund);
        break;
      default:
        logger.info(`Unhandled Square webhook event type: ${event.type}`);
    }
  }

  private async handleStripeChargeSucceeded(charge: any): Promise<void> {
    const existingPayment = await paymentModel.findByProcessorId(charge.id);
    if (existingPayment) return;

    const userId = charge.metadata?.userId;
    if (!userId) {
      logger.error("User ID not found in charge metadata");
      return;
    }

    const payment = await paymentModel.create({
      userId,
      amount: charge.amount / 100,
      currency: charge.currency,
      status: PaymentStatus.COMPLETED,
      processorId: charge.id,
      processorType: ProcessorType.STRIPE,
      processorData: charge,
      metadata: charge.metadata,
    });
    await this.publishPaymentCompletedEvent(payment);
  }

  private async handleStripeChargeFailed(charge: any): Promise<void> {
    const existingPayment = await paymentModel.findByProcessorId(charge.id);
    if (existingPayment) return;

    const userId = charge.metadata?.userId;
    if (!userId) {
      logger.error("User ID not found in charge metadata");
      return;
    }

    const payment = await paymentModel.create({
      userId,
      amount: charge.amount / 100,
      currency: charge.currency,
      status: PaymentStatus.FAILED,
      processorId: charge.id,
      processorType: ProcessorType.STRIPE,
      processorData: charge,
      metadata: charge.metadata,
    });
    await this.publishPaymentFailedEvent(payment, charge.failure_message);
  }

  private async handleStripeChargeRefunded(charge: any): Promise<void> {
    const payment = await paymentModel.findByProcessorId(charge.id);
    if (!payment) {
      logger.error(`Payment not found for Stripe charge ID: ${charge.id}`);
      return;
    }

    const updatedPayment = await paymentModel.update(payment.id, {
      status: PaymentStatus.REFUNDED,
      processorData: charge,
    });

    await sendMessage("payment_refunded", {
      id: updatedPayment.id,
      userId: updatedPayment.userId,
      amount: updatedPayment.amount,
      currency: updatedPayment.currency,
      status: updatedPayment.status,
      processorId: updatedPayment.processorId,
      processorType: updatedPayment.processorType,
      createdAt: updatedPayment.createdAt,
      refundAmount: charge.amount_refunded / 100,
    });
  }

  private async handlePayPalPaymentCompleted(resource: any): Promise<void> {
    const existingPayment = await paymentModel.findByProcessorId(resource.id);
    if (existingPayment) return;

    const customId = resource.custom_id || "";
    const userId = customId.split("_")[0];
    if (!userId) {
      logger.error("User ID not found in PayPal payment custom ID");
      return;
    }

    const payment = await paymentModel.create({
      userId,
      amount: parseFloat(resource.amount.value),
      currency: resource.amount.currency_code.toLowerCase(),
      status: PaymentStatus.COMPLETED,
      processorId: resource.id,
      processorType: ProcessorType.PAYPAL,
      processorData: resource,
      metadata: { customId },
    });
    await this.publishPaymentCompletedEvent(payment);
  }

  private async handlePayPalPaymentDenied(resource: any): Promise<void> {
    const existingPayment = await paymentModel.findByProcessorId(resource.id);
    if (existingPayment) return;

    const customId = resource.custom_id || "";
    const userId = customId.split("_")[0];
    if (!userId) {
      logger.error("User ID not found in PayPal payment custom ID");
      return;
    }

    const payment = await paymentModel.create({
      userId,
      amount: parseFloat(resource.amount.value),
      currency: resource.amount.currency_code.toLowerCase(),
      status: PaymentStatus.FAILED,
      processorId: resource.id,
      processorType: ProcessorType.PAYPAL,
      processorData: resource,
      metadata: { customId },
    });
    await this.publishPaymentFailedEvent(
      payment,
      resource.status_details?.reason || "Payment denied",
    );
  }

  private async handlePayPalPaymentRefunded(resource: any): Promise<void> {
    const payment = await paymentModel.findByProcessorId(resource.id);
    if (!payment) {
      logger.error(`Payment not found for PayPal payment ID: ${resource.id}`);
      return;
    }

    const updatedPayment = await paymentModel.update(payment.id, {
      status: PaymentStatus.REFUNDED,
      processorData: resource,
    });

    await sendMessage("payment_refunded", {
      id: updatedPayment.id,
      userId: updatedPayment.userId,
      amount: updatedPayment.amount,
      refundAmount: parseFloat(resource.amount.value),
    });
  }

  private async handleSquarePaymentCreated(payment: any): Promise<void> {
    const existingPayment = await paymentModel.findByProcessorId(payment.id);
    if (existingPayment) return;

    const referenceId = payment.reference_id || "";
    const userId = referenceId.split("_")[0];
    if (!userId) {
      logger.error("User ID not found in Square payment reference ID");
      return;
    }

    const status =
      payment.status === "COMPLETED"
        ? PaymentStatus.COMPLETED
        : PaymentStatus.PENDING;
    const paymentRecord = await paymentModel.create({
      userId,
      amount: payment.amount_money.amount / 100,
      currency: payment.amount_money.currency.toLowerCase(),
      status,
      processorId: payment.id,
      processorType: ProcessorType.SQUARE,
      processorData: payment,
      metadata: { referenceId },
    });

    if (payment.status === "COMPLETED") {
      await this.publishPaymentCompletedEvent(paymentRecord);
    }
  }

  private async handleSquarePaymentUpdated(payment: any): Promise<void> {
    const existingPayment = await paymentModel.findByProcessorId(payment.id);
    if (!existingPayment) {
      logger.error(`Payment not found for Square payment ID: ${payment.id}`);
      return;
    }

    let status = existingPayment.status;
    if (payment.status === "COMPLETED") status = PaymentStatus.COMPLETED;
    else if (payment.status === "FAILED") status = PaymentStatus.FAILED;

    const updatedPayment = await paymentModel.update(existingPayment.id, {
      status,
      processorData: payment,
    });

    if (
      status === PaymentStatus.COMPLETED &&
      existingPayment.status !== PaymentStatus.COMPLETED
    ) {
      await this.publishPaymentCompletedEvent(updatedPayment);
    } else if (
      status === PaymentStatus.FAILED &&
      existingPayment.status !== PaymentStatus.FAILED
    ) {
      await this.publishPaymentFailedEvent(updatedPayment, "Payment failed");
    }
  }

  private async handleSquareRefundCreated(refund: any): Promise<void> {
    const payment = await paymentModel.findByProcessorId(refund.payment_id);
    if (!payment) {
      logger.error(
        `Payment not found for Square payment ID: ${refund.payment_id}`,
      );
      return;
    }

    const updatedPayment = await paymentModel.update(payment.id, {
      status: PaymentStatus.REFUNDED,
      processorData: { ...payment.processorData, refund },
    });

    await sendMessage("payment_refunded", {
      id: updatedPayment.id,
      userId: updatedPayment.userId,
      amount: updatedPayment.amount,
      refundAmount: refund.amount_money.amount / 100,
    });
  }

  private async publishPaymentCompletedEvent(payment: Payment): Promise<void> {
    try {
      await sendMessage("payment_completed", {
        id: payment.id,
        userId: payment.userId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        processorId: payment.processorId,
        processorType: payment.processorType,
        createdAt: payment.createdAt,
      });
    } catch (error) {
      logger.error(`Error publishing payment_completed event: ${error}`);
    }
  }

  private async publishPaymentFailedEvent(
    payment: Payment,
    reason: string,
  ): Promise<void> {
    try {
      await sendMessage("payment_failed", {
        id: payment.id,
        userId: payment.userId,
        amount: payment.amount,
        currency: payment.currency,
        processorType: payment.processorType,
        reason,
        createdAt: payment.createdAt,
      });
    } catch (error) {
      logger.error(`Error publishing payment_failed event: ${error}`);
    }
  }
}

export default new PaymentService();
