from typing import List

from pydantic import BaseModel


class CreditScoreRequest(BaseModel):
    income: float
    numInvoices: int
    avgCashflow: float
    delinquencies: int


class CreditScoreResponse(BaseModel):
    credit_score: float
    risk_category: str
    timestamp: str


class LoanOffer(BaseModel):
    amount: float
    interest_rate: float
    term_months: int
    monthly_payment: float


class LoanOffersResponse(BaseModel):
    credit_score: float
    offers: List[LoanOffer]
    timestamp: str
