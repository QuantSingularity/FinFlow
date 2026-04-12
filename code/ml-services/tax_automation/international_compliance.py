import json
import logging
import sqlite3
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

#


class ComplianceCheckType(Enum):
    """Types of compliance checks"""

    KYC = "kyc"
    AML = "aml"
    FATCA = "fatca"
    CRS = "crs"  # Common Reporting Standard
    SANCTIONS = "sanctions"
    PEP = "pep"  # Politically Exposed Person
    DATA_RESIDENCY = "data_residency"
    PSD2 = "psd2"


class ComplianceStatus(Enum):
    """Status of compliance checks"""

    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"
    REQUIRES_REVIEW = "requires_review"
    EXPIRED = "expired"


class RiskLevel(Enum):
    """Risk assessment levels"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ComplianceCheck:
    """Data model for compliance checks"""

    check_id: str
    entity_id: str
    check_type: ComplianceCheckType
    status: ComplianceStatus
    risk_level: RiskLevel
    details: Dict[str, Any] = field(default_factory=dict)
    external_reference: Optional[str] = None
    performed_at: datetime = field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None
    performed_by: str = "system"
    notes: str = ""


@dataclass
class EntityProfile:
    """Enhanced entity profile for compliance"""

    entity_id: str
    entity_type: str
    full_name: str
    date_of_birth: Optional[date] = None
    nationality: Optional[str] = None
    country_of_residence: str = ""
    address: Dict[str, str] = field(default_factory=dict)
    identification_documents: List[Dict[str, Any]] = field(default_factory=list)
    business_activities: List[str] = field(default_factory=list)
    source_of_funds: str = ""
    expected_transaction_volume: Optional[Decimal] = None
    risk_factors: List[str] = field(default_factory=list)
    compliance_flags: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class TransactionMonitoring:
    """Transaction monitoring for AML compliance"""

    transaction_id: str
    entity_id: str
    amount: Decimal
    currency: str
    transaction_type: str
    counterparty_id: Optional[str]
    origin_country: str
    destination_country: str
    risk_score: float
    flags: List[str] = field(default_factory=list)
    monitoring_rules_triggered: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.now)


class ComplianceDatabase:
    """Database interface for compliance data"""

    #

    def __init__(self, db_path: str = "compliance.db"):
        self.db_path = db_path
        self.init_database()

    def init_database(self):
        """Initialize the compliance database schema"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Entity profiles table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS entity_profiles (
                entity_id TEXT PRIMARY KEY,
                entity_type TEXT NOT NULL,
                full_name TEXT NOT NULL,
                date_of_birth TEXT,
                nationality TEXT,
                country_of_residence TEXT,
                address TEXT,
                identification_documents TEXT,
                business_activities TEXT,
                source_of_funds TEXT,
                expected_transaction_volume REAL,
                risk_factors TEXT,
                compliance_flags TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """
        )

        # Compliance checks table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS compliance_checks (
                check_id TEXT PRIMARY KEY,
                entity_id TEXT NOT NULL,
                check_type TEXT NOT NULL,
                status TEXT NOT NULL,
                risk_level TEXT NOT NULL,
                details TEXT,
                external_reference TEXT,
                performed_at TEXT NOT NULL,
                expires_at TEXT,
                performed_by TEXT,
                notes TEXT,
                FOREIGN KEY (entity_id) REFERENCES entity_profiles (entity_id)
            )
        """
        )

        # Transaction monitoring table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS transaction_monitoring (
                transaction_id TEXT PRIMARY KEY,
                entity_id TEXT NOT NULL,
                amount REAL NOT NULL,
                currency TEXT NOT NULL,
                transaction_type TEXT NOT NULL,
                counterparty_id TEXT,
                origin_country TEXT NOT NULL,
                destination_country TEXT NOT NULL,
                risk_score REAL NOT NULL,
                flags TEXT,
                monitoring_rules_triggered TEXT,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (entity_id) REFERENCES entity_profiles (entity_id)
            )
        """
        )

        # FATCA reporting table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS fatca_reports (
                report_id TEXT PRIMARY KEY,
                entity_id TEXT NOT NULL,
                account_number TEXT,
                account_balance REAL,
                income_payments REAL,
                us_person_indicator BOOLEAN,
                reporting_year INTEGER,
                report_data TEXT,
                submitted_at TEXT,
                status TEXT,
                FOREIGN KEY (entity_id) REFERENCES entity_profiles (entity_id)
            )
        """
        )

        # Create indexes
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_entity_compliance ON compliance_checks(entity_id)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_check_type ON compliance_checks(check_type)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_transaction_entity ON transaction_monitoring(entity_id)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_transaction_risk ON transaction_monitoring(risk_score)"
        )

        conn.commit()
        conn.close()

    def save_entity_profile(self, profile: EntityProfile) -> bool:
        """Save or update entity profile"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute(
                """
                INSERT OR REPLACE INTO entity_profiles
                (entity_id, entity_type, full_name, date_of_birth, nationality,
                 country_of_residence, address, identification_documents,
                 business_activities, source_of_funds, expected_transaction_volume,
                 risk_factors, compliance_flags, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    profile.entity_id,
                    profile.entity_type,
                    profile.full_name,
                    (
                        profile.date_of_birth.isoformat()
                        if profile.date_of_birth
                        else None
                    ),
                    profile.nationality,
                    profile.country_of_residence,
                    json.dumps(profile.address),
                    json.dumps(profile.identification_documents),
                    json.dumps(profile.business_activities),
                    profile.source_of_funds,
                    (
                        float(profile.expected_transaction_volume)
                        if profile.expected_transaction_volume
                        else None
                    ),
                    json.dumps(profile.risk_factors),
                    json.dumps(profile.compliance_flags),
                    profile.created_at.isoformat(),
                    profile.updated_at.isoformat(),
                ),
            )

            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Error saving entity profile {profile.entity_id}: {e}")
            return False

    def save_compliance_check(self, check: ComplianceCheck) -> bool:
        """Save compliance check result"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute(
                """
                INSERT OR REPLACE INTO compliance_checks
                (check_id, entity_id, check_type, status, risk_level, details,
                 external_reference, performed_at, expires_at, performed_by, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    check.check_id,
                    check.entity_id,
                    check.check_type.value,
                    check.status.value,
                    check.risk_level.value,
                    json.dumps(check.details),
                    check.external_reference,
                    check.performed_at.isoformat(),
                    check.expires_at.isoformat() if check.expires_at else None,
                    check.performed_by,
                    check.notes,
                ),
            )

            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Error saving compliance check {check.check_id}: {e}")
            return False

    def get_entity_profile(self, entity_id: str) -> Optional[EntityProfile]:
        """Get entity profile by ID"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute(
                "SELECT * FROM entity_profiles WHERE entity_id = ?", (entity_id,)
            )
            row = cursor.fetchone()
            conn.close()

            if row:
                return EntityProfile(
                    entity_id=row[0],
                    entity_type=row[1],
                    full_name=row[2],
                    date_of_birth=date.fromisoformat(row[3]) if row[3] else None,
                    nationality=row[4],
                    country_of_residence=row[5],
                    address=json.loads(row[6]) if row[6] else {},
                    identification_documents=json.loads(row[7]) if row[7] else [],
                    business_activities=json.loads(row[8]) if row[8] else [],
                    source_of_funds=row[9] or "",
                    expected_transaction_volume=(
                        Decimal(str(row[10])) if row[10] is not None else None
                    ),
                    risk_factors=json.loads(row[11]) if row[11] else [],
                    compliance_flags=json.loads(row[12]) if row[12] else [],
                    created_at=datetime.fromisoformat(row[13]),
                    updated_at=datetime.fromisoformat(row[14]),
                )
            return None
        except Exception as e:
            logger.error(f"Error getting entity profile {entity_id}: {e}")
            return None


class KYCService:
    """Know Your Customer (KYC) service"""

    #

    def __init__(self, db: ComplianceDatabase):
        self.db = db
        self.required_documents = {
            "individual": ["government_id", "proof_of_address"],
            "corporation": [
                "certificate_of_incorporation",
                "proof_of_address",
                "beneficial_ownership",
            ],
        }

    def perform_kyc_check(self, entity_id: str) -> ComplianceCheck:
        """Perform KYC compliance check"""
        check_id = f"kyc_{entity_id}_{int(datetime.now().timestamp())}"

        try:
            profile = self.db.get_entity_profile(entity_id)
            if not profile:
                return ComplianceCheck(
                    check_id=check_id,
                    entity_id=entity_id,
                    check_type=ComplianceCheckType.KYC,
                    status=ComplianceStatus.FAILED,
                    risk_level=RiskLevel.HIGH,
                    details={"error": "Entity profile not found"},
                    notes="Entity profile must be created before KYC check",
                )

            # Check required documents
            required_docs = self.required_documents.get(profile.entity_type, [])
            provided_docs = [
                doc.get("type") for doc in profile.identification_documents
            ]
            missing_docs = [doc for doc in required_docs if doc not in provided_docs]

            # Assess risk level
            risk_level = self._assess_kyc_risk(profile, missing_docs)

            # Determine status
            if missing_docs:
                status = ComplianceStatus.FAILED
            elif risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
                status = ComplianceStatus.REQUIRES_REVIEW
            else:
                status = ComplianceStatus.PASSED

            check = ComplianceCheck(
                check_id=check_id,
                entity_id=entity_id,
                check_type=ComplianceCheckType.KYC,
                status=status,
                risk_level=risk_level,
                details={
                    "required_documents": required_docs,
                    "provided_documents": provided_docs,
                    "missing_documents": missing_docs,
                    "risk_factors": profile.risk_factors,
                },
                expires_at=datetime.now().replace(year=datetime.now().year + 1),
            )

            self.db.save_compliance_check(check)
            return check

        except Exception as e:
            logger.error(f"Error performing KYC check for {entity_id}: {e}")
            return ComplianceCheck(
                check_id=check_id,
                entity_id=entity_id,
                check_type=ComplianceCheckType.KYC,
                status=ComplianceStatus.FAILED,
                risk_level=RiskLevel.HIGH,
                details={"error": str(e)},
            )

    def _assess_kyc_risk(
        self, profile: EntityProfile, missing_docs: List[str]
    ) -> RiskLevel:
        """Assess KYC risk level"""
        risk_score = 0

        # Missing documents
        risk_score += len(missing_docs) * 20

        # High-risk countries (simplified list)
        high_risk_countries = ["AF", "IR", "KP", "SY"]
        if profile.country_of_residence in high_risk_countries:
            risk_score += 30

        # Risk factors
        risk_score += len(profile.risk_factors) * 10

        # Determine risk level
        if risk_score >= 70:
            return RiskLevel.CRITICAL
        elif risk_score >= 50:
            return RiskLevel.HIGH
        elif risk_score >= 30:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW


class AMLService:
    """Anti-Money Laundering (AML) service"""

    #

    def __init__(self, db: ComplianceDatabase):
        self.db = db
        self.monitoring_rules = {
            "large_cash_transaction": {"threshold": 10000, "currency": "USD"},
            "rapid_succession": {"count": 5, "timeframe_hours": 24},
            "round_amounts": {"pattern": r"0{3,}$"},
            "high_risk_country": ["AF", "IR", "KP", "SY"],
            "structuring": {"threshold": 9000, "count": 3, "timeframe_days": 7},
        }

    def monitor_transaction(
        self, transaction_data: Dict[str, Any]
    ) -> TransactionMonitoring:
        """Monitor transaction for AML compliance"""
        try:
            monitoring = TransactionMonitoring(
                transaction_id=transaction_data["transaction_id"],
                entity_id=transaction_data["entity_id"],
                amount=Decimal(str(transaction_data["amount"])),
                currency=transaction_data.get("currency", "USD"),
                transaction_type=transaction_data["transaction_type"],
                counterparty_id=transaction_data.get("counterparty_id"),
                origin_country=transaction_data["origin_country"],
                destination_country=transaction_data["destination_country"],
                risk_score=0.0,
            )

            self._apply_monitoring_rules(monitoring)
            self._save_transaction_monitoring(monitoring)
            return monitoring

        except Exception as e:
            logger.error(
                f"Error monitoring transaction {transaction_data.get('transaction_id')}: {e}"
            )
            raise

    def _apply_monitoring_rules(self, monitoring: TransactionMonitoring):
        """Apply AML monitoring rules"""
        # Large cash transaction rule
        if (
            monitoring.amount
            >= self.monitoring_rules["large_cash_transaction"]["threshold"]
        ):
            monitoring.flags.append("large_cash_transaction")
            monitoring.monitoring_rules_triggered.append("large_cash_transaction")
            monitoring.risk_score += 25

        # High-risk country rule
        if (
            monitoring.origin_country in self.monitoring_rules["high_risk_country"]
            or monitoring.destination_country
            in self.monitoring_rules["high_risk_country"]
        ):
            monitoring.flags.append("high_risk_country")
            monitoring.monitoring_rules_triggered.append("high_risk_country")
            monitoring.risk_score += 30

        # Round amounts (potential structuring)
        amount_str = str(monitoring.amount)
        if amount_str.endswith("000") and len(amount_str) >= 5:
            monitoring.flags.append("round_amounts")
            monitoring.monitoring_rules_triggered.append("round_amounts")
            monitoring.risk_score += 15

    def _save_transaction_monitoring(self, monitoring: TransactionMonitoring):
        """Save transaction monitoring record"""
        try:
            conn = sqlite3.connect(self.db.db_path)
            cursor = conn.cursor()

            cursor.execute(
                """
                INSERT INTO transaction_monitoring
                (transaction_id, entity_id, amount, currency, transaction_type,
                 counterparty_id, origin_country, destination_country, risk_score,
                 flags, monitoring_rules_triggered, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    monitoring.transaction_id,
                    monitoring.entity_id,
                    float(monitoring.amount),
                    monitoring.currency,
                    monitoring.transaction_type,
                    monitoring.counterparty_id,
                    monitoring.origin_country,
                    monitoring.destination_country,
                    monitoring.risk_score,
                    json.dumps(monitoring.flags),
                    json.dumps(monitoring.monitoring_rules_triggered),
                    monitoring.timestamp.isoformat(),
                ),
            )

            conn.commit()
            conn.close()

        except Exception as e:
            logger.error(f"Error saving transaction monitoring: {e}")


