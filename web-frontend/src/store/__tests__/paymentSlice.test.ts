import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import configureStore from "redux-mock-store";
import thunk from "redux-thunk";
import paymentService from "../../services/paymentService";
import paymentReducer, {
  fetchPayments,
  fetchPaymentsFailure,
  fetchPaymentsStart,
  fetchPaymentsSuccess,
  getPaymentStatus,
  paymentFailure,
  paymentStart,
  paymentSuccess,
  processPayment,
  resetPaymentState,
} from "../paymentSlice";

// Mock the payment service
jest.mock("../../services/paymentService");

const middlewares = [thunk];
const mockStore = configureStore(middlewares);

describe("Payment Slice", () => {
  describe("Reducers", () => {
    const initialState = {
      payments: [],
      currentPayment: null,
      loading: false,
      error: null,
      success: false,
      processors: [
        { id: "STRIPE", name: "Stripe", icon: "stripe-icon.svg" },
        { id: "PAYPAL", name: "PayPal", icon: "paypal-icon.svg" },
        { id: "SQUARE", name: "Square", icon: "square-icon.svg" },
      ],
    };

    test("should return the initial state", () => {
      expect(paymentReducer(undefined, { type: undefined })).toEqual(
        initialState,
      );
    });

    test("should handle paymentStart", () => {
      const nextState = paymentReducer(initialState, paymentStart());
      expect(nextState.loading).toBe(true);
      expect(nextState.error).toBeNull();
      expect(nextState.success).toBe(false);
    });

    test("should handle paymentSuccess", () => {
      const mockPayment = {
        id: "payment_123",
        amount: 100,
        currency: "USD",
        status: "COMPLETED",
      };

      const nextState = paymentReducer(
        initialState,
        paymentSuccess(mockPayment),
      );
      expect(nextState.loading).toBe(false);
      expect(nextState.currentPayment).toEqual(mockPayment);
      expect(nextState.payments).toContainEqual(mockPayment);
      expect(nextState.success).toBe(true);
      expect(nextState.error).toBeNull();
    });

    test("should handle paymentFailure", () => {
      const errorMessage = "Payment processing failed";
      const nextState = paymentReducer(
        initialState,
        paymentFailure(errorMessage),
      );
      expect(nextState.loading).toBe(false);
      expect(nextState.error).toBe(errorMessage);
      expect(nextState.success).toBe(false);
    });

    test("should handle fetchPaymentsStart", () => {
      const nextState = paymentReducer(initialState, fetchPaymentsStart());
      expect(nextState.loading).toBe(true);
      expect(nextState.error).toBeNull();
    });

    test("should handle fetchPaymentsSuccess", () => {
      const mockPayments = [
        { id: "payment_1", amount: 100, currency: "USD", status: "COMPLETED" },
        { id: "payment_2", amount: 200, currency: "USD", status: "PENDING" },
      ];

      const nextState = paymentReducer(
        initialState,
        fetchPaymentsSuccess(mockPayments),
      );
      expect(nextState.loading).toBe(false);
      expect(nextState.payments).toEqual(mockPayments);
      expect(nextState.error).toBeNull();
    });

    test("should handle fetchPaymentsFailure", () => {
      const errorMessage = "Failed to fetch payments";
      const nextState = paymentReducer(
        initialState,
        fetchPaymentsFailure(errorMessage),
      );
      expect(nextState.loading).toBe(false);
      expect(nextState.error).toBe(errorMessage);
    });

    test("should handle resetPaymentState", () => {
      // Start with a non-initial state
      const modifiedState = {
        ...initialState,
        loading: true,
        error: "Some error",
        success: true,
        currentPayment: { id: "payment_123" },
      };

      const nextState = paymentReducer(modifiedState, resetPaymentState());
      expect(nextState.loading).toBe(false);
      expect(nextState.error).toBeNull();
      expect(nextState.success).toBe(false);
      expect(nextState.currentPayment).toBeNull();
      // Payments array should remain unchanged
      expect(nextState.payments).toEqual(modifiedState.payments);
    });
  });

  describe("Thunks", () => {
    let store;

    beforeEach(() => {
      store = mockStore({
        payment: {
          payments: [],
          currentPayment: null,
          loading: false,
          error: null,
          success: false,
        },
      });
    });

    test("processPayment should create paymentSuccess when payment processing succeeds", async () => {
      const mockPaymentData = {
        amount: 100,
        currency: "USD",
        source: "card_token_123",
        description: "Test payment",
        processorType: "STRIPE",
      };

      const mockPaymentResponse = {
        id: "payment_123",
        amount: 100,
        currency: "USD",
        status: "COMPLETED",
      };

      (paymentService.processPayment as jest.Mock).mockResolvedValue(
        mockPaymentResponse,
      );

      await store.dispatch(processPayment(mockPaymentData));
      const actions = store.getActions();

      expect(actions[0].type).toBe("payment/paymentStart");
      expect(actions[1].type).toBe("payment/paymentSuccess");
      expect(actions[1].payload).toEqual(mockPaymentResponse);
    });

    test("processPayment should create paymentFailure when payment processing fails", async () => {
      const mockPaymentData = {
        amount: 100,
        currency: "USD",
        source: "card_token_123",
        description: "Test payment",
        processorType: "STRIPE",
      };

      const errorMessage = "Payment processing failed";
      const error = new Error(errorMessage);
      (paymentService.processPayment as jest.Mock).mockRejectedValue(error);

      try {
        await store.dispatch(processPayment(mockPaymentData));
      } catch (_error) {
        // Expected to throw
      }

      const actions = store.getActions();
      expect(actions[0].type).toBe("payment/paymentStart");
      expect(actions[1].type).toBe("payment/paymentFailure");
      expect(actions[1].payload).toBe(errorMessage);
    });

    test("fetchPayments should create fetchPaymentsSuccess when fetching succeeds", async () => {
      const mockPayments = [
        { id: "payment_1", amount: 100, currency: "USD", status: "COMPLETED" },
        { id: "payment_2", amount: 200, currency: "USD", status: "PENDING" },
      ];

      (paymentService.getPayments as jest.Mock).mockResolvedValue(mockPayments);

      await store.dispatch(fetchPayments());
      const actions = store.getActions();

      expect(actions[0].type).toBe("payment/fetchPaymentsStart");
      expect(actions[1].type).toBe("payment/fetchPaymentsSuccess");
      expect(actions[1].payload).toEqual(mockPayments);
    });

    test("fetchPayments should create fetchPaymentsFailure when fetching fails", async () => {
      const errorMessage = "Failed to fetch payments";
      const error = new Error(errorMessage);
      (paymentService.getPayments as jest.Mock).mockRejectedValue(error);

      try {
        await store.dispatch(fetchPayments());
      } catch (_error) {
        // Expected to throw
      }

      const actions = store.getActions();
      expect(actions[0].type).toBe("payment/fetchPaymentsStart");
      expect(actions[1].type).toBe("payment/fetchPaymentsFailure");
      expect(actions[1].payload).toBe(errorMessage);
    });

    test("getPaymentStatus should call the payment service correctly", async () => {
      const paymentId = "payment_123";
      const mockStatus = { status: "COMPLETED", updatedAt: new Date() };

      (paymentService.getPaymentStatus as jest.Mock).mockResolvedValue(
        mockStatus,
      );

      const result = await store.dispatch(getPaymentStatus(paymentId));

      expect(paymentService.getPaymentStatus).toHaveBeenCalledWith(paymentId);
      expect(result).toEqual(mockStatus);
    });
  });
});
