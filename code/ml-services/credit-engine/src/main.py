import json
import logging
import os
from datetime import datetime
from typing import Dict, List, Optional

# NOTE: joblib is not strictly needed since the model is mocked, but kept for completeness
# import joblib
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("credit-engine")

# Initialize FastAPI app
app = FastAPI(
    title="FinFlow Credit Engine",
    description="AI-driven credit scoring and loan offers API",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OAuth2 scheme for JWT validation
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# Load model (in production, this would be a trained model)
# For demo purposes, we'll create a simple model that returns predefined scores
class CreditModel:
    def predict(self, features: List[float]) -> float:
        """
        Predicts a credit score based on financial features.
        Features expected: [income, num_invoices, avg_cashflow, delinquencies]
        """
        # Simple logic for demo: higher income and cashflow = higher score
        income, num_invoices, avg_cashflow, delinquencies = features

        # Normalize income and cashflow to a 0-0.9 range
        base_score = min(
            0.9,
            (income / 100000) * 0.3
            + (avg_cashflow / 10000) * 0.3
            + (num_invoices / 100) * 0.3,
        )

        # Apply penalty for delinquencies
        penalty = delinquencies * 0.1

        # Ensure score is between 0.1 and 0.9
        return max(0.1, min(0.9, base_score - penalty))


# Initialize model
try:
    # In production: credit_model = joblib.load('models/credit_score_model.pkl')
    credit_model = CreditModel()
    logger.info("Credit scoring model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load credit scoring model: {e}")
    credit_model = None


# Pydantic models for request/response validation
class CreditScoreRequest(BaseModel):
    income: float = Field(..., description="Annual income of the applicant.")
    # BUG FIX: The original alias_generator was defined as a plain instance method
    # inside the inner Config class (missing @staticmethod), causing a TypeError
    # at class construction time. Additionally, model_dump(by_alias=True) was used
    # in the endpoint but the mapping pointed camelCase→snake, not snake→camelCase,
    # so data["numInvoices"] raised a KeyError at runtime.
    # Fix: rename fields to snake_case (Python convention) and keep camelCase as
    # JSON aliases using Field(alias=...) with model_config allowing population by name.
    num_invoices: int = Field(
        ..., alias="numInvoices", description="Number of invoices processed."
    )
    avg_cashflow: float = Field(
        ..., alias="avgCashflow", description="Average monthly cash flow."
    )
    delinquencies: int = Field(..., description="Number of past delinquencies.")

    model_config = {"populate_by_name": True}


class CreditScoreResponse(BaseModel):
    credit_score: float = Field(
        ..., description="The calculated credit score (0.0 to 1.0)."
    )
    risk_category: str = Field(
        ..., description="The risk category (LOW_RISK, MEDIUM_RISK, HIGH_RISK)."
    )
    timestamp: str = Field(..., description="Timestamp of the calculation.")


class LoanOffer(BaseModel):
    amount: float = Field(..., description="The principal loan amount.")
    interest_rate: float = Field(..., description="The annual interest rate.")
    term_months: int = Field(..., description="The loan term in months.")
    monthly_payment: float = Field(..., description="The calculated monthly payment.")


class LoanOffersResponse(BaseModel):
    credit_score: float = Field(
        ..., description="The credit score used to generate offers."
    )
    offers: List[LoanOffer] = Field(..., description="List of available loan offers.")
    timestamp: str = Field(..., description="Timestamp of the offer generation.")


# JWT validation dependency
async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Dependency to validate JWT token and retrieve current user.
    """
    # In production, this would validate the JWT against Auth service
    # For demo, we'll just log and accept any token
    logger.info(f"Received token: {token[:10]}...")
    # NOTE: The original code was missing a return statement in the docstring block.
    # The return value is used in the endpoint handlers.
    return {"sub": "demo-user", "role": "USER"}


# Endpoints
@app.post("/score", response_model=CreditScoreResponse)
async def score_credit(
    input_data: CreditScoreRequest, current_user: dict = Depends(get_current_user)
):
    """
    Calculate credit score based on financial metrics
    """
    if not credit_model:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Credit scoring model is not available",
        )

    # Log the request (audit logging)
    logger.info(
        f"Credit score request for user {current_user['sub']}: {json.dumps(input_data.model_dump())}"
    )

    try:
        # BUG FIX: Previously used model_dump(by_alias=True) then accessed
        # data["numInvoices"]/data["avgCashflow"] — the alias mapping was inverted
        # so those keys did not exist, causing a KeyError. Now access fields
        # directly by their snake_case Python names.
        features = [
            input_data.income,
            input_data.num_invoices,
            input_data.avg_cashflow,
            input_data.delinquencies,
        ]

        # Get prediction from model
        score = credit_model.predict(features)

        # Determine risk category
        if score >= 0.8:
            risk_category = "LOW_RISK"
        elif score >= 0.6:
            risk_category = "MEDIUM_RISK"
        else:
            risk_category = "HIGH_RISK"

        # Create response
        response = CreditScoreResponse(
            credit_score=score,
            risk_category=risk_category,
            timestamp=datetime.now().isoformat(),
        )

        # Log the response (audit logging)
        logger.info(
            f"Credit score response for user {current_user['sub']}: {json.dumps(response.model_dump())}"
        )

        return response

    except Exception as e:
        logger.error(f"Error calculating credit score: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate credit score",
        )


@app.get("/offers", response_model=LoanOffersResponse)
async def get_loan_offers(
    score: Optional[float] = None, current_user: dict = Depends(get_current_user)
):
    """
    Get loan offers based on credit score
    """
    # If no score provided, use a default medium score
    if score is None:
        score = 0.7

    # Log the request (audit logging)
    logger.info(
        f"Loan offers request for user {current_user['sub']} with score {score}"
    )

    # Generate offers based on score
    offers = []

    if score >= 0.8:
        # Low risk - best offers
        offers = [
            LoanOffer(
                amount=50000, interest_rate=4.5, term_months=60, monthly_payment=932.78
            ),
            LoanOffer(
                amount=25000, interest_rate=4.2, term_months=36, monthly_payment=738.99
            ),
            LoanOffer(
                amount=10000, interest_rate=3.9, term_months=24, monthly_payment=434.65
            ),
        ]
    elif score >= 0.6:
        # Medium risk
        offers = [
            LoanOffer(
                amount=25000, interest_rate=6.5, term_months=60, monthly_payment=488.75
            ),
            LoanOffer(
                amount=10000, interest_rate=6.2, term_months=36, monthly_payment=304.98
            ),
            LoanOffer(
                amount=5000, interest_rate=5.9, term_months=24, monthly_payment=221.24
            ),
        ]
    else:
        # High risk - limited offers
        offers = [
            LoanOffer(
                amount=5000, interest_rate=9.9, term_months=36, monthly_payment=161.42
            ),
            LoanOffer(
                amount=2500, interest_rate=8.9, term_months=24, monthly_payment=114.58
            ),
        ]

    # Create response
    response = LoanOffersResponse(
        credit_score=score, offers=offers, timestamp=datetime.now().isoformat()
    )

    # Log the response (audit logging)
    logger.info(
        f"Loan offers response for user {current_user['sub']}: {len(offers)} offers provided"
    )

    return response


# GDPR compliance endpoints
@app.get("/user/data", status_code=status.HTTP_200_OK)
async def export_user_data(current_user: dict = Depends(get_current_user)):
    """
    Export all user data (GDPR compliance)
    """
    logger.info(f"Data export request for user {current_user['sub']}")

    # In production, this would query the database for all user data
    # For demo, we return sample data
    return {
        "user_id": current_user["sub"],
        "credit_scores": [
            {
                "score": 0.75,
                "risk_category": "MEDIUM_RISK",
                "timestamp": "2025-01-15T14:30:00",
            },
            {
                "score": 0.82,
                "risk_category": "LOW_RISK",
                "timestamp": "2025-04-20T09:15:00",
            },
        ],
        "loan_applications": [
            {"amount": 10000, "status": "APPROVED", "timestamp": "2025-01-16T10:45:00"}
        ],
    }


@app.delete("/user/data", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_data(current_user: dict = Depends(get_current_user)):
    """
    Delete all user data (GDPR compliance)
    """
    logger.info(f"Data deletion request for user {current_user['sub']}")

    # In production, this would delete all user data from the database
    # For demo, we just log the request
    logger.info(f"User data deletion completed for user {current_user['sub']}")

    # Publish user_deleted event to Kafka
    # In production: await kafka_producer.send("user_deleted", {"user_id": current_user['sub']})

    # Fix: The endpoint is supposed to return None for 204 No Content, but the original
    # code was returning None implicitly. Explicitly returning None for clarity.
    return None


# Health check endpoint
@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check() -> Dict[str, str]:
    """
    Health check endpoint for monitoring
    """
    return {"status": "healthy", "service": "credit-engine"}


if __name__ == "__main__":
    import uvicorn

    # Fix: Use the correct variable name for the app instance
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
