"use strict";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-for-testing-only";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

// Payment processor env vars
process.env.STRIPE_SECRET = "sk_test_dummy_key_for_testing";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_dummy";
process.env.STRIPE_API_VERSION = "2023-10-16";
process.env.PAYPAL_CLIENT_ID = "test_paypal_client_id";
process.env.PAYPAL_CLIENT_SECRET = "test_paypal_secret";
process.env.PAYPAL_WEBHOOK_ID = "test_paypal_webhook_id";
process.env.SQUARE_ACCESS_TOKEN = "test_square_token";
process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = "test_square_sig_key";
process.env.SQUARE_ENVIRONMENT = "sandbox";

// Additional payment processor env vars
process.env.SQUARE_LOCATION_ID = "test_location_id";
process.env.SQUARE_APPLICATION_ID = "test_app_id";
