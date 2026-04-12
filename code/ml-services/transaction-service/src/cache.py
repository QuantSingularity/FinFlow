import json
import logging
import time
from typing import Any, Dict, List, Optional

from redis import Redis
from redis.exceptions import RedisError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("transaction-cache")


class TransactionCache:
    """
    Caching service for transaction data using Redis.
    Provides optimized caching for high-volume transaction scenarios.
    """

    def __init__(self, redis_client: Redis, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the transaction cache with Redis client and optional configuration.

        Args:
            redis_client: Redis client instance
            config: Configuration dictionary with cache settings
        """
        self.redis = redis_client
        self.config = config or self._default_config()
        logger.info("Transaction cache initialized with configuration")

    def _default_config(self) -> Dict[str, Any]:
        """
        Default configuration for transaction caching.

        Returns:
            Dict containing default cache configuration
        """
        return {
            "ttl": {
                "transaction": 3600,  # 1 hour
                "account": 300,  # 5 minutes
                "batch": 7200,  # 2 hours
                "query": 60,  # 1 minute
                "validation": 600,  # 10 minutes
            },
            "prefixes": {
                "transaction": "tx:",
                "account": "acct:",
                "batch": "batch:",
                "query": "query:",
                "validation": "val:",
            },
            "limits": {
                "max_cached_transactions": 10000,
                "max_cached_queries": 1000,
            },
        }

    def get_transaction(self, transaction_id: str) -> Optional[Dict[str, Any]]:
        """
        Get transaction data from cache.

        Args:
            transaction_id: Transaction identifier

        Returns:
            Transaction data or None if not in cache
        """
        key = f"{self.config['prefixes']['transaction']}{transaction_id}"
        return self._get_json(key)

    def set_transaction(self, transaction_id: str, data: Dict[str, Any]) -> bool:
        """
        Cache transaction data.

        Args:
            transaction_id: Transaction identifier
            data: Transaction data to cache

        Returns:
            True if successful, False otherwise
        """
        key = f"{self.config['prefixes']['transaction']}{transaction_id}"
        ttl = self.config["ttl"]["transaction"]
        return self._set_json(key, data, ttl)

    def get_account_transactions(
        self, account_id: str
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Get cached transactions for an account.

        Args:
            account_id: Account identifier

        Returns:
            List of transactions or None if not in cache
        """
        key = f"{self.config['prefixes']['account']}{account_id}"
        return self._get_json(key)

    def set_account_transactions(
        self, account_id: str, transactions: List[Dict[str, Any]]
    ) -> bool:
        """
        Cache transactions for an account.

        Args:
            account_id: Account identifier
            transactions: List of transactions to cache

        Returns:
            True if successful, False otherwise
        """
        key = f"{self.config['prefixes']['account']}{account_id}"
        ttl = self.config["ttl"]["account"]
        return self._set_json(key, transactions, ttl)

    def get_batch(self, batch_id: str) -> Optional[Dict[str, Any]]:
        """
        Get batch data from cache.

        Args:
            batch_id: Batch identifier

        Returns:
            Batch data or None if not in cache
        """
        key = f"{self.config['prefixes']['batch']}{batch_id}"
        return self._get_json(key)

    def set_batch(self, batch_id: str, data: Dict[str, Any]) -> bool:
        """
        Cache batch data.

        Args:
            batch_id: Batch identifier
            data: Batch data to cache

        Returns:
            True if successful, False otherwise
        """
        key = f"{self.config['prefixes']['batch']}{batch_id}"
        ttl = self.config["ttl"]["batch"]
        return self._set_json(key, data, ttl)

    def get_query_results(self, query_hash: str) -> Optional[List[Dict[str, Any]]]:
        """
        Get cached query results.

        Args:
            query_hash: Hash of query parameters

        Returns:
            Query results or None if not in cache
        """
        key = f"{self.config['prefixes']['query']}{query_hash}"
        return self._get_json(key)

    def set_query_results(self, query_hash: str, results: List[Dict[str, Any]]) -> bool:
        """
        Cache query results.

        Args:
            query_hash: Hash of query parameters
            results: Query results to cache

        Returns:
            True if successful, False otherwise
        """
        key = f"{self.config['prefixes']['query']}{query_hash}"
        ttl = self.config["ttl"]["query"]
        return self._set_json(key, results, ttl)

    def get_validation_result(self, validation_key: str) -> Optional[Dict[str, Any]]:
        """
        Get cached validation result.

        Args:
            validation_key: Validation key

        Returns:
            Validation result or None if not in cache
        """
        key = f"{self.config['prefixes']['validation']}{validation_key}"
        return self._get_json(key)

    def set_validation_result(
        self, validation_key: str, result: Dict[str, Any]
    ) -> bool:
        """
        Cache validation result.

        Args:
            validation_key: Validation key
            result: Validation result to cache

        Returns:
            True if successful, False otherwise
        """
        key = f"{self.config['prefixes']['validation']}{validation_key}"
        ttl = self.config["ttl"]["validation"]
        return self._set_json(key, result, ttl)

    def invalidate_transaction(self, transaction_id: str) -> bool:
        """
        Invalidate cached transaction data.

        Args:
            transaction_id: Transaction identifier

        Returns:
            True if successful, False otherwise
        """
        key = f"{self.config['prefixes']['transaction']}{transaction_id}"
        return self._delete_key(key)

    def invalidate_account_transactions(self, account_id: str) -> bool:
        """
        Invalidate cached account transactions.

        Args:
            account_id: Account identifier

        Returns:
            True if successful, False otherwise
        """
        key = f"{self.config['prefixes']['account']}{account_id}"
        return self._delete_key(key)

    def invalidate_batch(self, batch_id: str) -> bool:
        """
        Invalidate cached batch data.

        Args:
            batch_id: Batch identifier

        Returns:
            True if successful, False otherwise
        """
        key = f"{self.config['prefixes']['batch']}{batch_id}"
        return self._delete_key(key)

    def invalidate_query_results(self, query_hash: str) -> bool:
        """
        Invalidate cached query results.

        Args:
            query_hash: Hash of query parameters

        Returns:
            True if successful, False otherwise
        """
        key = f"{self.config['prefixes']['query']}{query_hash}"
        return self._delete_key(key)

    def invalidate_all_queries(self) -> bool:
        """
        Invalidate all cached query results.

        Returns:
            True if successful, False otherwise
        """
        try:
            pattern = f"{self.config['prefixes']['query']}*"

            # Using SCAN/SSCAN for large databases is preferred, but for simplicity
            # in this class structure, KEYS is used with a warning on potential blocking.
            keys = self.redis.keys(pattern)
            if keys:
                # Use *keys to unpack the list as separate arguments to delete()
                self.redis.delete(*keys)

            logger.info(f"Invalidated all query caches: {len(keys)} keys")
            return True
        except RedisError as e:
            logger.error(f"Redis error when invalidating all queries: {e}")
            return False
        except Exception as e:
            logger.error(f"Error when invalidating all queries: {e}")
            return False

    def _get_json(self, key: str) -> Optional[Any]:
        """
        Get JSON data from Redis.

        Args:
            key: Redis key

        Returns:
            Deserialized JSON data or None
        """
        try:
            data = self.redis.get(key)
            if data:
                # Assuming data is stored as bytes, decode it before loading JSON
                return json.loads(data.decode("utf-8"))
            return None
        except RedisError as e:
            logger.error(f"Redis error when getting {key}: {e}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error for {key}: {e}")
            # Optional: Delete corrupted key here if necessary
            return None
        except Exception as e:
            logger.error(f"Error when getting {key}: {e}")
            return None

    def _set_json(self, key: str, data: Any, ttl: int) -> bool:
        """
        Set JSON data in Redis with TTL.

        Args:
            key: Redis key
            data: Data to serialize and store
            ttl: Time-to-live in seconds

        Returns:
            True if successful, False otherwise
        """
        try:
            # Serialize data to JSON string
            serialized = json.dumps(data)
            # Use SETEX (Set with EXpiration) command for atomic set and expiry
            self.redis.setex(key, ttl, serialized)
            return True
        except RedisError as e:
            logger.error(f"Redis error when setting {key}: {e}")
            return False
        except (TypeError, ValueError) as e:
            logger.error(f"JSON serialization error for {key}: {e}")
            return False
        except Exception as e:
            logger.error(f"Error when setting {key}: {e}")
            return False

    def _delete_key(self, key: str) -> bool:
        """
        Delete a key from Redis.

        Args:
            key: Redis key

        Returns:
            True if successful, False otherwise
        """
        try:
            # The delete command returns the number of keys removed (1 or 0)
            self.redis.delete(key)
            return True
        except RedisError as e:
            logger.error(f"Redis error when deleting {key}: {e}")
            return False
        except Exception as e:
            logger.error(f"Error when deleting {key}: {e}")
            return False

    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.

        Returns:
            Dictionary with cache statistics
        """
        stats = {
            "transaction_keys": 0,
            "account_keys": 0,
            "batch_keys": 0,
            "query_keys": 0,
            "validation_keys": 0,
            "total_keys": 0,
            "memory_used_bytes": 0,
            "hit_rate": 0.0,
            "keyspace_hits": 0,
            "keyspace_misses": 0,
        }

        try:
            # Count keys by type
            for prefix_name, prefix in self.config["prefixes"].items():
                pattern = f"{prefix}*"
                # Note: keys() can block for large databases, use SCAN in production
                count = len(self.redis.keys(pattern))
                stats[f"{prefix_name}_keys"] = count
                stats["total_keys"] += count

            # Get memory usage if available
            info_memory = self.redis.info("memory")
            if "used_memory" in info_memory:
                stats["memory_used_bytes"] = info_memory["used_memory"]

            # Get hit rate if available
            info_stats = self.redis.info("stats")
            if "keyspace_hits" in info_stats and "keyspace_misses" in info_stats:
                hits = info_stats["keyspace_hits"]
                misses = info_stats["keyspace_misses"]
                total = hits + misses

                stats["keyspace_hits"] = hits
                stats["keyspace_misses"] = misses

                if total > 0:
                    stats["hit_rate"] = hits / total

            return stats
        except RedisError as e:
            logger.error(f"Redis error when getting cache stats: {e}")
            return stats
        except Exception as e:
            logger.error(f"Error when getting cache stats: {e}")
            return stats


class CacheManager:
    """
    Manager for coordinating multiple cache instances and implementing cache policies.
    """

    def __init__(
        self,
        primary_cache: TransactionCache,
        fallback_cache: Optional[TransactionCache] = None,
    ):
        """
        Initialize the cache manager with primary and optional fallback cache.

        Args:
            primary_cache: Primary cache instance
            fallback_cache: Optional fallback cache instance
        """
        self.primary = primary_cache
        self.fallback = fallback_cache
        self._hits = 0
        self._misses = 0
        self._start_time = time.time()
        logger.info("Cache manager initialized")
        #

    def get_transaction(self, transaction_id: str) -> Optional[Dict[str, Any]]:
        """
        Get transaction data from cache with fallback support (read-through policy).

        Args:
            transaction_id: Transaction identifier

        Returns:
            Transaction data or None if not in cache
        """
        # 1. Try primary cache
        data = self.primary.get_transaction(transaction_id)
        if data:
            self._hits += 1
            return data

        # 2. Try fallback if available
        if self.fallback:
            data = self.fallback.get_transaction(transaction_id)
            if data:
                # 2a. Populate primary cache (promotes data to primary)
                self.primary.set_transaction(transaction_id, data)
                self._hits += 1
                return data

        # 3. Cache miss
        self._misses += 1
        return None

    def set_transaction(self, transaction_id: str, data: Dict[str, Any]) -> None:
        """
        Set transaction data in all available caches (write-through policy).

        Args:
            transaction_id: Transaction identifier
            data: Transaction data to cache
        """
        # 1. Set in primary cache
        self.primary.set_transaction(transaction_id, data)
        # 2. Set in fallback cache
        if self.fallback:
            self.fallback.set_transaction(transaction_id, data)

    def invalidate_transaction(self, transaction_id: str) -> None:
        """
        Invalidate transaction data in all available caches.

        Args:
            transaction_id: Transaction identifier
        """
        # 1. Invalidate in primary cache
        self.primary.invalidate_transaction(transaction_id)
        # 2. Invalidate in fallback cache
        if self.fallback:
            self.fallback.invalidate_transaction(transaction_id)

    def get_query_results(self, query_hash: str) -> Optional[List[Dict[str, Any]]]:
        """
        Get query results from cache with fallback support (read-through policy).

        Args:
            query_hash: Hash of query parameters

        Returns:
            Query results or None if not in cache
        """
        # 1. Try primary cache
        results = self.primary.get_query_results(query_hash)
        if results:
            self._hits += 1
            return results

        # 2. Try fallback if available
        if self.fallback:
            results = self.fallback.get_query_results(query_hash)
            if results:
                # 2a. Populate primary cache (promotes data to primary)
                self.primary.set_query_results(query_hash, results)
                self._hits += 1
                return results

        # 3. Cache miss
        self._misses += 1
        return None

    def set_query_results(self, query_hash: str, results: List[Dict[str, Any]]) -> None:
        """
        Set query results in all available caches (write-through policy).

        Args:
            query_hash: Hash of query parameters
            results: Query results to cache
        """
        # 1. Set in primary cache
        self.primary.set_query_results(query_hash, results)
        # 2. Set in fallback cache
        if self.fallback:
            self.fallback.set_query_results(query_hash, results)

    def invalidate_all_queries(self) -> None:
        """
        Invalidate all query results in all available caches.
        """
        # 1. Invalidate in primary cache
        self.primary.invalidate_all_queries()
        # 2. Invalidate in fallback cache
        if self.fallback:
            self.fallback.invalidate_all_queries()

    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache manager statistics.

        Returns:
            Dictionary with cache statistics
        """
        uptime = time.time() - self._start_time
        total = self._hits + self._misses
        hit_rate = self._hits / total if total > 0 else 0.0

        stats = {
            "uptime_seconds": uptime,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": hit_rate,
            "primary_cache": self.primary.get_cache_stats(),
        }

        if self.fallback:
            stats["fallback_cache"] = self.fallback.get_cache_stats()

        return stats
