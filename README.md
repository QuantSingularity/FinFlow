# FinFlow - Financial Operations & Workflow Platform

![CI/CD Status](https://img.shields.io/github/actions/workflow/status/quantsingularity/Finflow/cicd.yml?branch=main&label=CI/CD&logo=github)
[![Test Coverage](https://img.shields.io/badge/coverage-96%25-brightgreen)](https://github.com/quantsingularity/FinFlow/tree/main/coverage)
[![License](https://img.shields.io/github/license/quantsingularity/FinFlow?style=flat-square)](LICENSE)

<div align="center">
  <img src="docs/images/FinFlow_Dashboard.bmp" alt="FinFlow Dashboard" width="80%">
</div>

### Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

FinFlow is a modern financial operations platform designed to help businesses streamline their financial workflows, from payment processing to accounting and analytics. The platform combines traditional financial operations with cutting-edge technology to provide a secure, scalable, and efficient solution for managing financial data and processes. It is built on a foundation of independent, domain-specific microservices to ensure high availability and maintainability.

---

## Project Structure

The project is organized into several main components:

```
FinFlow/
├── backend/                # Core backend logic, services, and shared utilities
├── docs/                   # Project documentation
├── infrastructure/         # DevOps, deployment, and infra-related code
├── mobile-frontend/        # Mobile application
├── web-frontend/           # Web dashboard
├── scripts/                # Automation, setup, and utility scripts
├── LICENSE                 # License information
├── README.md               # Project overview and instructions
└── tools/                  # Formatter configs, linting tools, and dev utilities
```

## Key Features

FinFlow's functionality is organized into five core service domains and a dedicated mobile experience.

### Authentication & Authorization

Security and access control are paramount:

| Feature                   | Description                                                                                           |
| :------------------------ | :---------------------------------------------------------------------------------------------------- |
| **Secure Authentication** | Features Multi-factor Authentication (MFA) with support for SMS and authenticator apps.               |
| **Access Control**        | Implements **Role-based Access Control (RBAC)** for granular permissions across different user roles. |
| **Integration**           | Supports OAuth integration with third-party providers (Google, GitHub, Microsoft).                    |
| **Session Management**    | Utilizes secure, token-based authentication and session handling.                                     |

### Payment Processing

A flexible and real-time payment infrastructure:

| Feature                     | Description                                                                              |
| :-------------------------- | :--------------------------------------------------------------------------------------- |
| **Multi-Processor Support** | Integrated support for major payment gateways, including **Stripe, PayPal, and Square**. |
| **Real-time Processing**    | Instant payment verification and processing for immediate transaction finality.          |
| **Automated Billing**       | Features recurring payments for subscription-based services.                             |
| **Wallet Integration**      | Supports digital wallets like Apple Pay, Google Pay, and PayPal.                         |

### Accounting & Reconciliation

The backbone for accurate financial record-keeping:

| Feature                 | Description                                                                                                    |
| :---------------------- | :------------------------------------------------------------------------------------------------------------- |
| **Core Accounting**     | Robust **Double-Entry Accounting** engine.                                                                     |
| **Financial Reporting** | Ability to generate essential reports, including **balance sheets, income statements, and cash flow reports**. |
| **Reconciliation**      | Automated account reconciliation tools for discrepancy detection.                                              |
| **Trial Balance**       | Automatic generation of trial balance reports for audit readiness.                                             |

### Analytics & Reporting

Transforming raw data into actionable insights:

| Feature                    | Description                                                                       |
| :------------------------- | :-------------------------------------------------------------------------------- |
| **Interactive Dashboards** | Visual representation of financial metrics and Key Performance Indicators (KPIs). |
| **Data Analysis**          | Provides detailed breakdown and analysis of transaction data.                     |
| **Visualization**          | Historical data analysis with interactive trend charts.                           |
| **Export Capabilities**    | Supports data export in multiple formats (CSV, Excel, PDF).                       |

### Credit Management

Streamlining the lending process with data-driven decisions:

| Feature                | Description                                           |
| :--------------------- | :---------------------------------------------------- |
| **Credit Scoring**     | Automated credit risk assessment for fast decisions.  |
| **Loan Processing**    | Streamlined application and approval workflow.        |
| **Repayment Tracking** | Automated tracking and management of loan repayments. |
| **Default Prediction** | Utilizes ML-based models for predicting default risk. |

### Mobile Frontend

A modern, cross-platform experience for on-the-go management:

| Feature                     | Description                                                                 |
| :-------------------------- | :-------------------------------------------------------------------------- |
| **Cross-platform Support**  | Built with **React Native** for a consistent experience on iOS and Android. |
| **Offline Capabilities**    | Core functionality remains available even without an internet connection.   |
| **Biometric Security**      | Secure login using fingerprint and face recognition.                        |
| **Real-time Notifications** | Push notifications for important financial events.                          |

---

## Architecture

FinFlow is built on a modern microservices architecture, ensuring modularity, scalability, and resilience.

### Service Architecture

The platform is composed of several independent backend services, each responsible for a specific business domain:

| Service                | Primary Function                                                     |
| :--------------------- | :------------------------------------------------------------------- |
| **Auth Service**       | User authentication, authorization, and session management.          |
| **Payments Service**   | Payment processing, gateway integration, and transaction handling.   |
| **Accounting Service** | Double-entry accounting, ledger management, and financial reporting. |
| **Analytics Service**  | Data analysis, metrics calculation, and visualization.               |
| **Credit Engine**      | Credit scoring, loan application processing, and risk assessment.    |

### Infrastructure Components

The services are supported by a robust infrastructure layer:

| Component            | Function                                                                                             |
| :------------------- | :--------------------------------------------------------------------------------------------------- |
| **API Gateway**      | Handles request routing, load balancing, and composition.                                            |
| **Service Mesh**     | Manages inter-service communication, security, and observability.                                    |
| **Message Broker**   | Facilitates event-driven communication between services (RabbitMQ).                                  |
| **Event Stream**     | Enables high-throughput data pipelines and real-time processing (Kafka).                             |
| **Monitoring Stack** | Provides logging, metrics, and alerting for operational visibility (Prometheus, Grafana, ELK Stack). |

### Event-Driven Communication

FinFlow utilizes an event-driven architecture to ensure loose coupling and real-time data flow. Key event types include:

| Event Type         | Purpose                                                                |
| :----------------- | :--------------------------------------------------------------------- |
| **Payment Events** | Trigger accounting entries, analytics updates, and credit assessments. |
| **User Events**    | Manage authentication state and authorization updates across services. |
| **System Events**  | Handle infrastructure scaling and monitoring alerts.                   |

---

## Technology Stack

The FinFlow platform is built using a modern, performant, and well-supported technology stack.

| Category            | Key Technologies                                                   | Description                                                                                                                                            |
| :------------------ | :----------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend**         | Node.js, TypeScript, Express.js, NestJS                            | High-performance, scalable environment for microservices development.                                                                                  |
| **Databases**       | PostgreSQL, MongoDB, Redis                                         | Polyglot persistence: PostgreSQL for transactional ACID operations, MongoDB for flexible analytics data, and Redis for caching and session management. |
| **Messaging**       | RabbitMQ, Kafka                                                    | Message queue for reliable communication and event streaming for high-throughput data pipelines.                                                       |
| **Web Frontend**    | React, TypeScript, Redux Toolkit, Material-UI, Tailwind CSS        | Modern stack for a feature-rich, responsive web dashboard.                                                                                             |
| **Mobile Frontend** | React Native, Expo, Native Base                                    | Cross-platform development for iOS and Android with a focus on native performance.                                                                     |
| **DevOps**          | Docker, Kubernetes, GitHub Actions, Prometheus, Grafana, ELK Stack | Full-stack CI/CD, container orchestration, and observability tools for production readiness.                                                           |

---

## Getting Started

### Prerequisites

Before setting up FinFlow, ensure you have the following installed:

| Prerequisite       | Version |
| :----------------- | :------ |
| **Node.js**        | v16+    |
| **Docker**         | Latest  |
| **Docker Compose** | Latest  |
| **PostgreSQL**     | v13+    |
| **MongoDB**        | v5+     |
| **Redis**          | v6+     |

### Quick Setup

The recommended way to set up the development environment is by using the provided setup script and Docker Compose:

| Step                     | Command                                                                   | Description                                                     |
| :----------------------- | :------------------------------------------------------------------------ | :-------------------------------------------------------------- |
| **1. Clone Repository**  | `git clone https://github.com/quantsingularity/FinFlow.git && cd FinFlow` | Download the source code and navigate to the project directory. |
| **2. Run Setup Script**  | `./setup_env.sh`                                                          | Installs dependencies and configures the local environment.     |
| **3. Start Application** | `docker-compose up`                                                       | Starts all backend services, databases, and the API Gateway.    |

**Access Points:**

| Component                 | Endpoint                         |
| :------------------------ | :------------------------------- |
| **Web Frontend**          | `http://localhost:3000`          |
| **API Gateway**           | `http://localhost:8080`          |
| **Swagger Documentation** | `http://localhost:8080/api-docs` |

### Manual Setup

For individual service development, you will need to configure the environment variables in a `.env` file and start each service manually. Refer to the project's internal documentation for detailed instructions on starting the **Auth Service, Payments Service, Accounting Service, Analytics Service, and Credit Engine** individually.

---

## API Documentation

FinFlow provides comprehensive API documentation using OpenAPI/Swagger, accessible for each service when running locally.

| Service                | Local Documentation Endpoint     |
| :--------------------- | :------------------------------- |
| **Auth Service**       | `http://localhost:3001/api-docs` |
| **Payments Service**   | `http://localhost:3002/api-docs` |
| **Accounting Service** | `http://localhost:3003/api-docs` |
| **Analytics Service**  | `http://localhost:3004/api-docs` |
| **Credit Engine**      | `http://localhost:3005/api-docs` |

### API Examples

**1. Login (Auth Service)**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

_Response includes a JWT token and user details._

**2. Creating a Payment (Payments Service)**

```bash
curl -X POST http://localhost:3002/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 100.00,
    "currency": "usd",
    "processorType": "stripe",
    "source": "tok_visa",
    "metadata": {
      "orderId": "order_123"
    }
  }'
```

_Response provides the payment ID, status, and processor details._

---

## Testing

FinFlow includes comprehensive testing across all services to ensure reliability and accuracy. The strategy covers unit tests, integration tests, and end-to-end tests.

### Test Coverage Summary

The project maintains high test coverage across all critical components:

| Service / Component    | Coverage | Critical Paths Tested                                          |
| :--------------------- | :------- | :------------------------------------------------------------- |
| **Payments Service**   | 97%      | Payment processing, multiple processors, refunds.              |
| **Auth Service**       | 95%      | Authentication flows, token validation, OAuth integration.     |
| **Accounting Service** | 94%      | Journal entries, financial reporting, double-entry validation. |
| **Mobile Frontend**    | 96%      | All screens, Redux integration, navigation flows.              |
| **Web Frontend**       | 90%      | UI components, Redux store, API services.                      |
| **End-to-End Flows**   | 85%      | Critical user journeys across services.                        |

### Running Tests

Tests can be run independently for each component:

| Component            | Command (from component directory)     | Description                                          |
| :------------------- | :------------------------------------- | :--------------------------------------------------- |
| **Backend Services** | `npm test` or `npm test -- --coverage` | Runs unit and integration tests for the service.     |
| **Web Frontend**     | `npm test` or `npm test -- --coverage` | Runs component, Redux store, and API service tests.  |
| **Mobile Frontend**  | `npm test` or `npm test -- --coverage` | Runs tests for screens, components, and store logic. |
| **End-to-End Tests** | `cd e2e && npm test`                   | Requires the application to be running locally.      |

A combined coverage report for the entire project can be generated by running the `./run-tests.sh` script from the project root.

---

## CI/CD Pipeline

FinFlow uses GitHub Actions for continuous integration and deployment:

| Stage                | Control Area                    | Institutional-Grade Detail                                                              |
| :------------------- | :------------------------------ | :-------------------------------------------------------------------------------------- |
| **Formatting Check** | Change Triggers                 | Enforced on all `push` and `pull_request` events to `main` and `develop`                |
|                      | Manual Oversight                | On-demand execution via controlled `workflow_dispatch`                                  |
|                      | Source Integrity                | Full repository checkout with complete Git history for auditability                     |
|                      | Python Runtime Standardization  | Python 3.10 with deterministic dependency caching                                       |
|                      | Backend Code Hygiene            | `autoflake` to detect unused imports/variables using non-mutating diff-based validation |
|                      | Backend Style Compliance        | `black --check` to enforce institutional formatting standards                           |
|                      | Non-Intrusive Validation        | Temporary workspace comparison to prevent unauthorized source modification              |
|                      | Node.js Runtime Control         | Node.js 18 with locked dependency installation via `npm ci`                             |
|                      | Web Frontend Formatting Control | Prettier checks for web-facing assets                                                   |
|                      | Mobile Frontend Formatting      | Prettier enforcement for mobile application codebases                                   |
|                      | Documentation Governance        | Repository-wide Markdown formatting enforcement                                         |
|                      | Infrastructure Configuration    | Prettier validation for YAML/YML infrastructure definitions                             |
|                      | Compliance Gate                 | Any formatting deviation fails the pipeline and blocks merge                            |

## Documentation

| Document                    | Path                 | Description                                                    |
| :-------------------------- | :------------------- | :------------------------------------------------------------- |
| **README**                  | `README.md`          | High-level overview, project scope, and repository entry point |
| **Installation Guide**      | `INSTALLATION.md`    | Step-by-step installation and environment setup                |
| **API Reference**           | `API.md`             | Detailed documentation for all API endpoints                   |
| **CLI Reference**           | `CLI.md`             | Command-line interface usage, commands, and examples           |
| **User Guide**              | `USAGE.md`           | Comprehensive end-user guide, workflows, and examples          |
| **Architecture Overview**   | `ARCHITECTURE.md`    | System architecture, components, and design rationale          |
| **Configuration Guide**     | `CONFIGURATION.md`   | Configuration options, environment variables, and tuning       |
| **Feature Matrix**          | `FEATURE_MATRIX.md`  | Feature coverage, capabilities, and roadmap alignment          |
| **Contributing Guidelines** | `CONTRIBUTING.md`    | Contribution workflow, coding standards, and PR requirements   |
| **Troubleshooting**         | `TROUBLESHOOTING.md` | Common issues, diagnostics, and remediation steps              |

## License

FinFlow is licensed under the **MIT License**.