class FATCAService:
    """Foreign Account Tax Compliance Act (FATCA) service"""

    def __init__(self, db: ComplianceDatabase):
        self.db = db
        self.us_indicators = [
            "us_place_of_birth",
            "us_citizenship",
            "us_residence",
            "us_phone_number",
            "us_address",
            "power_of_attorney_us_person",
            "in_care_of_us_address",
        ]

    def check_us_person_status(self, entity_id: str) -> ComplianceCheck:
        """Check if entity is a US person for FATCA purposes"""
        check_id = f"fatca_{entity_id}_{int(datetime.now().timestamp())}"

        try:
            profile = self.db.get_entity_profile(entity_id)
            if not profile:
                return ComplianceCheck(
                    check_id=check_id,
                    entity_id=entity_id,
                    check_type=ComplianceCheckType.FATCA,
                    status=ComplianceStatus.FAILED,
                    risk_level=RiskLevel.HIGH,
                    details={"error": "Entity profile not found"},
                )

            # Check for US person indicators
            us_indicators_found = []

            if profile.nationality == "US":
                us_indicators_found.append("us_citizenship")

            if profile.country_of_residence == "US":
                us_indicators_found.append("us_residence")

            if profile.address.get("country") == "US":
                us_indicators_found.append("us_address")

            is_us_person = len(us_indicators_found) > 0

            check = ComplianceCheck(
                check_id=check_id,
                entity_id=entity_id,
                check_type=ComplianceCheckType.FATCA,
                status=(
                    ComplianceStatus.PASSED if is_us_person else ComplianceStatus.PASSED
                ),
                risk_level=RiskLevel.MEDIUM if is_us_person else RiskLevel.LOW,
                details={
                    "is_us_person": is_us_person,
                    "us_indicators_found": us_indicators_found,
                    "requires_reporting": is_us_person,
                },
            )

            self.db.save_compliance_check(check)
            return check

        except Exception as e:
            logger.error(f"Error checking FATCA status for {entity_id}: {e}")
            return ComplianceCheck(
                check_id=check_id,
                entity_id=entity_id,
                check_type=ComplianceCheckType.FATCA,
                status=ComplianceStatus.FAILED,
                risk_level=RiskLevel.HIGH,
                details={"error": str(e)},
            )


