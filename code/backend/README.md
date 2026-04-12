# FinFlow Backend — Monorepo

A Node.js/TypeScript + Python microservices backend for the FinFlow financial platform.

## Architecture

All TypeScript services share a **single root `node_modules`** via npm workspaces.  
Python services each have their own `requirements.txt` (standard for Python microservices).

```
finflow-backend/
├── package.json          ← Root workspace manifest (all shared deps)
├── tsconfig.base.json    ← Shared TypeScript base config
├── node_modules/         ← Single shared node_modules for ALL services
├── common/               ← Shared TS utilities (logger, config, kafka, errors)
├── auth-service/
├── accounting-service/
├── analytics-service/
├── payments-service/
├── integration-service/
├── multi-tenant-service/
├── performance-service/
├── realtime-analytics-service/
├── ai-features-service/  ← Python (FastAPI)
├── compliance-service/   ← Python (FastAPI)
├── credit-engine/        ← Python (FastAPI)
├── transaction-service/  ← Python (FastAPI)
└── tax_automation/       ← Python (FastAPI)
```

## Setup

### TypeScript Services

```bash
# Install ALL dependencies once from the root
npm install

# Run all tests
npm test

# Run tests for a specific service
npm run test:auth
npm run test:accounting
npm run test:payments
npm run test:analytics

# Build all services
npm run build

# Or use Make
make install
make test
make build
```

### Python Services

```bash
# Install Python dependencies (per service)
pip install -r ai-features-service/requirements.txt
pip install -r compliance-service/requirements.txt
pip install -r credit-engine/requirements.txt
pip install -r transaction-service/requirements.txt

# Run Python tests
pytest credit-engine/tests/
pytest compliance-service/tests/
pytest ai-features-service/tests/
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Key variables:

- `JWT_SECRET` — JWT signing secret
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_HOST` / `REDIS_PORT` — Redis connection
- `KAFKA_BROKERS` — Kafka broker addresses
- `STRIPE_SECRET` / `STRIPE_WEBHOOK_SECRET` — Stripe credentials

## Docker

```bash
# Start full stack (all services + infra)
docker-compose up

# Dev mode with hot reload
docker-compose -f docker-compose.yml -f docker-compose.override.yml up
```
