import { PaymentProcessorInterface } from "../interfaces/payment-processor.interface";
import stripeProcessor from "../processors/stripe.processor";
import paypalProcessor from "../processors/paypal.processor";
import squareProcessor from "../processors/square.processor";
import { logger } from "../utils/logger";

/**
 * Payment Processor Factory
 *
 * This class manages the available payment processors and provides
 * methods to get the appropriate processor based on the processor name.
 */
class PaymentProcessorFactory {
  private processors: Map<string, PaymentProcessorInterface>;

  constructor() {
    this.processors = new Map();

    // Register available processors
    this.registerProcessor(stripeProcessor);
    this.registerProcessor(paypalProcessor);
    this.registerProcessor(squareProcessor);
  }

  /**
   * Register a payment processor
   *
   * @param processor - The payment processor to register
   */
  registerProcessor(processor: PaymentProcessorInterface): void {
    this.processors.set(processor.getName(), processor);
    logger.info(`Registered payment processor: ${processor.getName()}`);
  }

  /**
   * Get a payment processor by name
   *
   * @param name - The name of the processor to get
   * @returns The payment processor instance
   * @throws Error if the processor is not found
   */
  getProcessor(name: string): PaymentProcessorInterface {
    const processor = this.processors.get(name);
    if (!processor) {
      throw new Error(`Payment processor not found: ${name}`);
    }
    return processor;
  }

  /**
   * Get the default payment processor
   *
   * @returns The default payment processor instance
   */
  getDefaultProcessor(): PaymentProcessorInterface {
    // Default to Stripe, but this could be configurable
    return this.getProcessor("stripe");
  }

  /**
   * Get all available payment processors
   *
   * @returns Array of all registered payment processors
   */
  getAllProcessors(): PaymentProcessorInterface[] {
    return Array.from(this.processors.values());
  }

  /**
   * Get client configurations for all processors
   *
   * @returns Object with processor names as keys and their client configs as values
   */
  getAllClientConfigs(): Record<string, Record<string, any>> {
    const configs: Record<string, Record<string, any>> = {};

    this.processors.forEach((processor, name) => {
      configs[name] = processor.getClientConfig();
    });

    return configs;
  }
}

export default new PaymentProcessorFactory();