class DataResidencyService:
    """Data residency compliance service"""

    def __init__(self, db: ComplianceDatabase):
        self.db = db
        self.data_residency_rules = {
            "EU": {
                "countries": [
                    "AT",
                    "BE",
                    "BG",
                    "HR",
                    "CY",
                    "CZ",
                    "DK",
                    "EE",
                    "FI",
                    "FR",
                    "DE",
                    "GR",
                    "HU",
                    "IE",
                    "IT",
                    "LV",
                    "LT",
                    "LU",
                    "MT",
                    "NL",
                    "PL",
                    "PT",
                    "RO",
                    "SK",
                    "SI",
                    "ES",
                    "SE",
                ],
                "requirements": ["gdpr_compliance", "eu_data_centers"],
                "restrictions": ["no_us_data_transfer_without_adequacy"],
            },
            "US": {
                "countries": ["US"],
                "requirements": ["patriot_act_compliance"],
                "restrictions": [],
            },
            "CA": {
                "countries": ["CA"],
                "requirements": ["pipeda_compliance"],
                "restrictions": ["canadian_data_centers_preferred"],
            },
        }

    def check_data_residency_compliance(
        self, entity_id: str, data_location: str
    ) -> ComplianceCheck:
        """Check data residency compliance"""
        check_id = f"data_residency_{entity_id}_{int(datetime.now().timestamp())}"

        try:
            compliance_issues = []
            requirements = []

            # Check if data location meets residency requirements
            for region, rules in self.data_residency_rules.items():
                if data_location in rules["countries"]:
                    requirements.extend(rules["requirements"])
                    # Deep logic to check cross-border transfers would go here
                    break

            status = (
                ComplianceStatus.PASSED
                if not compliance_issues
                else ComplianceStatus.REQUIRES_REVIEW
            )

            check = ComplianceCheck(
                check_id=check_id,
                entity_id=entity_id,
                check_type=ComplianceCheckType.DATA_RESIDENCY,
                status=status,
                risk_level=(
                    RiskLevel.LOW
                    if status == ComplianceStatus.PASSED
                    else RiskLevel.MEDIUM
                ),
                details={
                    "data_location": data_location,
                    "requirements": requirements,
                    "compliance_issues": compliance_issues,
                },
            )

            self.db.save_compliance_check(check)
            return check

        except Exception as e:
            logger.error(
                f"Error checking data residency compliance for {entity_id}: {e}"
            )
            return ComplianceCheck(
                check_id=check_id,
                entity_id=entity_id,
                check_type=ComplianceCheckType.DATA_RESIDENCY,
                status=ComplianceStatus.FAILED,
                risk_level=RiskLevel.HIGH,
                details={"error": str(e)},
            )


