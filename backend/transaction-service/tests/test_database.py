import os
import sys
import unittest
from datetime import datetime
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../src"))

from database import TransactionDatabase


class TestTransactionDatabase(unittest.TestCase):
    """Test suite for the TransactionDatabase class"""

    def setUp(self):
        with patch("database.create_engine"), patch("database.sessionmaker"):
            self.db = TransactionDatabase("sqlite:///:memory:")
        self.transaction_data = {
            "transaction_id": "tx-12345",
            "source_account_id": "account-123",
            "destination_account_id": "account-456",
            "amount": 1000.0,
            "currency": "USD",
            "transaction_type": "TRANSFER",
            "status": "COMPLETED",
            "reference": "REF123",
            "description": "Test transaction",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "risk_score": 0.2,
            "risk_level": "LOW",
            "metadata": {"test": True},
        }

    def test_create_transaction(self):
        mock_session = MagicMock()
        mock_session.__enter__ = MagicMock(return_value=mock_session)
        mock_session.__exit__ = MagicMock(return_value=False)
        self.db.Session = MagicMock(return_value=mock_session)

        result = self.db.create_transaction(self.transaction_data)

        mock_session.execute.assert_called_once()
        mock_session.commit.assert_called_once()
        self.assertEqual(result, self.transaction_data["transaction_id"])

    def test_get_transaction_found(self):
        mock_session = MagicMock()
        mock_session.__enter__ = MagicMock(return_value=mock_session)
        mock_session.__exit__ = MagicMock(return_value=False)
        mock_row = MagicMock()
        mock_row._asdict.return_value = self.transaction_data
        mock_session.execute.return_value.fetchone.return_value = mock_row
        self.db.Session = MagicMock(return_value=mock_session)

        result = self.db.get_transaction("tx-12345")

        mock_session.execute.assert_called_once()
        self.assertIsNotNone(result)

    def test_get_transaction_not_found(self):
        mock_session = MagicMock()
        mock_session.__enter__ = MagicMock(return_value=mock_session)
        mock_session.__exit__ = MagicMock(return_value=False)
        mock_session.execute.return_value.fetchone.return_value = None
        self.db.Session = MagicMock(return_value=mock_session)

        result = self.db.get_transaction("tx-nonexistent")

        self.assertIsNone(result)

    def test_update_transaction_status(self):
        mock_session = MagicMock()
        mock_session.__enter__ = MagicMock(return_value=mock_session)
        mock_session.__exit__ = MagicMock(return_value=False)
        mock_session.execute.return_value.rowcount = 1
        self.db.Session = MagicMock(return_value=mock_session)

        result = self.db.update_transaction_status("tx-12345", "COMPLETED")

        mock_session.execute.assert_called_once()
        mock_session.commit.assert_called_once()
        self.assertTrue(result)

    def test_create_transaction_batch(self):
        mock_session = MagicMock()
        mock_session.__enter__ = MagicMock(return_value=mock_session)
        mock_session.__exit__ = MagicMock(return_value=False)
        self.db.Session = MagicMock(return_value=mock_session)

        batch = [
            {**self.transaction_data, "transaction_id": f"tx-{i}"}
            for i in range(3)
        ]
        results = self.db.create_transaction_batch(batch)

        self.assertEqual(len(results), 3)
        mock_session.commit.assert_called_once()


if __name__ == "__main__":
    unittest.main()
