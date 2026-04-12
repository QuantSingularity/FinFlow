import re
import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

# BUG FIX: @validator and @root_validator were removed in Pydantic v2.
# Migrated to @field_validator and @model_validator.
from pydantic import BaseModel, Field, field_validator, model_validator

# --- Enums ---


class TransactionType(str, Enum):
    DEPOSIT = "DEPOSIT"
    WITHDRAWAL = "WITHDRAWAL"
    TRANSFER = "TRANSFER"
    PAYMENT = "PAYMENT"
    LOAN_DISBURSEMENT = "LOAN_DISBURSEMENT"
    LOAN_REPAYMENT = "LOAN_REPAYMENT"
    FEE = "FEE"
    INTEREST = "INTEREST"
    REFUND = "REFUND"
    OTHER = "OTHER"


class TransactionStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    REVERSED = "REVERSED"
    HELD = "HELD"
    REJECTED = "REJECTED"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


# --- Common Models ---


class ValidationError(BaseModel):
    code: str
    message: str
    field: Optional[str] = None


class ValidationResult(BaseModel):
    is_valid: bool
    risk_score: float = Field(0.0, ge=0.0, le=1.0)
    risk_level: RiskLevel
    validation_checks: Dict[str, bool]
    errors: List[ValidationError] = []
    warnings: List[Dict[str, Any]] = []
    metadata: Optional[Dict[str, Any]] = None


# --- Core Transaction Models ---


class TransactionRequest(BaseModel):
    transaction_id: Optional[str] = Field(
        None, description="Unique transaction identifier"
    )
    source_account_id: str = Field(..., description="Source account identifier")
    destination_account_id: Optional[str] = Field(
        None, description="Destination account identifier"
    )
    amount: float = Field(..., gt=0, description="Transaction amount")
    currency: str = Field(
        ..., min_length=3, max_length=3, description="Currency code (ISO 4217)"
    )
    transaction_type: TransactionType
    reference: Optional[str] = Field(
        None, max_length=255, description="Transaction reference"
    )
    description: Optional[str] = Field(
        None, max_length=500, description="Transaction description"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        None, description="Additional transaction metadata"
    )

    @field_validator("transaction_id", mode="before")
    @classmethod
    def validate_transaction_id(cls, v):
        if v is None:
            return str(uuid.uuid4())
        if not re.match(
            r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", v
        ):
            raise ValueError("Invalid transaction ID format. Must be a valid UUID.")
        return v

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v):
        if not re.match(r"^[A-Z]{3}$", v):
            raise ValueError(
                "Currency must be a valid 3-letter ISO 4217 code (e.g., USD, EUR, GBP)"
            )
        return v

    @model_validator(mode="after")
    def validate_accounts(self):
        transaction_type = self.transaction_type
        source_account = self.source_account_id
        destination_account = self.destination_account_id

        if transaction_type == TransactionType.TRANSFER and not destination_account:
            raise ValueError(
                "Destination account is required for transfer transactions"
            )

        if (
            transaction_type == TransactionType.DEPOSIT
            and source_account == destination_account
        ):
            raise ValueError(
                "Source and destination accounts cannot be the same for deposits"
            )

        return self


class TransactionResponse(BaseModel):
    transaction_id: str
    source_account_id: str
    destination_account_id: Optional[str]
    amount: float
    currency: str
    transaction_type: TransactionType
    status: TransactionStatus
    reference: Optional[str]
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    validation_result: Optional[Dict[str, Any]]
    risk_score: Optional[float]
    risk_level: Optional[RiskLevel]
    metadata: Optional[Dict[str, Any]]
    errors: Optional[List[ValidationError]]


class TransactionBatch(BaseModel):
    batch_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transactions: List[TransactionRequest]
    created_at: datetime = Field(default_factory=datetime.now)

    @field_validator("transactions")
    @classmethod
    def validate_transactions(cls, v):
        if not v:
            raise ValueError("Transaction batch cannot be empty")
        if len(v) > 1000:
            raise ValueError(
                "Transaction batch cannot contain more than 1000 transactions"
            )
        return v


class TransactionBatchResponse(BaseModel):
    batch_id: str
    processed_count: int
    successful_count: int
    failed_count: int
    transactions: List[TransactionResponse]
    created_at: datetime
    completed_at: datetime


class TransactionStatistics(BaseModel):
    total_count: int
    total_amount: float
    currency: str
    by_status: Dict[TransactionStatus, int]
    by_type: Dict[TransactionType, int]
    average_amount: float
    period_start: datetime
    period_end: datetime


class TransactionQuery(BaseModel):
    account_id: Optional[str] = None
    transaction_type: Optional[TransactionType] = None
    status: Optional[TransactionStatus] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    currency: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    reference: Optional[str] = None
    limit: int = Field(100, ge=1, le=1000)
    offset: int = Field(0, ge=0)
