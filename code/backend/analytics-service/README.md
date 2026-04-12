# Analytics Service

## Overview

The Analytics Service provides data analysis, forecasting, and business intelligence capabilities for the FinFlow platform. It processes financial data to generate insights and predictions.

## Features

- Cash flow forecasting
- Expense categorization and analysis
- Revenue trend analysis
- Financial KPI calculations
- Data visualization support

## API Endpoints

- `POST /api/analytics/forecast` - Generate cash flow forecast
- `GET /api/analytics/forecast/:id` - Get forecast by ID
- `GET /api/analytics/categories` - Get transaction categories
- `POST /api/analytics/categories` - Create a new category
- `GET /api/analytics/trends` - Get financial trends
- `GET /api/analytics/kpis` - Get key performance indicators

## Environment Variables

- `ANALYTICS_PORT` - Port for the Analytics service (default: 3004)
- `POSTGRES_HOST` - PostgreSQL host
- `POSTGRES_PORT` - PostgreSQL port
- `POSTGRES_USER` - PostgreSQL username
- `POSTGRES_PASSWORD` - PostgreSQL password
- `POSTGRES_DB` - PostgreSQL database name
- `KAFKA_BROKER` - Kafka broker address for event subscribing

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
docker build -t finflow-analytics-service .
```

Run the container:

```
docker run -p 3004:3004 --env-file .env finflow-analytics-service
```
