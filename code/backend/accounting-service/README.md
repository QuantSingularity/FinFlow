# Accounting Service

## Overview

The Accounting Service manages financial records, invoices, transactions, and journal entries in the FinFlow platform. It provides core accounting functionality for tracking financial activities.

## Features

- Invoice creation and management
- Transaction recording and tracking
- Journal entry management
- Financial reporting
- Account reconciliation

## API Endpoints

- `POST /api/invoices` - Create a new invoice
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/:id` - Get invoice details by ID
- `PUT /api/invoices/:id` - Update an invoice
- `DELETE /api/invoices/:id` - Delete an invoice
- `POST /api/transactions` - Record a new transaction
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/:id` - Get transaction details by ID
- `POST /api/journal-entries` - Create a new journal entry
- `GET /api/journal-entries` - Get all journal entries
- `GET /api/journal-entries/:id` - Get journal entry details by ID

## Environment Variables

- `ACCOUNTING_PORT` - Port for the Accounting service (default: 3003)
- `POSTGRES_HOST` - PostgreSQL host
- `POSTGRES_PORT` - PostgreSQL port
- `POSTGRES_USER` - PostgreSQL username
- `POSTGRES_PASSWORD` - PostgreSQL password
- `POSTGRES_DB` - PostgreSQL database name
- `KAFKA_BROKER` - Kafka broker address for event publishing/subscribing

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
docker build -t finflow-accounting-service .
```

Run the container:

```
docker run -p 3003:3003 --env-file .env finflow-accounting-service
```
