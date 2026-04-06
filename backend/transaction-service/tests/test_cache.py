import json
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../src"))

from cache import CacheManager, TransactionCache


class TestTransactionCache(unittest.TestCase):
    """Test suite for the TransactionCache class"""

    def setUp(self):
        self.mock_redis = MagicMock()
        self.cache = TransactionCache(self.mock_redis)
        self.transaction_data = {
            "transaction_id": "tx-12345",
            "source_account_id": "account-123",
            "amount": 1000.0,
            "status": "COMPLETED",
        }
        self.query_results = [
            {"transaction_id": "tx-1", "amount": 100.0},
            {"transaction_id": "tx-2", "amount": 200.0},
        ]

    def test_get_transaction(self):
        self.mock_redis.get.return_value = json.dumps(self.transaction_data)
        result = self.cache.get_transaction("tx-12345")
        self.mock_redis.get.assert_called_once_with("tx:tx-12345")
        self.assertEqual(result, self.transaction_data)

    def test_get_transaction_not_found(self):
        self.mock_redis.get.return_value = None
        result = self.cache.get_transaction("tx-nonexistent")
        self.mock_redis.get.assert_called_once_with("tx:tx-nonexistent")
        self.assertIsNone(result)

    def test_set_transaction(self):
        result = self.cache.set_transaction("tx-12345", self.transaction_data)
        self.mock_redis.setex.assert_called_once()
        args, kwargs = self.mock_redis.setex.call_args
        self.assertEqual(args[0], "tx:tx-12345")
        self.assertEqual(args[1], self.cache.config["ttl"]["transaction"])
        self.assertEqual(json.loads(args[2]), self.transaction_data)
        self.assertTrue(result)

    def test_get_query_results(self):
        self.mock_redis.get.return_value = json.dumps(self.query_results)
        result = self.cache.get_query_results("query-hash-123")
        self.mock_redis.get.assert_called_once_with("query:query-hash-123")
        self.assertEqual(result, self.query_results)

    def test_set_query_results(self):
        result = self.cache.set_query_results("query-hash-123", self.query_results)
        self.mock_redis.setex.assert_called_once()
        args, kwargs = self.mock_redis.setex.call_args
        self.assertEqual(args[0], "query:query-hash-123")
        self.assertEqual(args[1], self.cache.config["ttl"]["query"])
        self.assertEqual(json.loads(args[2]), self.query_results)
        self.assertTrue(result)

    def test_invalidate_transaction(self):
        result = self.cache.invalidate_transaction("tx-12345")
        self.mock_redis.delete.assert_called_once_with("tx:tx-12345")
        self.assertTrue(result)

    def test_invalidate_all_queries(self):
        self.mock_redis.keys.return_value = ["query:hash1", "query:hash2"]
        result = self.cache.invalidate_all_queries()
        self.mock_redis.keys.assert_called_once_with("query:*")
        self.mock_redis.delete.assert_called_once_with("query:hash1", "query:hash2")
        self.assertTrue(result)

    def test_redis_error_handling(self):
        from redis.exceptions import RedisError
        self.mock_redis.get.side_effect = RedisError("Redis connection error")
        result = self.cache.get_transaction("tx-12345")
        self.mock_redis.get.assert_called_once()
        self.assertIsNone(result)


class TestCacheManager(unittest.TestCase):
    """Test suite for the CacheManager class"""

    def setUp(self):
        self.mock_primary = MagicMock()
        self.mock_fallback = MagicMock()
        self.cache_manager = CacheManager(self.mock_primary, self.mock_fallback)
        self.transaction_data = {"transaction_id": "tx-12345", "amount": 1000.0}

    def test_get_transaction_primary_hit(self):
        self.mock_primary.get_transaction.return_value = self.transaction_data
        result = self.cache_manager.get_transaction("tx-12345")
        self.mock_primary.get_transaction.assert_called_once_with("tx-12345")
        self.mock_fallback.get_transaction.assert_not_called()
        self.assertEqual(result, self.transaction_data)
        self.assertEqual(self.cache_manager._hits, 1)
        self.assertEqual(self.cache_manager._misses, 0)

    def test_get_transaction_primary_miss_fallback_hit(self):
        self.mock_primary.get_transaction.return_value = None
        self.mock_fallback.get_transaction.return_value = self.transaction_data
        result = self.cache_manager.get_transaction("tx-12345")
        self.mock_primary.get_transaction.assert_called_once_with("tx-12345")
        self.mock_fallback.get_transaction.assert_called_once_with("tx-12345")
        self.mock_primary.set_transaction.assert_called_once_with("tx-12345", self.transaction_data)
        self.assertEqual(result, self.transaction_data)

    def test_get_transaction_both_miss(self):
        self.mock_primary.get_transaction.return_value = None
        self.mock_fallback.get_transaction.return_value = None
        result = self.cache_manager.get_transaction("tx-12345")
        self.mock_primary.get_transaction.assert_called_once_with("tx-12345")
        self.mock_fallback.get_transaction.assert_called_once_with("tx-12345")
        self.mock_primary.set_transaction.assert_not_called()
        self.assertIsNone(result)
        self.assertEqual(self.cache_manager._misses, 1)

    def test_set_transaction(self):
        self.cache_manager.set_transaction("tx-12345", self.transaction_data)
        self.mock_primary.set_transaction.assert_called_once_with("tx-12345", self.transaction_data)
        self.mock_fallback.set_transaction.assert_called_once_with("tx-12345", self.transaction_data)

    def test_invalidate_transaction(self):
        self.cache_manager.invalidate_transaction("tx-12345")
        self.mock_primary.invalidate_transaction.assert_called_once_with("tx-12345")
        self.mock_fallback.invalidate_transaction.assert_called_once_with("tx-12345")

    def test_get_stats(self):
        self.mock_primary.get_cache_stats.return_value = {"total_keys": 100}
        self.mock_fallback.get_cache_stats.return_value = {"total_keys": 200}
        stats = self.cache_manager.get_stats()
        self.assertIn("primary_cache", stats)
        self.assertEqual(stats["primary_cache"], {"total_keys": 100})
        self.assertIn("fallback_cache", stats)
        self.assertEqual(stats["fallback_cache"], {"total_keys": 200})
        self.assertEqual(stats["hits"], 0)
        self.assertEqual(stats["misses"], 0)
        self.assertEqual(stats["hit_rate"], 0)


if __name__ == "__main__":
    unittest.main()
