import logging
import time
from contextlib import contextmanager
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("transaction-database")


class TransactionDatabase:
    """
    Optimized database operations for transaction processing.
    Implements efficient query patterns and connection pooling for high-volume scenarios.
    """

    def __init__(self, connection_string: str, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the transaction database with connection string and optional configuration.

        Args:
            connection_string: Database connection string
            config: Configuration dictionary with database settings
        """
        self.config = config or self._default_config()

        # Create engine with optimized pool settings
        self.engine = create_engine(
            connection_string,
            pool_size=self.config["pool"]["size"],
            max_overflow=self.config["pool"]["max_overflow"],
            pool_timeout=self.config["pool"]["timeout"],
            pool_recycle=self.config["pool"]["recycle"],
            pool_pre_ping=True,
            echo=self.config["debug"]["echo_sql"],
        )

        # Create session factory for transactional use (default commit/rollback)
        self.Session = sessionmaker(bind=self.engine)

        # Create session factory for read-only use
        # Note: autocommit=True is deprecated in modern SQLAlchemy 1.4+.
        # For legacy support we keep it, but for modern usage, remove it and use begin() blocks.
        self.ReadSession = sessionmaker(
            bind=self.engine, autocommit=True, autoflush=True
        )

        logger.info(
            f"Transaction database initialized with pool size {self.config['pool']['size']}"
        )

    def _default_config(self) -> Dict[str, Any]:
        """
        Default configuration for database operations.

        Returns:
            Dict containing default database configuration
        """
        return {
            "pool": {
                "size": 10,
                "max_overflow": 20,
                "timeout": 30,
                "recycle": 3600,
            },
            "query": {
                "batch_size": 100,
                "timeout": 30,
            },
            "debug": {
                "echo_sql": False,
                "log_slow_queries": True,
                "slow_query_threshold": 1.0,  # seconds
            },
        }

    @contextmanager
    def session_scope(self):
        """
        Context manager for transactional database sessions with automatic commit/rollback.

        Yields:
            SQLAlchemy session
        """
        session = self.Session()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            session.close()

    @contextmanager
    def read_session_scope(self):
        """
        Context manager for read-only sessions.

        Yields:
            SQLAlchemy session
        """
        session = self.ReadSession()
        try:
            yield session
        except Exception as e:
            logger.error(f"Database read session error: {e}")
            raise
        finally:
            session.close()

    def create_transaction(self, transaction_data: Dict[str, Any]) -> str:
        """
        Create a new transaction in the database.

        Args:
            transaction_data: Transaction data

        Returns:
            Transaction ID
        """
        start_time = time.time()
        transaction_id = transaction_data.get("transaction_id")

        try:
            with self.session_scope() as session:
                query = text(
                    """
                    INSERT INTO transactions (
                        transaction_id, source_account_id, destination_account_id,
                        amount, currency, transaction_type, status,
                        reference, description, created_at, updated_at,
                        risk_score, risk_level, metadata
                    ) VALUES (
                        :transaction_id, :source_account_id, :destination_account_id,
                        :amount, :currency, :transaction_type, :status,
                        :reference, :description, NOW(), NOW(),
                        :risk_score, :risk_level, :metadata
                    )
                """
                )

                session.execute(query, transaction_data)

            query_time = time.time() - start_time
            if (
                self.config["debug"]["log_slow_queries"]
                and query_time > self.config["debug"]["slow_query_threshold"]
            ):
                logger.warning(f"Slow query in create_transaction: {query_time:.2f}s")

            logger.info(f"Transaction {transaction_id} created in {query_time:.2f}s")
            return transaction_id

        except SQLAlchemyError as e:
            logger.error(f"Database error creating transaction {transaction_id}: {e}")
            raise

    def get_transaction(self, transaction_id: str) -> Optional[Dict[str, Any]]:
        """
        Get transaction by ID with optimized query.

        Args:
            transaction_id: Transaction ID

        Returns:
            Transaction data or None if not found
        """
        start_time = time.time()

        try:
            with self.read_session_scope() as session:
                query = text(
                    """
                    SELECT * FROM transactions
                    WHERE transaction_id = :transaction_id
                """
                )

                result = session.execute(
                    query, {"transaction_id": transaction_id}
                ).fetchone()

                query_time = time.time() - start_time
                if (
                    self.config["debug"]["log_slow_queries"]
                    and query_time > self.config["debug"]["slow_query_threshold"]
                ):
                    logger.warning(f"Slow query in get_transaction: {query_time:.2f}s")

                if result:
                    # Convert row to dict - utilizing SQLAlchemy mapping
                    transaction = (
                        result._mapping if hasattr(result, "_mapping") else dict(result)
                    )
                    logger.info(
                        f"Transaction {transaction_id} retrieved in {query_time:.2f}s"
                    )
                    return dict(transaction)

                logger.info(
                    f"Transaction {transaction_id} not found, query time: {query_time:.2f}s"
                )
                return None

        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving transaction {transaction_id}: {e}")
            raise

    def update_transaction_status(
        self,
        transaction_id: str,
        status: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Update transaction status with optimized query, including JSONB merge for metadata.

        Args:
            transaction_id: Transaction ID
            status: New status
            metadata: Optional metadata updates

        Returns:
            True if successful, False if transaction not found
        """
        start_time = time.time()

        # Base query for status update
        query_sql = """
            UPDATE transactions
            SET status = :status, updated_at = NOW()
        """
        params = {"transaction_id": transaction_id, "status": status}

        # Optimized for modern databases (e.g., PostgreSQL) to merge JSONB
        if metadata:
            query_sql += ", metadata = metadata || :metadata_obj"
            params["metadata_obj"] = (
                metadata  # SQLAlchemy handles JSON serialization automatically with JSONB types
            )

        query_sql += " WHERE transaction_id = :transaction_id"

        try:
            with self.session_scope() as session:
                query = text(query_sql)
                result = session.execute(query, params)
                rows_affected = result.rowcount

                query_time = time.time() - start_time
                if (
                    self.config["debug"]["log_slow_queries"]
                    and query_time > self.config["debug"]["slow_query_threshold"]
                ):
                    logger.warning(
                        f"Slow query in update_transaction_status: {query_time:.2f}s"
                    )

                logger.info(
                    f"Transaction {transaction_id} status updated to {status} ({rows_affected} rows affected) in {query_time:.2f}s"
                )
                return rows_affected > 0

        except SQLAlchemyError as e:
            logger.error(f"Database error updating transaction {transaction_id}: {e}")
            raise

    def query_transactions(
        self, filters: Dict[str, Any], limit: int = 100, offset: int = 0
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Query transactions with optimized filtering and pagination.

        Args:
            filters: Query filters
            limit: Maximum number of results
            offset: Result offset for pagination

        Returns:
            Tuple of (transactions list, total count)
        """
        start_time = time.time()
        limit = min(limit, self.config["query"]["batch_size"])

        try:
            with self.read_session_scope() as session:
                where_clauses = []
                params = {"limit": limit, "offset": offset}

                if filters.get("account_id"):
                    where_clauses.append(
                        "(source_account_id = :account_id OR destination_account_id = :account_id)"
                    )
                    params["account_id"] = filters["account_id"]

                if filters.get("transaction_type"):
                    where_clauses.append("transaction_type = :transaction_type")
                    params["transaction_type"] = filters["transaction_type"]

                if filters.get("status"):
                    where_clauses.append("status = :status")
                    params["status"] = filters["status"]

                if filters.get("min_amount") is not None:
                    where_clauses.append("amount >= :min_amount")
                    params["min_amount"] = filters["min_amount"]

                if filters.get("max_amount") is not None:
                    where_clauses.append("amount <= :max_amount")
                    params["max_amount"] = filters["max_amount"]

                if filters.get("currency"):
                    where_clauses.append("currency = :currency")
                    params["currency"] = filters["currency"]

                if filters.get("start_date"):
                    where_clauses.append("created_at >= :start_date")
                    params["start_date"] = filters["start_date"]

                if filters.get("end_date"):
                    where_clauses.append("created_at <= :end_date")
                    params["end_date"] = filters["end_date"]

                if filters.get("reference"):
                    where_clauses.append("reference LIKE :reference")
                    params["reference"] = f"%{filters['reference']}%"

                where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

                # Execute count query first
                count_query = text(
                    f"SELECT COUNT(*) FROM transactions WHERE {where_sql}"
                )
                count_params = {
                    k: v for k, v in params.items() if k not in ["limit", "offset"]
                }
                total_count = session.execute(count_query, count_params).scalar()

                # Execute main query
                query = text(
                    f"""
                    SELECT * FROM transactions
                    WHERE {where_sql}
                    ORDER BY created_at DESC
                    LIMIT :limit OFFSET :offset
                """
                )
                results = session.execute(query, params).fetchall()
                transactions = [
                    dict(row._mapping if hasattr(row, "_mapping") else row)
                    for row in results
                ]

                query_time = time.time() - start_time
                if (
                    self.config["debug"]["log_slow_queries"]
                    and query_time > self.config["debug"]["slow_query_threshold"]
                ):
                    logger.warning(
                        f"Slow query in query_transactions: {query_time:.2f}s"
                    )

                logger.info(
                    f"Query returned {len(transactions)} of {total_count} transactions in {query_time:.2f}s"
                )
                return transactions, total_count

        except SQLAlchemyError as e:
            logger.error(f"Database error querying transactions: {e}")
            raise

    def create_transaction_batch(
        self, transactions: List[Dict[str, Any]]
    ) -> Tuple[str, int]:
        """
        Create multiple transactions in a single batch operation using SQLAlchemy's executemany.

        Args:
            transactions: List of transaction data

        Returns:
            Tuple of (batch_id, number of transactions created)
        """
        start_time = time.time()
        batch_id = str(int(time.time() * 1000000))

        try:
            with self.session_scope() as session:
                query = text(
                    """
                    INSERT INTO transactions (
                        transaction_id, batch_id, source_account_id, destination_account_id,
                        amount, currency, transaction_type, status,
                        reference, description, created_at, updated_at,
                        risk_score, risk_level, metadata
                    ) VALUES (
                        :transaction_id, :batch_id, :source_account_id, :destination_account_id,
                        :amount, :currency, :transaction_type, :status,
                        :reference, :description, NOW(), NOW(),
                        :risk_score, :risk_level, :metadata
                    )
                """
                )

                prepared_transactions = []
                for tx in transactions:
                    tx_copy = tx.copy()
                    tx_copy["batch_id"] = batch_id
                    tx_copy.setdefault("status", "PENDING")
                    # Note: We don't need to default created_at/updated_at here
                    # as the SQL query uses NOW()
                    prepared_transactions.append(tx_copy)

                result = session.execute(query, prepared_transactions)
                rows_inserted = result.rowcount

            query_time = time.time() - start_time
            if (
                self.config["debug"]["log_slow_queries"]
                and query_time > self.config["debug"]["slow_query_threshold"]
            ):
                logger.warning(
                    f"Slow query in create_transaction_batch: {query_time:.2f}s"
                )

            logger.info(
                f"Batch {batch_id} with {rows_inserted} transactions created in {query_time:.2f}s"
            )
            return batch_id, rows_inserted

        except SQLAlchemyError as e:
            logger.error(f"Database error creating transaction batch: {e}")
            raise

    def get_transaction_statistics(
        self,
        account_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get transaction statistics with optimized aggregation queries.
        """
        start_time = time.time()

        try:
            with self.read_session_scope() as session:
                where_clauses = []
                params = {}

                if account_id:
                    where_clauses.append(
                        "(source_account_id = :account_id OR destination_account_id = :account_id)"
                    )
                    params["account_id"] = account_id

                if start_date:
                    where_clauses.append("created_at >= :start_date")
                    params["start_date"] = start_date

                if end_date:
                    where_clauses.append("created_at <= :end_date")
                    params["end_date"] = end_date

                where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

                # Total count and amount
                count_query = text(
                    f"""
                    SELECT COUNT(*) as total_count,
                           SUM(amount) as total_amount,
                           AVG(amount) as average_amount
                    FROM transactions
                    WHERE {where_sql}
                """
                )
                count_result = session.execute(count_query, params).fetchone()

                # Count by status
                status_query = text(
                    f"""
                    SELECT status, COUNT(*) as count
                    FROM transactions
                    WHERE {where_sql}
                    GROUP BY status
                """
                )
                status_results = session.execute(status_query, params).fetchall()

                # Count by type
                type_query = text(
                    f"""
                    SELECT transaction_type, COUNT(*) as count
                    FROM transactions
                    WHERE {where_sql}
                    GROUP BY transaction_type
                """
                )
                type_results = session.execute(type_query, params).fetchall()

                stats = {
                    "total_count": count_result.total_count if count_result else 0,
                    "total_amount": (
                        float(count_result.total_amount)
                        if count_result and count_result.total_amount
                        else 0.0
                    ),
                    "average_amount": (
                        float(count_result.average_amount)
                        if count_result and count_result.average_amount
                        else 0.0
                    ),
                    "by_status": {row.status: row.count for row in status_results},
                    "by_type": {
                        row.transaction_type: row.count for row in type_results
                    },
                    "period_start": start_date,
                    "period_end": end_date,
                }

                query_time = time.time() - start_time
                logger.info(f"Transaction statistics generated in {query_time:.2f}s")
                return stats

        except SQLAlchemyError as e:
            logger.error(f"Database error getting transaction statistics: {e}")
            raise

    def get_database_health(self) -> Dict[str, Any]:
        """Get database health metrics."""
        start_time = time.time()

        try:
            with self.read_session_scope() as session:
                # Check connection
                session.execute(text("SELECT 1")).fetchone()

                pool_status = {
                    "size": self.engine.pool.size(),
                    "checkedin": self.engine.pool.checkedin(),
                    "checkedout": self.engine.pool.checkedout(),
                    "overflow": self.engine.pool.overflow(),
                }

                table_stats_query = text(
                    """
                    SELECT
                        (SELECT COUNT(*) FROM transactions) as transaction_count,
                        (SELECT MAX(created_at) FROM transactions) as latest_transaction
                """
                )
                table_stats = session.execute(table_stats_query).fetchone()

                health = {
                    "status": "healthy",
                    "response_time": time.time() - start_time,
                    "pool": pool_status,
                    "tables": {
                        "transactions": {
                            "count": (
                                table_stats.transaction_count if table_stats else 0
                            ),
                            "latest": (
                                table_stats.latest_transaction.isoformat()
                                if table_stats and table_stats.latest_transaction
                                else None
                            ),
                        }
                    },
                }
                return health

        except Exception as e:
            logger.error(f"Database health check error: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "response_time": time.time() - start_time,
            }

    def initialize_schema(self) -> None:
        """
        Initialize database schema with optimized indexes.
        Separates Table creation and Index creation to support PostgreSQL correctly.
        """

        try:
            with self.session_scope() as session:
                # 1. Create Transactions Table
                session.execute(
                    text(
                        """
                    CREATE TABLE IF NOT EXISTS transactions (
                        id SERIAL PRIMARY KEY,
                        transaction_id VARCHAR(36) NOT NULL UNIQUE,
                        batch_id VARCHAR(36),
                        source_account_id VARCHAR(36) NOT NULL,
                        destination_account_id VARCHAR(36),
                        amount DECIMAL(19, 4) NOT NULL,
                        currency VARCHAR(3) NOT NULL,
                        transaction_type VARCHAR(20) NOT NULL,
                        status VARCHAR(20) NOT NULL,
                        reference VARCHAR(255),
                        description TEXT,
                        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                        completed_at TIMESTAMP,
                        risk_score DECIMAL(5, 4),
                        risk_level VARCHAR(20),
                        metadata JSONB
                    );
                """
                    )
                )

                # 2. Create Indexes for Transactions (PostgreSQL Syntax)
                # Note: We use individual CREATE INDEX IF NOT EXISTS statements
                indexes = [
                    "CREATE INDEX IF NOT EXISTS idx_batch_id ON transactions (batch_id)",
                    "CREATE INDEX IF NOT EXISTS idx_source_account ON transactions (source_account_id)",
                    "CREATE INDEX IF NOT EXISTS idx_destination_account ON transactions (destination_account_id)",
                    "CREATE INDEX IF NOT EXISTS idx_status ON transactions (status)",
                    "CREATE INDEX IF NOT EXISTS idx_type ON transactions (transaction_type)",
                    "CREATE INDEX IF NOT EXISTS idx_created_at ON transactions (created_at)",
                    "CREATE INDEX IF NOT EXISTS idx_reference ON transactions (reference)",
                    # Compound indexes
                    "CREATE INDEX IF NOT EXISTS idx_account_date ON transactions (source_account_id, created_at)",
                    "CREATE INDEX IF NOT EXISTS idx_status_date ON transactions (status, created_at)",
                    "CREATE INDEX IF NOT EXISTS idx_type_date ON transactions (transaction_type, created_at)",
                ]

                for idx_sql in indexes:
                    session.execute(text(idx_sql))

                # 3. Create Validation Results Table
                session.execute(
                    text(
                        """
                    CREATE TABLE IF NOT EXISTS validation_results (
                        id SERIAL PRIMARY KEY,
                        transaction_id VARCHAR(36) NOT NULL UNIQUE,
                        is_valid BOOLEAN NOT NULL,
                        risk_score DECIMAL(5, 4) NOT NULL,
                        risk_level VARCHAR(20) NOT NULL,
                        validation_checks JSONB,
                        errors JSONB,
                        warnings JSONB,
                        created_at TIMESTAMP NOT NULL DEFAULT NOW()
                    );
                """
                    )
                )

                # 4. Create Indexes for Validation Results
                validation_indexes = [
                    "CREATE INDEX IF NOT EXISTS idx_validation_transaction ON validation_results (transaction_id)",
                    "CREATE INDEX IF NOT EXISTS idx_validation_risk ON validation_results (risk_level, risk_score)",
                ]

                for idx_sql in validation_indexes:
                    session.execute(text(idx_sql))

                logger.info("Database schema initialized")

        except SQLAlchemyError as e:
            logger.error(f"Database schema initialization error: {e}")
            raise
