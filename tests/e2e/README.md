# End-to-End Testing

## Overview

The e2e (End-to-End) directory contains comprehensive test suites that validate the entire FinFlow application from a user's perspective. Unlike unit or integration tests that focus on isolated components, these end-to-end tests simulate real user interactions across the complete application stack, ensuring that all components work together as expected. This approach provides confidence that the application functions correctly in production-like scenarios.

## Test Architecture

The e2e tests are written using TypeScript and follow a behavior-driven development (BDD) approach. Each test file corresponds to a specific feature or user flow within the application, such as authentication, accounting operations, dashboard functionality, and payment processing. The tests interact with the application through its user interfaces, making the same API calls and UI interactions that real users would experience.

The test files are organized by feature domain, allowing for focused testing of specific application areas while maintaining a comprehensive coverage of the entire system. This organization also facilitates parallel test execution and selective testing during development.

## Technology Stack

The e2e testing framework leverages:

- Jest as the test runner and assertion library
- Playwright for browser automation and UI interaction testing
- Supertest for API testing
- TypeScript for type-safe test development
- Custom test utilities for common operations and fixtures

## Test Specifications

The directory includes several key test specifications:

The accounting.spec.ts file tests the core accounting functionality, including creating and managing accounts, recording transactions, generating financial reports, and verifying calculation accuracy across the accounting modules.

The auth.spec.ts file validates the authentication and authorization flows, including user registration, login, password reset, session management, and access control for protected resources.

The dashboard.spec.ts file tests the dashboard functionality, ensuring that financial data is correctly aggregated, visualized, and updated in real-time as underlying data changes.

The payment.spec.ts file verifies payment processing workflows, including initiating payments, handling different payment methods, processing refunds, and managing recurring payment schedules.

## Running Tests

To execute the end-to-end tests:

```bash
# Install dependencies if not already done
npm install

# Run all e2e tests
npm run test:e2e

# Run specific test suite
npm run test:e2e -- --spec=auth.spec.ts

# Run tests with UI mode (to see browser interactions)
npm run test:e2e:ui
```

The tests can be run in headless mode for CI/CD pipelines or with browser visibility for debugging purposes. Test results are generated in both human-readable console output and machine-parsable formats for integration with CI/CD systems.

## Test Environment

The e2e tests require a complete test environment with all services running. This can be achieved through:

1. A dedicated test environment with isolated databases
2. Docker Compose setup that launches all required services
3. Mock services for external dependencies

Environment variables control the test configuration, allowing tests to run against different environments (development, staging, production).

## Test Data Management

The tests manage their own test data, creating necessary records at the beginning of test runs and cleaning up afterward. This ensures test isolation and repeatability. Fixtures and factories are used to generate consistent test data across test runs.

## Continuous Integration

The e2e tests are integrated into the CI/CD pipeline and run automatically on pull requests and before deployments to staging and production environments. Test failures block deployments, ensuring that only fully functional code reaches production.

## Debugging Failed Tests

When tests fail, detailed logs and screenshots are captured to assist in debugging. The test framework provides:

- Screenshots of the browser state at failure points
- DOM snapshots for UI-related failures
- Network request and response logs
- Console error logs from the browser

## Extending the Test Suite

When adding new features to the application, corresponding e2e tests should be created to validate the feature from a user perspective. Follow these guidelines:

1. Create a new spec file for entirely new features
2. Extend existing spec files for enhancements to existing features
3. Reuse test utilities and fixtures where appropriate
4. Ensure tests are independent and can run in isolation

The e2e test suite serves as a critical quality gate for the FinFlow application, providing confidence that the system works correctly from a user's perspective across all integrated components.
