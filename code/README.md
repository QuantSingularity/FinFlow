# FinFlow — Code Repository

This repository is structured into two top-level directories:

```
code/
├── backend/          # TypeScript / Node.js microservices
└── ml-services/      # Python AI/ML, compliance, and financial services
```

## backend/

TypeScript/Node.js microservices forming the core FinFlow platform:

| Service                       | Description                                                 |
| ----------------------------- | ----------------------------------------------------------- |
| `common/`                     | Shared utilities: Kafka, Passport, database, config, logger |
| `auth-service/`               | Authentication, JWT, OAuth2 (Google, GitHub, Microsoft)     |
| `accounting-service/`         | Journal entries, ledger, invoices, trial balance            |
| `analytics-service/`          | Transaction summaries, forecasting, financial insights      |
| `payments-service/`           | Stripe, PayPal, Square payment processing                   |
| `integration-service/`        | QuickBooks, Xero, Plaid, banking integrations               |
| `multi-tenant-service/`       | Tenant management, data isolation strategies                |
| `realtime-analytics-service/` | Streaming analytics, anomaly detection, WebSocket           |
| `performance-service/`        | Database optimisation and query performance                 |

## ml-services/

Python services for AI/ML features, compliance, and financial processing:

| Service                | Description                                                       |
| ---------------------- | ----------------------------------------------------------------- |
| `ai-features-service/` | Cash flow prediction (ensemble ML), financial advisory            |
| `compliance-service/`  | GDPR, PSD2, AML screening (FastAPI)                               |
| `credit-engine/`       | Credit scoring and loan offer generation (FastAPI)                |
| `tax_automation/`      | Tax calculation engine, rule management, international compliance |
| `transaction-service/` | Transaction processing, validation, caching (FastAPI)             |

## Quick Start

```bash
# Start all backend services
cd backend/
docker-compose up -d

# Install Python dependencies for ml-services
cd ml-services/
pip install -r requirements.txt
```
