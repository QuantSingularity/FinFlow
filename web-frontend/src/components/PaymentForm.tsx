import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormLabel,
  Input,
  Select,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createPayment, getProcessorConfigs } from "../services/paymentService";
import { ProcessorType } from "../types";

// PayPal SDK integration
const loadPayPalScript = (clientId) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}`;
    script.async = true;
    script.onload = () => resolve(window.paypal);
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
};

// Square SDK integration
const loadSquareScript = (applicationId, locationId) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://sandbox.web.squarecdn.com/v1/square.js";
    script.async = true;
    script.onload = () => {
      const payments = window.Square.payments(applicationId, locationId);
      resolve(payments);
    };
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
};

const PaymentForm = () => {
  const _dispatch = useDispatch();
  const toast = useToast();
  const { user } = useSelector((state) => state.auth);

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("usd");
  const [processorType, setProcessorType] = useState(ProcessorType.STRIPE);
  const [_processorConfigs, setProcessorConfigs] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [stripeElements, setStripeElements] = useState(null);
  const [paypalInstance, setPaypalInstance] = useState(null);
  const [squarePayments, setSquarePayments] = useState(null);

  // Fetch processor configurations on component mount
  useEffect(() => {
    const fetchProcessorConfigs = async () => {
      try {
        const configs = await getProcessorConfigs();
        setProcessorConfigs(configs);

        // Initialize Stripe
        if (configs.stripe && window.Stripe) {
          const stripe = window.Stripe(configs.stripe.publicKey);
          const elements = stripe.elements();
          setStripeElements({ stripe, elements });
        }

        // Initialize PayPal
        if (configs.paypal) {
          try {
            const paypal = await loadPayPalScript(configs.paypal.clientId);
            setPaypalInstance(paypal);
          } catch (error) {
            console.error("Failed to load PayPal SDK:", error);
          }
        }

        // Initialize Square
        if (configs.square) {
          try {
            const payments = await loadSquareScript(
              configs.square.applicationId,
              configs.square.locationId,
            );
            setSquarePayments(payments);
          } catch (error) {
            console.error("Failed to load Square SDK:", error);
          }
        }
      } catch (error) {
        console.error("Failed to fetch processor configs:", error);
        toast({
          title: "Error",
          description: "Failed to load payment processors",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    };

    fetchProcessorConfigs();
  }, [toast]);

  // Handle processor change
  const handleProcessorChange = (e) => {
    setProcessorType(e.target.value);
  };

  // Handle payment submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid payment amount",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);

    try {
      // Process payment based on selected processor
      switch (processorType) {
        case ProcessorType.STRIPE:
          await handleStripePayment();
          break;
        case ProcessorType.PAYPAL:
          await handlePayPalPayment();
          break;
        case ProcessorType.SQUARE:
          await handleSquarePayment();
          break;
        default:
          throw new Error(`Unsupported processor type: ${processorType}`);
      }
    } catch (error) {
      console.error("Payment failed:", error);
      toast({
        title: "Payment Failed",
        description:
          error.message || "An error occurred while processing your payment",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Stripe payment
  const handleStripePayment = async () => {
    if (!stripeElements) {
      throw new Error("Stripe has not been initialized");
    }

    const { stripe, elements } = stripeElements;

    // Create a card element
    const cardElement = elements.create("card");
    cardElement.mount("#stripe-card-element");

    // Create a payment intent
    const { clientSecret } = await createPayment({
      amount: parseFloat(amount),
      currency,
      processorType: ProcessorType.STRIPE,
      userId: user.id,
    });

    // Confirm the payment
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: user.name,
          email: user.email,
        },
      },
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    if (result.paymentIntent.status === "succeeded") {
      toast({
        title: "Payment Successful",
        description: `Your payment of ${amount} ${currency.toUpperCase()} has been processed`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Handle PayPal payment
  const handlePayPalPayment = async () => {
    if (!paypalInstance) {
      throw new Error("PayPal has not been initialized");
    }

    // Create a payment intent
    const { paymentIntentId } = await createPayment({
      amount: parseFloat(amount),
      currency,
      processorType: ProcessorType.PAYPAL,
      userId: user.id,
    });

    // Render PayPal buttons
    const paypalButtonsContainer = document.getElementById(
      "paypal-button-container",
    );
    paypalButtonsContainer.innerHTML = "";

    paypalInstance
      .Buttons({
        createOrder: () => {
          return paymentIntentId;
        },
        onApprove: async (data) => {
          try {
            // Capture the payment
            await createPayment({
              amount: parseFloat(amount),
              currency,
              processorType: ProcessorType.PAYPAL,
              source: data.orderID,
              userId: user.id,
            });

            toast({
              title: "Payment Successful",
              description: `Your payment of ${amount} ${currency.toUpperCase()} has been processed`,
              status: "success",
              duration: 5000,
              isClosable: true,
            });
          } catch (error) {
            console.error("PayPal payment capture failed:", error);
            throw new Error("Failed to complete PayPal payment");
          }
        },
      })
      .render(paypalButtonsContainer);
  };

  // Handle Square payment
  const handleSquarePayment = async () => {
    if (!squarePayments) {
      throw new Error("Square has not been initialized");
    }

    // Create a card element
    const card = await squarePayments.card();
    await card.attach("#square-card-container");

    // Tokenize the card
    const result = await card.tokenize();
    if (result.status === "OK") {
      // Process the payment with the token
      await createPayment({
        amount: parseFloat(amount),
        currency,
        processorType: ProcessorType.SQUARE,
        source: result.token,
        userId: user.id,
      });

      toast({
        title: "Payment Successful",
        description: `Your payment of ${amount} ${currency.toUpperCase()} has been processed`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } else {
      throw new Error(result.errors[0].message);
    }
  };

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <Stack spacing={4}>
            <Text fontSize="xl" fontWeight="bold">
              Make a Payment
            </Text>

            <FormControl isRequired>
              <FormLabel>Amount</FormLabel>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min="0.01"
                step="0.01"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Currency</FormLabel>
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="usd">USD</option>
                <option value="eur">EUR</option>
                <option value="gbp">GBP</option>
                <option value="cad">CAD</option>
                <option value="aud">AUD</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Payment Method</FormLabel>
              <Select value={processorType} onChange={handleProcessorChange}>
                <option value={ProcessorType.STRIPE}>
                  Credit Card (Stripe)
                </option>
                <option value={ProcessorType.PAYPAL}>PayPal</option>
                <option value={ProcessorType.SQUARE}>Square</option>
              </Select>
            </FormControl>

            {/* Processor-specific payment forms */}
            {processorType === ProcessorType.STRIPE && (
              <Box
                id="stripe-card-element"
                p={4}
                border="1px solid"
                borderColor="gray.200"
                borderRadius="md"
              />
            )}

            {processorType === ProcessorType.PAYPAL && (
              <Box id="paypal-button-container" />
            )}

            {processorType === ProcessorType.SQUARE && (
              <Box
                id="square-card-container"
                p={4}
                border="1px solid"
                borderColor="gray.200"
                borderRadius="md"
              />
            )}

            <Button
              type="submit"
              colorScheme="blue"
              isLoading={isLoading}
              loadingText="Processing"
              isDisabled={!amount || parseFloat(amount) <= 0}
            >
              Pay Now
            </Button>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
};

export default PaymentForm;
