# Compliance Service

A comprehensive financial compliance service for FinFlow, implementing GDPR, PSD2, and AML/CFT regulatory requirements.

## Features

- **GDPR Compliance**: Data subject rights management (access, export, delete)
- **PSD2 Compliance**: Third-party provider consent management
- **AML/CFT Compliance**: Entity screening against watchlists
- **Risk Assessment**: Risk scoring and categorization for compliance
- **Audit Trail**: Comprehensive logging for regulatory reporting

## Architecture

The Compliance Service is built with a modular architecture:

- **Models**: Pydantic models for request/response validation
- **Services**: Core compliance logic for different regulations
- **API**: FastAPI endpoints for compliance operations
- **Utils**: Utility functions for compliance operations

## API Endpoints

### GDPR Endpoints

- `POST /gdpr/data-requests`: Create a new GDPR data request (export, delete, etc.)
- `GET /gdpr/data-requests/{request_id}`: Get the status of a GDPR data request

### PSD2 Endpoints

- `POST /psd2/consents`: Create a new PSD2 consent for third-party access
- `DELETE /psd2/consents/{consent_id}`: Revoke a PSD2 consent
- `GET /psd2/consents/{consent_id}/validate`: Validate a PSD2 consent for a specific scope

### AML/CFT Endpoints

- `POST /aml/screening`: Screen an entity against AML/CFT watchlists
- `GET /aml/screening/{screening_id}`: Get an AML screening result
- `POST /aml/reschedule/{entity_type}/{entity_id}`: Schedule periodic rescreening

### Health Check

- `GET /health`: Service health check

## Compliance Features

### GDPR Compliance

- Data subject access requests (DSAR) processing
- Data export in structured format
- Data deletion across systems
- Processing restriction
- Automated request tracking and fulfillment

### PSD2 Compliance

- Strong customer authentication (SCA) support
- Explicit consent management
- Fine-grained access control with scopes
- Consent lifecycle management
- Third-party provider (TPP) registration

### AML/CFT Compliance

- Entity screening against sanctions lists
- Politically exposed persons (PEP) checks
- Adverse media screening
- Risk-based approach with scoring
- Ongoing monitoring and rescreening

## Getting Started

### Prerequisites

- Python 3.8+
- Required Python packages (see requirements.txt)

### Configuration

The service can be configured through environment variables:

- `DATABASE_URL`: Database connection string
- `PORT`: Service port (default: 8002)
- `LOG_LEVEL`: Logging level (default: INFO)

### Running the Service

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
python -m src.main
```

### Running Tests

```bash
# Run all tests
python -m unittest discover tests

# Run specific test
python -m unittest tests.test_compliance
```

## Integration

The Compliance Service integrates with other FinFlow services:

- **Authentication Service**: For user authentication and authorization
- **Transaction Service**: For transaction compliance checks
- **Account Service**: For account data access and management
- **Notification Service**: For compliance notifications
- **Audit Service**: For comprehensive audit logging

## Regulatory Considerations

- Designed to meet requirements of GDPR, PSD2, and AML/CFT regulations
- Configurable for different jurisdictions and regulatory frameworks
- Comprehensive audit trail for regulatory reporting
- Regular updates to maintain regulatory compliance
