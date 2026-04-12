import asyncio
import hashlib
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Request
from fastapi import status as http_status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field
from redis import Redis
from redis.exceptions import RedisError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("transaction-service")


class TransactionStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    HELD = "HELD"
    REJECTED = "REJECTED"


class TransactionType(str, Enum):
    TRANSFER = "TRANSFER"
    PAYMENT = "PAYMENT"
    DEPOSIT = "DEPOSIT"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class TransactionRequest(BaseModel):
    transaction_id: str
    source_account_id: str
    destination_account_id: str
    amount: float = Field(..., gt=0)
    currency: str
    transaction_type: TransactionType
    reference: str
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class TransactionResponse(BaseModel):
    transaction_id: str
    source_account_id: str
    destination_account_id: str
    amount: float
    currency: str
    transaction_type: TransactionType
    status: TransactionStatus
    reference: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    validation_result: Optional[Dict[str, Any]] = None
    risk_score: Optional[float] = None
    risk_level: Optional[RiskLevel] = None
    metadata: Optional[Dict[str, Any]] = None
    errors: Optional[List[str]] = None


class TransactionBatch(BaseModel):
    batch_id: str
    transactions: List[TransactionRequest]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TransactionBatchResponse(BaseModel):
    batch_id: str
    processed_count: int
    successful_count: int
    failed_count: int
    transactions: List[TransactionResponse]
    created_at: datetime
    completed_at: datetime


class TransactionQuery(BaseModel):
    limit: int = Field(default=10, ge=1, le=100)
    offset: int = Field(default=0, ge=0)
    status: Optional[TransactionStatus] = None


class ValidationResultMock:
    def __init__(self, is_valid=True, risk_level=RiskLevel.LOW):
        self.is_valid = is_valid
        self.risk_level = risk_level
        self.risk_score = 0.1
        self.validation_checks = {"checks_passed": True}
        self.errors = []


class TransactionValidator:
    def validate_transaction(self, transaction, context):
        return ValidationResultMock()


class BatchTransactionValidator:
    def __init__(self, validator):
        self.validator = validator

    def validate_batch(self, transactions, context):
        return {t.transaction_id: ValidationResultMock() for t in transactions}


