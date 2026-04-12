# Payments Service

## Overview

The Payments Service handles payment processing, tracking, and integration with payment providers like Stripe in the FinFlow platform. It manages payment methods, transactions, and payment status updates.

## Features

- Payment processing via Stripe integration
- Payment method management
- Transaction history and tracking
- Payment status updates and notifications
- Webhook handling for payment events

## API Endpoints

- `POST /api/payments/process` - Process a new payment
- `GET /api/payments` - Get all payments for the current user
- `GET /api/payments/:id` - Get payment details by ID
- `POST /api/payments/methods` - Add a new payment method
- `GET /api/payments/methods` - Get all payment methods for the current user
- `DELETE /api/payments/methods/:id` - Delete a payment method
- `POST /api/payments/webhook` - Handle payment provider webhooks

## Environment Variables

- `PAYMENTS_PORT` - Port for the Payments service (default: 3002)
- `STRIPE_API_KEY` - Stripe API key for payment processing
- `STRIPE_WEBHOOK_SECRET` - Secret for validating Stripe webhook events
- `POSTGRES_HOST` - PostgreSQL host
- `POSTGRES_PORT` - PostgreSQL port
- `POSTGRES_USER` - PostgreSQL username
- `POSTGRES_PASSWORD` - PostgreSQL password
- `POSTGRES_DB` - PostgreSQL database name
- `KAFKA_BROKER` - Kafka broker address for event publishing

## Getting Started

1. Install dependencies:

   ```
   npm install
   ```

2. Set up environment variables (see `.env.example`)

3. Start the service:
   ```
   npm run dev
   ```

## Testing

Run tests with:

```
npm test
```

## Docker

Build the Docker image:

```
docker build -t finflow-payments-service .
```

Run the container:

```
docker run -p 3002:3002 --env-file .env finflow-payments-service
```
