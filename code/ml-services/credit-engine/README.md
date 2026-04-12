# Credit Engine Service

## Overview

The Credit Engine Service provides credit scoring, risk assessment, and loan offer generation capabilities for the FinFlow platform. It uses machine learning models to analyze financial data and determine creditworthiness.

## Features

- Credit score calculation
- Risk assessment
- Loan offer generation
- Financial data analysis
- Machine learning model training and inference

## API Endpoints

- `POST /api/credit/score` - Calculate credit score
- `GET /api/credit/score/:id` - Get credit score by ID
- `POST /api/credit/offers` - Generate loan offers
- `GET /api/credit/offers` - Get all loan offers
- `GET /api/credit/offers/:id` - Get loan offer details by ID

## Environment Variables

- `CREDIT_ENGINE_PORT` - Port for the Credit Engine service (default: 3005)
- `POSTGRES_HOST` - PostgreSQL host
- `POSTGRES_PORT` - PostgreSQL port
- `POSTGRES_USER` - PostgreSQL username
- `POSTGRES_PASSWORD` - PostgreSQL password
- `POSTGRES_DB` - PostgreSQL database name
- `MODEL_PATH` - Path to trained machine learning model

## Getting Started

1. Install dependencies:

   ```
   pip install -r requirements.txt
   ```

2. Set up environment variables (see `.env.example`)

3. Start the service:
   ```
   python src/main.py
   ```

## Model Training

Train the credit scoring model with:

```
python src/train_credit_model.py
```

## Testing

Run tests with:

```
pytest
```

## Docker

Build the Docker image:

```
docker build -t finflow-credit-engine .
```

Run the container:

```
docker run -p 3005:3005 --env-file .env finflow-credit-engine
```
