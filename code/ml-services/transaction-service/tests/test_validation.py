import os
import sys
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../src"))

import os as _os

# BUG FIX: bare 'from models import' only resolves when CWD is src/.
# Insert src/ into sys.path so tests run correctly from the repo root.
import sys as _sys

_sys.path.insert(
    0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "..", "src")
)
from models import RiskLevel, TransactionRequest, TransactionType, ValidationResult
from validation import BatchTransactionValidator, TransactionValidator


def make_transaction(**kwargs):
    defaults = dict(
        transaction_id="tx-12345",
        source_account_id="account-123",
        destination_account_id="account-456",
        amount=1000.0,
        currency="USD",
        transaction_type=TransactionType.TRANSFER,
        reference="REF123",
        description="Test transaction",
    )
    defaults.update(kwargs)
    return TransactionRequest(**defaults)


CONTEXT = {
    "user_id": "user-123",
    "ip_address": "192.168.1.1",
    "device_fingerprint": "device-123",
    "country_code": "US",
}


class TestTransactionValidator(unittest.TestCase):
    """Test suite for the TransactionValidator class"""

    def setUp(self):
        self.validator = TransactionValidator()
        self.valid_transaction = make_transaction()

    def test_validate_valid_transaction(self):
        result = self.validator.validate_transaction(self.valid_transaction, CONTEXT)
        self.assertIsInstance(result, ValidationResult)
        self.assertTrue(result.is_valid)
        self.assertLess(result.risk_score, 0.8)
        self.assertEqual(len(result.errors), 0)

    def test_validate_invalid_amount(self):
        with patch.object(self.validator, "_validate_amount") as mock_validate:
            mock_validate.return_value = (
                False,
                [
                    {
                        "code": "INVALID_AMOUNT",
                        "message": "Amount must be positive",
                        "field": "amount",
                    }
                ],
                [],
            )
            result = self.validator.validate_transaction(
                self.valid_transaction, CONTEXT
            )
            self.assertFalse(result.is_valid)
            self.assertFalse(result.validation_checks.get("amount_valid", True))
            self.assertTrue(any(e.code == "INVALID_AMOUNT" for e in result.errors))

    def test_validate_high_value_transaction(self):
        high_value_tx = make_transaction(transaction_id="tx-highval", amount=100000.0)
        result = self.validator.validate_transaction(high_value_tx, CONTEXT)
        self.assertIsInstance(result, ValidationResult)
        self.assertGreater(result.risk_score, 0.0)

    def test_validate_transaction_velocity(self):
        with patch.object(
            self.validator, "_validate_transaction_velocity"
        ) as mock_velocity:
            mock_velocity.return_value = (
                False,
                [
                    {
                        "code": "VELOCITY_EXCEEDED",
                        "message": "Transaction frequency exceeds limits",
                        "field": "transaction_id",
                    }
                ],
                [],
            )
            result = self.validator.validate_transaction(
                self.valid_transaction, CONTEXT
            )
            self.assertFalse(result.is_valid)
            self.assertTrue(any(e.code == "VELOCITY_EXCEEDED" for e in result.errors))

    def test_batch_validation(self):
        batch_validator = BatchTransactionValidator(self.validator)
        transactions = [
            make_transaction(transaction_id="tx-1"),
            make_transaction(transaction_id="tx-2", amount=500.0),
        ]
        results = batch_validator.validate_batch(transactions, CONTEXT)
        self.assertEqual(len(results), 2)
        self.assertIn("tx-1", results)
        self.assertIn("tx-2", results)


class TestBatchTransactionValidator(unittest.TestCase):
    """Test suite for the BatchTransactionValidator class"""

    def setUp(self):
        self.mock_validator = MagicMock()
        self.batch_validator = BatchTransactionValidator(self.mock_validator)
        self.transactions = [
            make_transaction(transaction_id=f"tx-{i}", amount=1000.0 * (i + 1))
            for i in range(3)
        ]
        self.context = {"user_id": "user-123"}

    def test_validate_batch(self):
        self.mock_validator.validate_transaction.side_effect = (
            lambda tx, ctx: MagicMock(
                is_valid=True,
                risk_score=0.2,
                risk_level=RiskLevel.LOW,
                validation_checks={"basic_fields_valid": True},
                errors=[],
            )
        )
        results = self.batch_validator.validate_batch(self.transactions, self.context)
        self.assertEqual(len(results), 3)
        self.assertEqual(self.mock_validator.validate_transaction.call_count, 3)
        for tx in self.transactions:
            self.assertIn(tx.transaction_id, results)
            self.assertTrue(results[tx.transaction_id].is_valid)

    def test_batch_with_mixed_results(self):
        def side_effect(tx, ctx):
            if tx.transaction_id == "tx-1":
                return MagicMock(
                    is_valid=False,
                    risk_score=0.7,
                    risk_level=RiskLevel.HIGH,
                    validation_checks={"amount_valid": False},
                    errors=[MagicMock(code="INVALID_AMOUNT")],
                )
            return MagicMock(
                is_valid=True,
                risk_score=0.2,
                risk_level=RiskLevel.LOW,
                validation_checks={"basic_fields_valid": True},
                errors=[],
            )

        self.mock_validator.validate_transaction.side_effect = side_effect
        results = self.batch_validator.validate_batch(self.transactions, self.context)
        self.assertEqual(len(results), 3)
        self.assertTrue(results["tx-0"].is_valid)
        self.assertFalse(results["tx-1"].is_valid)
        self.assertTrue(results["tx-2"].is_valid)


if __name__ == "__main__":
    unittest.main()