app = FastAPI(
    title="FinFlow Transaction Service",
    description="Comprehensive transaction processing and validation API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

transaction_validator = TransactionValidator()
batch_validator = BatchTransactionValidator(transaction_validator)

redis_client: Optional[Redis] = None
try:
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = int(os.getenv("REDIS_PORT", "6379"))
    redis_client = Redis(
        host=redis_host,
        port=redis_port,
        decode_responses=True,
        socket_timeout=5,
    )
    logger.info(f"Redis client initialized: {redis_host}:{redis_port}")
except Exception as e:
    logger.error(f"Failed to initialize Redis client: {e}")
    redis_client = None


async def get_current_user(token: str = Depends(oauth2_scheme)):
    logger.info(f"Received token: {token[:10]}...")
    return {"sub": "demo-user", "role": "USER"}


async def get_request_context(request: Request) -> Dict[str, Any]:
    return {
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "request_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def get_cached_response(cache_key: str) -> Optional[Dict[str, Any]]:
    if not redis_client:
        return None
    try:
        cached = redis_client.get(cache_key)
        if cached:
            logger.info(f"Cache hit for key: {cache_key}")
            return json.loads(cached)
    except RedisError as e:
        logger.error(f"Redis error when getting cached response: {e}")
    except Exception as e:
        logger.error(f"Error when getting cached response: {e}")
    return None


async def set_cached_response(
    cache_key: str, response_model: BaseModel, ttl_seconds: int = 300
) -> None:
    if not redis_client:
        return
    try:
        redis_client.setex(cache_key, ttl_seconds, response_model.model_dump_json())
        logger.info(f"Cached response with key: {cache_key}, TTL: {ttl_seconds}s")
    except RedisError as e:
        logger.error(f"Redis error when caching response: {e}")
    except Exception as e:
        logger.error(f"Error when caching response: {e}")


async def process_transaction_async(
    transaction: TransactionRequest,
    response: TransactionResponse,
    context: Dict[str, Any],
) -> None:
    await asyncio.sleep(1)
    logger.info(f"Transaction {transaction.transaction_id} processed successfully")


@app.post(
    "/transactions",
    response_model=TransactionResponse,
    status_code=http_status.HTTP_201_CREATED,
)
async def create_transaction(
    transaction: TransactionRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Create and validate a new transaction"""
    context = await get_request_context(request)
    context["user_id"] = current_user["sub"]

    logger.info(
        f"Transaction request from user {current_user['sub']}: {transaction.transaction_id}"
    )

    try:
        validation_result = transaction_validator.validate_transaction(
            transaction, context
        )

        if validation_result.is_valid:
            if validation_result.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
                status_value = TransactionStatus.HELD
            else:
                status_value = TransactionStatus.PROCESSING
        else:
            status_value = TransactionStatus.REJECTED

        response = TransactionResponse(
            transaction_id=transaction.transaction_id,
            source_account_id=transaction.source_account_id,
            destination_account_id=transaction.destination_account_id,
            amount=transaction.amount,
            currency=transaction.currency,
            transaction_type=transaction.transaction_type,
            status=status_value,
            reference=transaction.reference,
            description=transaction.description,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            completed_at=None,
            validation_result={
                "is_valid": validation_result.is_valid,
                "risk_score": validation_result.risk_score,
                "risk_level": validation_result.risk_level.value,
                "validation_checks": validation_result.validation_checks,
            },
            risk_score=validation_result.risk_score,
            risk_level=validation_result.risk_level,
            metadata=transaction.metadata,
            errors=validation_result.errors if not validation_result.is_valid else None,
        )

        if validation_result.is_valid and status_value == TransactionStatus.PROCESSING:
            background_tasks.add_task(
                process_transaction_async, transaction, response, context
            )

        logger.info(
            f"Transaction response for {transaction.transaction_id}: "
            f"status={status_value.value}, valid={validation_result.is_valid}"
        )

        return response

    except Exception as e:
        logger.error(f"Error processing transaction {transaction.transaction_id}: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process transaction",
        )


@app.post("/transactions/batch", response_model=TransactionBatchResponse)
async def create_transaction_batch(
    batch: TransactionBatch,
    background_tasks: BackgroundTasks,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Create and validate a batch of transactions"""
    context = await get_request_context(request)
    context["user_id"] = current_user["sub"]

    logger.info(
        f"Transaction batch request from user {current_user['sub']}: "
        f"{batch.batch_id}, {len(batch.transactions)} transactions"
    )

    try:
        validation_results = batch_validator.validate_batch(batch.transactions, context)

        transaction_responses = []
        successful_count = 0
        failed_count = 0

        for transaction in batch.transactions:
            validation_result = validation_results.get(transaction.transaction_id)

            if not validation_result:
                failed_count += 1
                continue

            if validation_result.is_valid:
                if validation_result.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
                    status_value = TransactionStatus.HELD
                else:
                    status_value = TransactionStatus.PROCESSING
                    successful_count += 1
            else:
                status_value = TransactionStatus.REJECTED
                failed_count += 1

            response = TransactionResponse(
                transaction_id=transaction.transaction_id,
                source_account_id=transaction.source_account_id,
                destination_account_id=transaction.destination_account_id,
                amount=transaction.amount,
                currency=transaction.currency,
                transaction_type=transaction.transaction_type,
                status=status_value,
                reference=transaction.reference,
                description=transaction.description,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                completed_at=None,
                validation_result={
                    "is_valid": validation_result.is_valid,
                    "risk_score": validation_result.risk_score,
                    "risk_level": validation_result.risk_level.value,
                    "validation_checks": validation_result.validation_checks,
                },
                risk_score=validation_result.risk_score,
                risk_level=validation_result.risk_level,
                metadata=transaction.metadata,
                errors=(
                    validation_result.errors if not validation_result.is_valid else None
                ),
            )

            transaction_responses.append(response)

            if (
                validation_result.is_valid
                and status_value == TransactionStatus.PROCESSING
            ):
                background_tasks.add_task(
                    process_transaction_async, transaction, response, context
                )

        batch_response = TransactionBatchResponse(
            batch_id=batch.batch_id,
            processed_count=len(batch.transactions),
            successful_count=successful_count,
            failed_count=failed_count,
            transactions=transaction_responses,
            created_at=batch.created_at,
            completed_at=datetime.now(timezone.utc),
        )

        logger.info(
            f"Transaction batch response for {batch.batch_id}: "
            f"processed={len(batch.transactions)}, successful={successful_count}, failed={failed_count}"
        )

        return batch_response

    except Exception as e:
        logger.error(f"Error processing transaction batch {batch.batch_id}: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process transaction batch",
        )


@app.get("/transactions/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Get transaction details by ID"""
    cache_key = f"transaction:{transaction_id}"
    cached_response = await get_cached_response(cache_key)
    if cached_response:
        return cached_response

    logger.info(
        f"Transaction details request from user {current_user['sub']}: {transaction_id}"
    )

    try:
        response = TransactionResponse(
            transaction_id=transaction_id,
            source_account_id="account123",
            destination_account_id="account456",
            amount=1000.0,
            currency="USD",
            transaction_type=TransactionType.TRANSFER,
            status=TransactionStatus.COMPLETED,
            reference="REF123",
            description="Demo transaction",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc),
            validation_result={
                "is_valid": True,
                "risk_score": 0.2,
                "risk_level": "LOW",
                "validation_checks": {"basic_fields_valid": True, "amount_valid": True},
            },
            risk_score=0.2,
            risk_level=RiskLevel.LOW,
            metadata={"demo": True},
            errors=None,
        )

        await set_cached_response(cache_key, response, ttl_seconds=300)
        return response

    except Exception as e:
        logger.error(f"Error retrieving transaction {transaction_id}: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve transaction",
        )


@app.get("/transactions", response_model=List[TransactionResponse])
async def query_transactions(
    request: Request,
    query: TransactionQuery = Depends(),
    current_user: dict = Depends(get_current_user),
):
    """Query transactions based on filters"""
    # BUG FIX: Python's built-in hash() is randomised per-process via PYTHONHASHSEED,
    # so hash(frozenset(...)) produces a different value on every restart and can
    # collide between different queries. Use hashlib.sha256 for a stable, collision-
    # resistant cache key.
    query_repr = json.dumps(query.model_dump(), sort_keys=True)
    cache_key = f"transactions:query:{hashlib.sha256(query_repr.encode()).hexdigest()}"

    cached_response = await get_cached_response(cache_key)
    if cached_response:
        return cached_response

    logger.info(
        f"Transaction query request from user {current_user['sub']}: {query.model_dump()}"
    )

    try:
        responses = [
            TransactionResponse(
                transaction_id=f"tx-{i}",
                source_account_id="account123",
                destination_account_id="account456",
                amount=1000.0 * (i + 1),
                currency="USD",
                transaction_type=TransactionType.TRANSFER,
                status=TransactionStatus.COMPLETED,
                reference=f"REF{i}",
                description=f"Demo transaction {i}",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                completed_at=datetime.now(timezone.utc),
                validation_result={
                    "is_valid": True,
                    "risk_score": 0.2,
                    "risk_level": "LOW",
                    "validation_checks": {
                        "basic_fields_valid": True,
                        "amount_valid": True,
                    },
                },
                risk_score=0.2,
                risk_level=RiskLevel.LOW,
                metadata={"demo": True, "index": i},
                errors=None,
            )
            for i in range(min(query.limit, 10))
        ]

        if redis_client:
            try:
                redis_client.setex(
                    cache_key,
                    60,
                    json.dumps([r.model_dump(mode="json") for r in responses]),
                )
            except RedisError as e:
                logger.error(f"Redis error caching query response: {e}")

        return responses

    except Exception as e:
        logger.error(f"Error querying transactions: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query transactions",
        )


@app.get("/health", status_code=http_status.HTTP_200_OK)
async def health_check() -> Dict[str, Any]:
    """Health check endpoint"""
    redis_status = "unavailable"
    if redis_client:
        try:
            redis_client.ping()
            redis_status = "healthy"
        except Exception:
            redis_status = "unhealthy"

    return {
        "status": "healthy",
        "service": "transaction-service",
        "dependencies": {"redis": redis_status},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8001")))
