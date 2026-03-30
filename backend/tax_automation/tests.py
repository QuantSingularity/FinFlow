from typing import Any
import os
import tempfile
import unittest
from datetime import date, datetime
from decimal import Decimal

from core.logging import get_logger

logger = get_logger(__name__)
try:
    from tax_automation.international_compliance import (
        ComplianceCheckType,
        ComplianceStatus,
        InternationalComplianceManager,
        RiskLevel,
    )
    from tax_automation.tax_calculation_engine import (
        CalculationMethod,
        TaxRule,
        TaxType,
        Transaction,
        create_sample_data,
    )
    from tax_automation.tax_rule_management import TaxRuleManager
except ImportError:
    logger.info(
        "Warning: Could not import from 'tax_automation' package. Assuming local files."
    )


class TestTaxCalculationEngine(unittest.TestCase):
    """Test cases for the tax calculation engine"""

    def setUp(self) -> Any:
        """Set up test fixtures"""
        self.engine = create_sample_data()

    def test_tax_rule_creation(self) -> Any:
        """Test tax rule creation and validation"""
        rule = TaxRule(
            rule_id="TEST_RULE",
            jurisdiction="TEST",
            tax_type=TaxType.VAT,
            effective_date=date(2024, 1, 1),
            expiration_date=None,
            rate=Decimal("15.0"),
            calculation_method=CalculationMethod.PERCENTAGE,
            conditions={"min_amount": 100},
            description="Test VAT Rule",
        )
        self.assertEqual(rule.rule_id, "TEST_RULE")
        self.assertEqual(rule.tax_type, TaxType.VAT)
        self.assertEqual(rule.rate, Decimal("15.0"))
        self.assertTrue(rule.is_active())

    def test_tax_calculation_basic(self) -> Any:
        """Test basic tax calculation"""
        transaction = Transaction(
            transaction_id="test_txn_001",
            amount=Decimal("1000.00"),
            transaction_type="purchase",
            origin_jurisdiction="UK",
            destination_jurisdiction="UK",
            product_service_code="GOODS",
            timestamp=datetime.now(),
            payer_entity_id="user_001",
            payee_entity_id="corp_001",
        )
        result = self.engine.calculate_taxes(transaction)
        self.assertEqual(result.transaction_id, "test_txn_001")
        self.assertGreater(result.total_tax_amount, Decimal("0"))
        self.assertIsInstance(result.tax_breakdown, list)
        self.assertIsInstance(result.applied_rules, list)

    def test_tax_calculation_no_applicable_rules(self) -> Any:
        """Test tax calculation when no rules apply"""
        transaction = Transaction(
            transaction_id="test_txn_002",
            amount=Decimal("100.00"),
            transaction_type="transfer",
            origin_jurisdiction="UNKNOWN",
            destination_jurisdiction="UNKNOWN",
            product_service_code=None,
            timestamp=datetime.now(),
            payer_entity_id="user_001",
            payee_entity_id="user_002",
        )
        result = self.engine.calculate_taxes(transaction)
        self.assertEqual(result.total_tax_amount, Decimal("0"))
        self.assertEqual(len(result.applied_rules), 0)

    def test_transaction_validation(self) -> Any:
        """Test transaction validation"""
        invalid_transaction = Transaction(
            transaction_id="invalid_txn",
            amount=Decimal("-100.00"),
            transaction_type="",
            origin_jurisdiction="",
            destination_jurisdiction="",
            product_service_code=None,
            timestamp=datetime.now(),
            payer_entity_id="",
            payee_entity_id="",
        )
        errors = self.engine.validate_transaction(invalid_transaction)
        self.assertGreater(len(errors), 0)
        self.assertIn("Transaction amount must be positive", errors)


class TestTaxRuleManagement(unittest.TestCase):
    """Test cases for tax rule management"""

    def setUp(self) -> Any:
        """Set up test fixtures with temporary database"""
        self.temp_db = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
        self.temp_db.close()
        self.manager = TaxRuleManager(self.temp_db.name)

    def tearDown(self) -> Any:
        """Clean up test fixtures"""
        os.unlink(self.temp_db.name)

    def test_create_tax_rule(self) -> Any:
        """Test tax rule creation"""
        rule_data = {
            "rule_id": "TEST_RULE_001",
            "jurisdiction": "TEST",
            "tax_type": "vat",
            "effective_date": "2024-01-01",
            "rate": 20.0,
            "calculation_method": "percentage",
            "conditions": {"min_amount": 0.01},
            "description": "Test VAT Rule",
        }
        rule = self.manager.create_tax_rule(rule_data)
        self.assertIsNotNone(rule)
        self.assertEqual(rule.rule_id, "TEST_RULE_001")
        self.assertEqual(rule.rate, Decimal("20.0"))

    def test_get_tax_rule(self) -> Any:
        """Test tax rule retrieval"""
        rule_data = {
            "rule_id": "TEST_RULE_002",
            "jurisdiction": "TEST",
            "tax_type": "sales_tax",
            "effective_date": "2024-01-01",
            "rate": 8.5,
            "calculation_method": "percentage",
        }
        created_rule = self.manager.create_tax_rule(rule_data)
        self.assertIsNotNone(created_rule)
        retrieved_rule = self.manager.get_tax_rule("TEST_RULE_002")
        self.assertIsNotNone(retrieved_rule)
        self.assertEqual(retrieved_rule.rule_id, "TEST_RULE_002")

    def test_update_tax_rule(self) -> Any:
        """Test tax rule updates"""
        rule_data = {
            "rule_id": "TEST_RULE_003",
            "jurisdiction": "TEST",
            "tax_type": "vat",
            "effective_date": "2024-01-01",
            "rate": 15.0,
            "calculation_method": "percentage",
        }
        rule = self.manager.create_tax_rule(rule_data)
        self.assertIsNotNone(rule)
        updates = {"rate": 18.0, "description": "Updated test rule"}
        success = self.manager.update_tax_rule("TEST_RULE_003", updates)
        self.assertTrue(success)
        updated_rule = self.manager.get_tax_rule("TEST_RULE_003")
        self.assertEqual(updated_rule.rate, Decimal("18.0"))
        self.assertEqual(updated_rule.description, "Updated test rule")