class InternationalComplianceManager:
    """Main manager for international compliance features"""

    def __init__(self, db_path: str = "compliance.db"):
        self.db = ComplianceDatabase(db_path)
        self.kyc_service = KYCService(self.db)
        self.aml_service = AMLService(self.db)
        self.fatca_service = FATCAService(self.db)
        self.data_residency_service = DataResidencyService(self.db)

    def create_entity_profile(self, profile_data: Dict[str, Any]) -> EntityProfile:
        """Create a new entity profile"""
        profile = EntityProfile(
            entity_id=profile_data["entity_id"],
            entity_type=profile_data["entity_type"],
            full_name=profile_data["full_name"],
            date_of_birth=(
                date.fromisoformat(profile_data["date_of_birth"])
                if profile_data.get("date_of_birth")
                else None
            ),
            nationality=profile_data.get("nationality"),
            country_of_residence=profile_data.get("country_of_residence", ""),
            address=profile_data.get("address", {}),
            identification_documents=profile_data.get("identification_documents", []),
            business_activities=profile_data.get("business_activities", []),
            source_of_funds=profile_data.get("source_of_funds", ""),
            expected_transaction_volume=(
                Decimal(str(profile_data["expected_transaction_volume"]))
                if profile_data.get("expected_transaction_volume")
                else None
            ),
            risk_factors=profile_data.get("risk_factors", []),
            compliance_flags=profile_data.get("compliance_flags", []),
        )

        self.db.save_entity_profile(profile)
        return profile

    def perform_comprehensive_compliance_check(
        self, entity_id: str
    ) -> Dict[str, ComplianceCheck]:
        """Perform all applicable compliance checks for an entity"""
        results = {}

        # KYC Check
        results["kyc"] = self.kyc_service.perform_kyc_check(entity_id)

        # FATCA Check
        results["fatca"] = self.fatca_service.check_us_person_status(entity_id)

        # Data Residency Check (assuming US data center as system default)
        results["data_residency"] = (
            self.data_residency_service.check_data_residency_compliance(entity_id, "US")
        )

        return results

    def get_compliance_status(self, entity_id: str) -> Dict[str, Any]:
        """Get overall compliance status for an entity"""
        try:
            conn = sqlite3.connect(self.db.db_path)
            cursor = conn.cursor()

            # Retrieve all checks for the entity, ordered by date to get the latest
            cursor.execute(
                """
                SELECT check_type, status, risk_level, performed_at, expires_at
                FROM compliance_checks
                WHERE entity_id = ?
                ORDER BY performed_at DESC
            """,
                (entity_id,),
            )

            checks = cursor.fetchall()
            conn.close()

            status_summary = {}
            overall_risk = RiskLevel.LOW

            # Process checks, only storing the latest result per check type
            for check in checks:
                check_type = check[0]
                if check_type not in status_summary:
                    status_summary[check_type] = {
                        "status": check[1],
                        "risk_level": check[2],
                        "last_checked": check[3],
                        "expires_at": check[4],
                    }

                    # Update overall risk level based on the latest checks
                    current_risk = RiskLevel(check[2])
                    if current_risk.name == "CRITICAL":
                        overall_risk = RiskLevel.CRITICAL
                    elif (
                        current_risk.name == "HIGH"
                        and overall_risk != RiskLevel.CRITICAL
                    ):
                        overall_risk = RiskLevel.HIGH
                    elif (
                        current_risk.name == "MEDIUM" and overall_risk == RiskLevel.LOW
                    ):
                        overall_risk = RiskLevel.MEDIUM

            return {
                "entity_id": entity_id,
                "overall_risk_level": overall_risk.value,
                "compliance_checks": status_summary,
                "last_updated": datetime.now().isoformat(),
            }

        except Exception as e:
            logger.error(f"Error getting compliance status for {entity_id}: {e}")
            return {"error": str(e)}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    # Clean up old database file for repeatable example
    db_file = Path("compliance.db")
    if db_file.exists():
        db_file.unlink()

    # Example usage
    compliance_manager = InternationalComplianceManager()

    # 1. Create sample entity profile
    profile_data = {
        "entity_id": "test_entity_001",
        "entity_type": "individual",
        "full_name": "John Doe",
        "date_of_birth": "1990-01-01",
        "nationality": "US",  # Will trigger FATCA check
        "country_of_residence": "US",
        "address": {
            "street": "123 Main St",
            "city": "New York",
            "country": "US",
            "postal_code": "10001",
        },
        "identification_documents": [
            {"type": "government_id", "number": "123456789", "expiry": "2030-01-01"},
            {"type": "proof_of_address", "type": "utility_bill", "date": "2023-01-01"},
        ],
        "business_activities": ["consulting"],
        "expected_transaction_volume": 50000.00,
        "risk_factors": [],
    }

    print("--- Creating Entity Profile ---")
    profile = compliance_manager.create_entity_profile(profile_data)
    print(f"Profile created for: {profile.full_name} ({profile.entity_id})")

    # 2. Perform Compliance Checks
    print("\n--- Performing Compliance Checks ---")
    checks = compliance_manager.perform_comprehensive_compliance_check(
        "test_entity_001"
    )
    for check_type, result in checks.items():
        print(
            f"Check: {check_type.upper()} | Status: {result.status.value} | Risk: {result.risk_level.value}"
        )
        if check_type == "fatca":
            print(f"  > FATCA Details: {result.details}")

    # 3. Simulate Transaction (AML Monitoring)
    print("\n--- Simulating Transaction (AML) ---")
    transaction_data = {
        "transaction_id": "tx_001",
        "entity_id": "test_entity_001",
        "amount": 15000.00,  # Over 10k threshold
        "currency": "USD",
        "transaction_type": "wire_transfer",
        "origin_country": "US",
        "destination_country": "US",
        "counterparty_id": "corp_999",
    }

    aml_result = compliance_manager.aml_service.monitor_transaction(transaction_data)
    print(f"Transaction ID: {aml_result.transaction_id}")
    print(f"Risk Score: {aml_result.risk_score}")
    print(f"Flags: {aml_result.flags}")
    print(f"Rules Triggered: {aml_result.monitoring_rules_triggered}")

    # 4. Get Final Consolidated Status
    print("\n--- Final Consolidated Entity Status ---")
    status_report = compliance_manager.get_compliance_status("test_entity_001")
    print(json.dumps(status_report, indent=2))
