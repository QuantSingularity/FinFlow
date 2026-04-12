import json
import logging
import sqlite3
from dataclasses import asdict, dataclass, field
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

# Configure Logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class TaxType(Enum):
    VAT = "vat"
    SALES_TAX = "sales_tax"
    INCOME_TAX = "income_tax"
    WITHHOLDING_TAX = "withholding_tax"
    CAPITAL_GAINS_TAX = "capital_gains_tax"
    CORPORATE_TAX = "corporate_tax"


class CalculationMethod(Enum):
    PERCENTAGE = "percentage"
    FIXED_AMOUNT = "fixed_amount"
    TIERED = "tiered"
    PROGRESSIVE = "progressive"


@dataclass
class TaxRule:
    rule_id: str
    jurisdiction: str
    tax_type: TaxType
    effective_date: date
    expiration_date: Optional[date]
    rate: Decimal
    calculation_method: CalculationMethod
    conditions: Dict[str, Any] = field(default_factory=dict)
    description: str = ""

    def is_active(self, check_date: date = None) -> bool:
        """Check if the tax rule is active on a given date."""
        if check_date is None:
            check_date = date.today()

        if check_date < self.effective_date:
            return False

        if self.expiration_date and check_date > self.expiration_date:
            return False

        return True


class TaxRuleDatabase:
    """Database interface for tax rules."""

    def __init__(self, db_path: str = "tax_rules.db"):
        self.db_path = db_path
        self.init_database()

    def init_database(self):
        """Initialize the database schema."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Create tax_rules table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS tax_rules (
                rule_id TEXT PRIMARY KEY,
                jurisdiction TEXT NOT NULL,
                tax_type TEXT NOT NULL,
                effective_date TEXT NOT NULL,
                expiration_date TEXT,
                rate REAL NOT NULL,
                calculation_method TEXT NOT NULL,
                conditions TEXT,
                description TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 1
            )
        """
        )

        # Create tax_rule_history table for audit trail
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS tax_rule_history (
                history_id INTEGER PRIMARY KEY AUTOINCREMENT,
                rule_id TEXT NOT NULL,
                action TEXT NOT NULL,
                old_data TEXT,
                new_data TEXT,
                changed_by TEXT,
                changed_at TEXT NOT NULL
            )
        """
        )

        # Create indexes
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_jurisdiction ON tax_rules(jurisdiction)"
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tax_type ON tax_rules(tax_type)")
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_effective_date ON tax_rules(effective_date)"
        )

        conn.commit()
        conn.close()

    def save_tax_rule(self, tax_rule: TaxRule, changed_by: str = "system") -> bool:
        """Save or update a tax rule."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Check if rule exists
            cursor.execute(
                "SELECT * FROM tax_rules WHERE rule_id = ?", (tax_rule.rule_id,)
            )
            existing_rule = cursor.fetchone()

            current_time = datetime.now().isoformat()

            # Serialize the new TaxRule object for history logging
            new_data_json = json.dumps(asdict(tax_rule), default=str)

            if existing_rule:
                # Update existing rule
                col_names = [col[0] for col in cursor.description]
                old_data = dict(zip(col_names, existing_rule))

                # Clean up old_data for history logging
                old_data_for_log = {
                    k: old_data[k]
                    for k in old_data
                    if k not in ["created_at", "updated_at", "is_active"]
                }
                old_data_json = json.dumps(old_data_for_log, default=str)

                cursor.execute(
                    """
                    UPDATE tax_rules SET
                        jurisdiction = ?, tax_type = ?, effective_date = ?,
                        expiration_date = ?, rate = ?, calculation_method = ?,
                        conditions = ?, description = ?, updated_at = ?
                    WHERE rule_id = ?
                """,
                    (
                        tax_rule.jurisdiction,
                        tax_rule.tax_type.value,
                        tax_rule.effective_date.isoformat(),
                        (
                            tax_rule.expiration_date.isoformat()
                            if tax_rule.expiration_date
                            else None
                        ),
                        float(tax_rule.rate),
                        tax_rule.calculation_method.value,
                        json.dumps(tax_rule.conditions),
                        tax_rule.description,
                        current_time,
                        tax_rule.rule_id,
                    ),
                )

                # Log to history
                cursor.execute(
                    """
                    INSERT INTO tax_rule_history
                    (rule_id, action, old_data, new_data, changed_by, changed_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """,
                    (
                        tax_rule.rule_id,
                        "UPDATE",
                        old_data_json,
                        new_data_json,
                        changed_by,
                        current_time,
                    ),
                )

            else:
                # Insert new rule
                cursor.execute(
                    """
                    INSERT INTO tax_rules
                    (rule_id, jurisdiction, tax_type, effective_date, expiration_date,
                     rate, calculation_method, conditions, description, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        tax_rule.rule_id,
                        tax_rule.jurisdiction,
                        tax_rule.tax_type.value,
                        tax_rule.effective_date.isoformat(),
                        (
                            tax_rule.expiration_date.isoformat()
                            if tax_rule.expiration_date
                            else None
                        ),
                        float(tax_rule.rate),
                        tax_rule.calculation_method.value,
                        json.dumps(tax_rule.conditions),
                        tax_rule.description,
                        current_time,
                        current_time,
                    ),
                )

                # Log to history
                cursor.execute(
                    """
                    INSERT INTO tax_rule_history
                    (rule_id, action, old_data, new_data, changed_by, changed_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """,
                    (
                        tax_rule.rule_id,
                        "CREATE",
                        None,
                        new_data_json,
                        changed_by,
                        current_time,
                    ),
                )

            conn.commit()
            conn.close()
            return True

        except Exception as e:
            logger.error(f"Error saving tax rule {tax_rule.rule_id}: {e}")
            return False

    def get_tax_rule(self, rule_id: str) -> Optional[TaxRule]:
        """Get a tax rule by ID."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute(
                "SELECT * FROM tax_rules WHERE rule_id = ? AND is_active = 1",
                (rule_id,),
            )
            row = cursor.fetchone()
            conn.close()

            if row:
                return self._row_to_tax_rule(row)
            return None

        except Exception as e:
            logger.error(f"Error getting tax rule {rule_id}: {e}")
            return None

    def get_tax_rules_by_jurisdiction(self, jurisdiction: str) -> List[TaxRule]:
        """Get all active tax rules for a jurisdiction."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute(
                """
                SELECT * FROM tax_rules
                WHERE jurisdiction = ? AND is_active = 1
                ORDER BY effective_date DESC
            """,
                (jurisdiction,),
            )

            rows = cursor.fetchall()
            conn.close()

            return [self._row_to_tax_rule(row) for row in rows]

        except Exception as e:
            logger.error(
                f"Error getting tax rules for jurisdiction {jurisdiction}: {e}"
            )
            return []

    def get_active_tax_rules(self, as_of_date: date = None) -> List[TaxRule]:
        """Get all active tax rules as of a specific date."""
        if as_of_date is None:
            as_of_date = date.today()

        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            as_of_date_str = as_of_date.isoformat()

            cursor.execute(
                """
                SELECT * FROM tax_rules
                WHERE is_active = 1
                AND effective_date <= ?
                AND (expiration_date IS NULL OR expiration_date > ?)
                ORDER BY jurisdiction, tax_type, effective_date DESC
            """,
                (as_of_date_str, as_of_date_str),
            )

            rows = cursor.fetchall()
            conn.close()

            return [self._row_to_tax_rule(row) for row in rows]

        except Exception as e:
            logger.error(f"Error getting active tax rules: {e}")
            return []

    def deactivate_tax_rule(self, rule_id: str, changed_by: str = "system") -> bool:
        """Deactivate a tax rule."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            current_time = datetime.now().isoformat()

            # 1. Deactivate the rule
            cursor.execute(
                "UPDATE tax_rules SET is_active = 0, updated_at = ? WHERE rule_id = ?",
                (current_time, rule_id),
            )

            # 2. Log to history
            cursor.execute(
                """
                INSERT INTO tax_rule_history
                (rule_id, action, old_data, new_data, changed_by, changed_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """,
                (
                    rule_id,
                    "DEACTIVATE",
                    None,
                    None,
                    changed_by,
                    current_time,
                ),
            )

            conn.commit()
            conn.close()
            return True

        except Exception as e:
            logger.error(f"Error deactivating tax rule {rule_id}: {e}")
            return False

    def _row_to_tax_rule(self, row) -> TaxRule:
        """Convert database row to TaxRule object."""
        # Mapping: 0:id, 1:jur, 2:type, 3:eff, 4:exp, 5:rate, 6:method, 7:cond, 8:desc
        return TaxRule(
            rule_id=row[0],
            jurisdiction=row[1],
            tax_type=TaxType(row[2]),
            effective_date=date.fromisoformat(row[3]),
            expiration_date=date.fromisoformat(row[4]) if row[4] else None,
            rate=Decimal(str(row[5])),
            calculation_method=CalculationMethod(row[6]),
            conditions=json.loads(row[7]) if row[7] else {},
            description=row[8] or "",
        )


class TaxRuleManager:
    """High-level interface for managing tax rules."""

    def __init__(self, db_path: str = "tax_rules.db"):
        self.db = TaxRuleDatabase(db_path)
        self.cache: Dict[str, TaxRule] = {}
        self.cache_timestamp = datetime.now()
        self.cache_ttl_seconds = 300  # 5 minutes

    def create_tax_rule(
        self, rule_data: Dict[str, Any], changed_by: str = "system"
    ) -> Optional[TaxRule]:
        """Create a new tax rule from dictionary data."""
        try:
            # Ensure Decimal is used for rate to maintain precision
            rate = rule_data.get("rate")
            if rate is not None:
                rate = Decimal(str(rate))

            tax_rule = TaxRule(
                rule_id=rule_data["rule_id"],
                jurisdiction=rule_data["jurisdiction"],
                tax_type=TaxType(rule_data["tax_type"]),
                effective_date=date.fromisoformat(rule_data["effective_date"]),
                expiration_date=(
                    date.fromisoformat(rule_data["expiration_date"])
                    if rule_data.get("expiration_date")
                    else None
                ),
                rate=rate,
                calculation_method=CalculationMethod(rule_data["calculation_method"]),
                conditions=rule_data.get("conditions", {}),
                description=rule_data.get("description", ""),
            )

            if self.db.save_tax_rule(tax_rule, changed_by):
                self._invalidate_cache()
                return tax_rule
            return None

        except Exception as e:
            logger.error(f"Error creating tax rule: {e}")
            return None

    def update_tax_rule(
        self, rule_id: str, updates: Dict[str, Any], changed_by: str = "system"
    ) -> bool:
        """Update an existing tax rule."""
        try:
            existing_rule = self.get_tax_rule(rule_id)
            if not existing_rule:
                logger.error(f"Tax rule {rule_id} not found")
                return False

            # Convert to dictionary for easy updating
            rule_dict = asdict(existing_rule)
            rule_dict.update(updates)

            # Manually convert types back from strings/floats in updates if needed
            if isinstance(rule_dict.get("tax_type"), str):
                rule_dict["tax_type"] = TaxType(rule_dict["tax_type"])
            if isinstance(rule_dict.get("calculation_method"), str):
                rule_dict["calculation_method"] = CalculationMethod(
                    rule_dict["calculation_method"]
                )
            if isinstance(rule_dict.get("effective_date"), str):
                rule_dict["effective_date"] = date.fromisoformat(
                    rule_dict["effective_date"]
                )
            if isinstance(rule_dict.get("expiration_date"), str):
                rule_dict["expiration_date"] = date.fromisoformat(
                    rule_dict["expiration_date"]
                )
            if rule_dict.get("rate") is not None:
                rule_dict["rate"] = Decimal(str(rule_dict["rate"]))

            updated_rule = TaxRule(
                rule_id=rule_dict["rule_id"],
                jurisdiction=rule_dict["jurisdiction"],
                tax_type=rule_dict["tax_type"],
                effective_date=rule_dict["effective_date"],
                expiration_date=rule_dict["expiration_date"],
                rate=rule_dict["rate"],
                calculation_method=rule_dict["calculation_method"],
                conditions=rule_dict["conditions"],
                description=rule_dict["description"],
            )

            if self.db.save_tax_rule(updated_rule, changed_by):
                self._invalidate_cache()
                return True
            return False

        except Exception as e:
            logger.error(f"Error updating tax rule {rule_id}: {e}")
            return False

    def get_tax_rule(self, rule_id: str) -> Optional[TaxRule]:
        """Get a tax rule with caching."""
        if self._is_cache_valid() and rule_id in self.cache:
            return self.cache[rule_id]

        rule = self.db.get_tax_rule(rule_id)
        if rule:
            self.cache[rule_id] = rule

        return rule

    def get_applicable_rules(
        self, jurisdiction: str, tax_type: TaxType = None, as_of_date: date = None
    ) -> List[TaxRule]:
        """Get applicable tax rules for specific criteria."""
        # Start with jurisdiction-based retrieval (which also checks is_active=1)
        rules = self.db.get_tax_rules_by_jurisdiction(jurisdiction)

        # Filter by tax type if provided
        if tax_type:
            rules = [rule for rule in rules if rule.tax_type == tax_type]

        # Filter by date if provided
        if as_of_date:
            rules = [rule for rule in rules if rule.is_active(as_of_date)]

        return rules

    def import_tax_rules_from_json(
        self, json_file_path: str, changed_by: str = "import"
    ) -> int:
        """Import tax rules from JSON file."""
        try:
            with open(json_file_path, "r") as f:
                rules_data = json.load(f)

            imported_count = 0
            for rule_data in rules_data:
                # Use create_tax_rule to handle saving/updating/history
                if self.create_tax_rule(rule_data, changed_by):
                    imported_count += 1

            logger.info(f"Imported {imported_count} tax rules from {json_file_path}")
            return imported_count

        except Exception as e:
            logger.error(f"Error importing tax rules from {json_file_path}: {e}")
            return 0

    def export_tax_rules_to_json(
        self, json_file_path: str, jurisdiction: str = None
    ) -> bool:
        """Export tax rules to JSON file."""
        try:
            if jurisdiction:
                rules = self.db.get_tax_rules_by_jurisdiction(jurisdiction)
            else:
                rules = self.db.get_active_tax_rules()

            rules_data = []
            for rule in rules:
                rule_dict = asdict(rule)
                # Convert enums to strings for JSON serialization
                rule_dict["tax_type"] = rule.tax_type.value
                rule_dict["calculation_method"] = rule.calculation_method.value
                # Convert dates to strings
                rule_dict["effective_date"] = rule.effective_date.isoformat()
                if rule.expiration_date:
                    rule_dict["expiration_date"] = rule.expiration_date.isoformat()
                # Convert Decimal to float
                rule_dict["rate"] = float(rule.rate)

                rules_data.append(rule_dict)

            with open(json_file_path, "w") as f:
                json.dump(rules_data, f, indent=2)

            logger.info(f"Exported {len(rules_data)} tax rules to {json_file_path}")
            return True

        except Exception as e:
            logger.error(f"Error exporting tax rules to {json_file_path}: {e}")
            return False

    def _is_cache_valid(self) -> bool:
        """Check if cache is still valid."""
        return (datetime.now() - self.cache_timestamp).seconds < self.cache_ttl_seconds

    def _invalidate_cache(self):
        """Invalidate the cache."""
        self.cache.clear()
        self.cache_timestamp = datetime.now()


# Sample tax rules data for different jurisdictions
SAMPLE_TAX_RULES = [
    {
        "rule_id": "VAT_UK_STANDARD",
        "jurisdiction": "UK",
        "tax_type": "vat",
        "effective_date": "2024-01-01",
        "expiration_date": None,
        "rate": 20.0,
        "calculation_method": "percentage",
        "conditions": {"min_amount": 0.01},
        "description": "UK Standard VAT Rate",
    },
    {
        "rule_id": "VAT_UK_REDUCED",
        "jurisdiction": "UK",
        "tax_type": "vat",
        "effective_date": "2024-01-01",
        "expiration_date": None,
        "rate": 5.0,
        "calculation_method": "percentage",
        "conditions": {"product_codes": ["FOOD", "BOOKS", "MEDICAL"]},
        "description": "UK Reduced VAT Rate",
    },
    {
        "rule_id": "SALES_TAX_NY",
        "jurisdiction": "NY",
        "tax_type": "sales_tax",
        "effective_date": "2024-01-01",
        "expiration_date": "2025-12-31",
        "rate": 8.25,
        "calculation_method": "percentage",
        "conditions": {"transaction_types": ["purchase", "service"]},
        "description": "New York State Sales Tax",
    },
    {
        "rule_id": "SALES_TAX_CA_HISTORICAL",
        "jurisdiction": "CA",
        "tax_type": "sales_tax",
        "effective_date": "2023-01-01",
        "expiration_date": "2023-12-31",
        "rate": 7.25,
        "calculation_method": "percentage",
        "conditions": {"transaction_types": ["purchase"]},
        "description": "California State Sales Tax (Expired)",
    },
    {
        "rule_id": "WITHHOLDING_TAX_US_NONRESIDENT",
        "jurisdiction": "US",
        "tax_type": "withholding_tax",
        "effective_date": "2024-01-01",
        "expiration_date": None,
        "rate": 30.0,
        "calculation_method": "percentage",
        "conditions": {
            "entity_types": ["nonresident_alien"],
            "transaction_types": ["dividend", "interest"],
        },
        "description": "US Withholding Tax for Non-Resident Aliens",
    },
]


if __name__ == "__main__":
    DB_FILE = "tax_rules_management.db"

    # Clean up previous database file for a fresh test run
    if Path(DB_FILE).exists():
        Path(DB_FILE).unlink()

    print("--- Tax Rule Management System Test Run ---")
    manager = TaxRuleManager(DB_FILE)

    # 1. Import sample rules
    print("\n--- 1. Creating/Importing Rules ---")
    imported_count = 0
    for rule_data in SAMPLE_TAX_RULES:
        rule = manager.create_tax_rule(rule_data, "system_init")
        if rule:
            print(f"✅ Created rule: {rule.rule_id}")
            imported_count += 1
        else:
            print(f"❌ Failed to create rule: {rule_data['rule_id']}")

    # 2. Test retrieval (Active rules)
    print("\n--- 2. Retrieving Applicable Rules (UK) ---")
    uk_rules = manager.get_applicable_rules("UK")
    print(f"Found {len(uk_rules)} active rules for UK jurisdiction.")
    for rule in uk_rules:
        print(f" - {rule.rule_id} ({rule.rate}%)")

    # 3. Test update
    print("\n--- 3. Updating a Rule (VAT_UK_STANDARD) ---")
    update_success = manager.update_tax_rule(
        rule_id="VAT_UK_STANDARD",
        updates={
            "rate": 21.0,
            "description": "UK Standard VAT Rate (21% increase test)",
        },
        changed_by="admin_user",
    )
    if update_success:
        print("✅ VAT_UK_STANDARD updated successfully.")
        updated_rule = manager.get_tax_rule("VAT_UK_STANDARD")
        print(f"New Rate: {updated_rule.rate}%")

    # 4. Test deactivation
    print("\n--- 4. Deactivating a Rule (SALES_TAX_NY) ---")
    deactivate_success = manager.db.deactivate_tax_rule("SALES_TAX_NY", "admin_user")
    if deactivate_success:
        print("✅ SALES_TAX_NY deactivated successfully.")
        # Try to retrieve it
        ny_rules_after = manager.get_applicable_rules("NY")
        print(
            f"Found {len(ny_rules_after)} active rules for NY jurisdiction after deactivation."
        )

    # 5. Test history (using raw SQLite connection for demonstration)
    print("\n--- 5. Checking Audit History ---")
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT rule_id, action, changed_by, changed_at FROM tax_rule_history WHERE rule_id = 'VAT_UK_STANDARD'"
    )
    history_rows = cursor.fetchall()
    print(f"Found {len(history_rows)} history entries for VAT_UK_STANDARD:")
    for row in history_rows:
        print(f" - Rule: {row[0]}, Action: {row[1]}, By: {row[2]}, At: {row[3][:16]}")
    conn.close()

    # 6. Export to JSON
    EXPORT_FILE = "sample_tax_rules_export.json"
    print(f"\n--- 6. Exporting Active Rules to {EXPORT_FILE} ---")
    manager.export_tax_rules_to_json(EXPORT_FILE)