class TestInternationalCompliance(unittest.TestCase):
    """Test cases for international compliance"""

    def setUp(self) -> Any:
        """Set up test fixtures with temporary database"""
        self.temp_db = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
        self.temp_db.close()
        self.compliance_manager = InternationalComplianceManager(self.temp_db.name)

    def tearDown(self) -> Any:
        """Clean up test fixtures"""
        os.unlink(self.temp_db.name)

    def test_create_entity_profile(self) -> Any:
        """Test entity profile creation"""
        profile_data = {
            "entity_id": "test_entity_001",
            "entity_type": "individual",
            "full_name": "John Doe",
            "date_of_birth": "1990-01-01",
            "nationality": "US",
            "country_of_residence": "US",
            "address": {
                "street": "123 Main St",
                "city": "New York",
                "state": "NY",
                "country": "US",
            },
            "identification_documents": [
                {"type": "government_id", "number": "DL123456789"}
            ],
        }
        profile = self.compliance_manager.create_entity_profile(profile_data)
        self.assertEqual(profile.entity_id, "test_entity_001")
        self.assertEqual(profile.full_name, "John Doe")
        self.assertEqual(profile.nationality, "US")

    def test_kyc_check(self) -> Any:
        """Test KYC compliance check"""
        profile_data = {
            "entity_id": "test_entity_002",
            "entity_type": "individual",
            "full_name": "Jane Smith",
            "country_of_residence": "UK",
            "identification_documents": [
                {"type": "government_id", "number": "PASS123456"},
                {"type": "proof_of_address", "document": "utility_bill"},
            ],
        }
        self.compliance_manager.create_entity_profile(profile_data)
        kyc_result = self.compliance_manager.kyc_service.perform_kyc_check(
            "test_entity_002"
        )
        self.assertEqual(kyc_result.entity_id, "test_entity_002")
        self.assertEqual(kyc_result.check_type, ComplianceCheckType.KYC)
        self.assertIn(
            kyc_result.status,
            [ComplianceStatus.PASSED, ComplianceStatus.REQUIRES_REVIEW],
        )

    def test_fatca_check(self) -> Any:
        """Test FATCA compliance check"""
        profile_data = {
            "entity_id": "test_entity_003",
            "entity_type": "individual",
            "full_name": "Bob Johnson",
            "nationality": "US",
            "country_of_residence": "US",
        }
        self.compliance_manager.create_entity_profile(profile_data)
        fatca_result = self.compliance_manager.fatca_service.check_us_person_status(
            "test_entity_003"
        )
        self.assertEqual(fatca_result.entity_id, "test_entity_003")
        self.assertEqual(fatca_result.check_type, ComplianceCheckType.FATCA)
        self.assertEqual(fatca_result.status, ComplianceStatus.PASSED)
        self.assertTrue(fatca_result.details.get("is_us_person", False))

    def test_aml_transaction_monitoring(self) -> Any:
        """Test AML transaction monitoring"""
        transaction_data = {
            "transaction_id": "test_txn_aml_001",
            "entity_id": "test_entity_004",
            "amount": 15000,
            "currency": "USD",
            "transaction_type": "transfer",
            "origin_country": "US",
            "destination_country": "US",
        }
        monitoring_result = self.compliance_manager.aml_service.monitor_transaction(
            transaction_data
        )
        self.assertEqual(monitoring_result.transaction_id, "test_txn_aml_001")
        self.assertGreater(monitoring_result.risk_score, 0)
        self.assertIn("large_cash_transaction", monitoring_result.flags)

    def test_comprehensive_compliance_check(self) -> Any:
        """Test comprehensive compliance check"""
        profile_data = {
            "entity_id": "test_entity_005",
            "entity_type": "individual",
            "full_name": "Alice Wonderland",
            "country_of_residence": "DE",
            "identification_documents": [
                {"type": "government_id", "number": "DE123456789"}
            ],
        }
        self.compliance_manager.create_entity_profile(profile_data)
        comprehensive_result = self.compliance_manager.perform_comprehensive_check(
            "test_entity_005"
        )
        self.assertEqual(comprehensive_result.entity_id, "test_entity_005")
        self.assertIsInstance(comprehensive_result.risk_level, RiskLevel)
        self.assertIsInstance(comprehensive_result.compliance_checks, list)
        self.assertGreater(len(comprehensive_result.compliance_checks), 0)


if __name__ == "__main__":
    unittest.main()
