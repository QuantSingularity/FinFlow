import logging
import os as _os

# Corrected imports
# BUG FIX: Bare module name only resolves when CWD is tax_automation/.
# Use sys.path insertion to make imports robust from any working directory.
import sys as _sys
from datetime import datetime
from decimal import Decimal
from typing import Dict

from flask import Flask, jsonify, request
from flask_cors import CORS

_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
from tax_calculation_engine import (
    TaxCalculationEngine,
    TaxProfile,
    TaxType,
    Transaction,
)
from tax_rule_management import (  # resolved via sys.path above
    SAMPLE_TAX_RULES,
    TaxRuleManager,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global instances
tax_engine: TaxCalculationEngine = None
rule_manager: TaxRuleManager = None


def init_tax_system():
    """Initialize the tax system with sample data"""
    global tax_engine, rule_manager

    try:
        # Initialize rule manager (Assumes it handles its own persistence/DB connection)
        rule_manager = TaxRuleManager()

        # Import sample rules if database is empty
        # Assumes rule_manager.db.get_active_tax_rules() is available
        existing_rules = rule_manager.db.get_active_tax_rules()
        if not existing_rules:
            logger.info("Importing sample tax rules...")
            for rule_data in SAMPLE_TAX_RULES:
                rule_manager.create_tax_rule(rule_data, "system_init")

        # Initialize tax engine
        tax_engine = TaxCalculationEngine()

        # Load active rules into the engine
        active_rules = rule_manager.db.get_active_tax_rules()
        for rule in active_rules:
            tax_engine.add_tax_rule(rule)

        logger.info(f"Tax system initialized with {len(active_rules)} active rules")

    except Exception as e:
        logger.error(f"FATAL ERROR during system initialization: {e}")
        # Keep globals as None if initialization fails
        tax_engine = None
        rule_manager = None


@app.route("/health", methods=["GET"])
def health_check() -> Dict[str, str]:
    """Health check endpoint"""
    status = "healthy" if tax_engine and rule_manager else "degraded"
    return jsonify(
        {
            "status": status,
            "timestamp": datetime.now().isoformat(),
            "service": "tax-automation-api",
            "details": (
                "Engine or Rule Manager not initialized"
                if status == "degraded"
                else None
            ),
        }
    )


@app.route("/api/tax/calculate", methods=["POST"])
def calculate_tax():
    """Calculate tax for a transaction"""
    try:
        if tax_engine is None or rule_manager is None:
            return jsonify({"error": "Tax system not fully initialized"}), 503

        data = request.get_json()

        # Validate required fields
        required_fields = [
            "transaction_id",
            "amount",
            "transaction_type",
            "origin_jurisdiction",
            "destination_jurisdiction",
            "payer_entity_id",
            "payee_entity_id",
        ]

        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Create transaction object
        transaction = Transaction(
            transaction_id=data["transaction_id"],
            # Ensure Decimal conversion handles string input safely
            amount=Decimal(str(data["amount"])),
            transaction_type=data["transaction_type"],
            origin_jurisdiction=data["origin_jurisdiction"],
            destination_jurisdiction=data["destination_jurisdiction"],
            product_service_code=data.get("product_service_code"),
            timestamp=datetime.fromisoformat(
                data.get("timestamp", datetime.now().isoformat())
            ),
            payer_entity_id=data["payer_entity_id"],
            payee_entity_id=data["payee_entity_id"],
            additional_data=data.get("additional_data", {}),
        )

        # Validate transaction
        validation_errors = tax_engine.validate_transaction(transaction)
        if validation_errors:
            return (
                jsonify(
                    {
                        "error": "Transaction validation failed",
                        "details": validation_errors,
                    }
                ),
                400,
            )

        # Calculate taxes (Assumes tax_engine returns a result object)
        result = tax_engine.calculate_taxes(transaction)

        # Convert result to JSON-serializable format
        response = {
            "transaction_id": result.transaction_id,
            # Convert Decimal to float for JSON serialization
            "total_tax_amount": float(result.total_tax_amount),
            "tax_breakdown": result.tax_breakdown,
            "applied_rules": result.applied_rules,
            "calculation_timestamp": result.calculation_timestamp.isoformat(),
            "errors": result.errors,
            "warnings": result.warnings,
        }

        return jsonify(response)

    except Exception as e:
        logger.error(f"Error calculating tax: {e}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@app.route("/api/tax/profile", methods=["POST"])
def create_tax_profile():
    """Create or update a tax profile"""
    try:
        if tax_engine is None:
            return jsonify({"error": "Tax engine not initialized"}), 503

        data = request.get_json()

        # Validate required fields
        required_fields = ["entity_id", "tax_residency"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Create tax profile (Assumes TaxProfile handles entity data)
        tax_profile = TaxProfile(
            entity_id=data["entity_id"],
            tax_identification_number=data.get("tax_identification_number"),
            tax_residency=data["tax_residency"],
            exemptions=data.get("exemptions", []),
            entity_type=data.get("entity_type", "individual"),
            additional_data=data.get("additional_data", {}),
        )

        # Add to tax engine (Assumes it stores or updates the profile)
        tax_engine.add_tax_profile(tax_profile)

        return (
            jsonify(
                {
                    "message": "Tax profile created successfully",
                    "entity_id": tax_profile.entity_id,
                }
            ),
            201,
        )

    except Exception as e:
        logger.error(f"Error creating tax profile: {e}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@app.route("/api/tax/profile/<entity_id>", methods=["GET"])
def get_tax_profile(entity_id):
    """Get a tax profile by entity ID"""
    try:
        if tax_engine is None:
            return jsonify({"error": "Tax engine not initialized"}), 503

        # Assumes tax_engine stores profiles in a dict called tax_profiles
        tax_profile = tax_engine.tax_profiles.get(entity_id)
        if not tax_profile:
            return jsonify({"error": "Tax profile not found"}), 404

        response = {
            "entity_id": tax_profile.entity_id,
            "tax_identification_number": tax_profile.tax_identification_number,
            "tax_residency": tax_profile.tax_residency,
            "exemptions": tax_profile.exemptions,
            "entity_type": tax_profile.entity_type,
            "additional_data": tax_profile.additional_data,
        }

        return jsonify(response)

    except Exception as e:
        logger.error(f"Error getting tax profile: {e}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@app.route("/api/tax/rules", methods=["GET"])
def get_tax_rules():
    """Get tax rules with optional filtering"""
    try:
        if rule_manager is None:
            return jsonify({"error": "Tax rule manager not initialized"}), 503

        jurisdiction = request.args.get("jurisdiction")
        tax_type = request.args.get("tax_type")

        if jurisdiction:
            # Assumes rule_manager can filter rules by jurisdiction
            rules = rule_manager.get_applicable_rules(jurisdiction)
        else:
            # Assumes rule_manager.db.get_active_tax_rules() returns all active rules
            rules = rule_manager.db.get_active_tax_rules()

        if tax_type:
            try:
                # Filter by TaxType enum value
                tax_type_enum = TaxType(tax_type)
                rules = [rule for rule in rules if rule.tax_type == tax_type_enum]
            except ValueError:
                return jsonify({"error": f"Invalid tax type: {tax_type}"}), 400

        # Convert rules to JSON-serializable format
        rules_data = []
        for rule in rules:
            rule_data = {
                "rule_id": rule.rule_id,
                "jurisdiction": rule.jurisdiction,
                "tax_type": rule.tax_type.value,
                "effective_date": rule.effective_date.isoformat(),
                "expiration_date": (
                    rule.expiration_date.isoformat() if rule.expiration_date else None
                ),
                # Convert Decimal to float for JSON serialization
                "rate": float(rule.rate),
                "calculation_method": rule.calculation_method.value,
                "conditions": rule.conditions,
                "description": rule.description,
            }
            rules_data.append(rule_data)

        return jsonify({"rules": rules_data, "count": len(rules_data)})

    except Exception as e:
        logger.error(f"Error getting tax rules: {e}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@app.route("/api/tax/rules", methods=["POST"])
def create_tax_rule():
    """Create a new tax rule"""
    try:
        if rule_manager is None or tax_engine is None:
            return jsonify({"error": "Tax system not fully initialized"}), 503

        data = request.get_json()

        # Validate required fields
        required_fields = [
            "rule_id",
            "jurisdiction",
            "tax_type",
            "effective_date",
            "rate",
            "calculation_method",
        ]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Create tax rule (Assumes rule_manager handles saving to DB)
        rule = rule_manager.create_tax_rule(data, "api_user")
        if not rule:
            return jsonify({"error": "Failed to create tax rule (check data/DB)"}), 500

        # Add to tax engine (Makes it instantly effective for calculations)
        tax_engine.add_tax_rule(rule)

        return (
            jsonify(
                {"message": "Tax rule created successfully", "rule_id": rule.rule_id}
            ),
            201,
        )

    except Exception as e:
        logger.error(f"Error creating tax rule: {e}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@app.route("/api/tax/rules/<rule_id>", methods=["PUT"])
def update_tax_rule(rule_id):
    """Update an existing tax rule"""
    try:
        if rule_manager is None or tax_engine is None:
            return jsonify({"error": "Tax system not fully initialized"}), 503

        data = request.get_json()

        # Update the rule in the rule manager (and persistence layer)
        success = rule_manager.update_tax_rule(rule_id, data, "api_user")
        if not success:
            return (
                jsonify(
                    {"error": "Failed to update tax rule (rule not found or DB error)"}
                ),
                404,
            )

        # Reload rules in tax engine to ensure the update is active immediately
        # OPTIMIZATION: A more efficient engine might only update the single rule.
        # Here we re-load all active rules to ensure consistency.
        tax_engine.tax_rules.clear()
        active_rules = rule_manager.db.get_active_tax_rules()
        for rule in active_rules:
            tax_engine.add_tax_rule(rule)

        return jsonify({"message": "Tax rule updated successfully", "rule_id": rule_id})

    except Exception as e:
        logger.error(f"Error updating tax rule: {e}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@app.route("/api/tax/rules/<rule_id>", methods=["DELETE"])
def deactivate_tax_rule(rule_id):
    """Deactivate a tax rule"""
    try:
        if rule_manager is None or tax_engine is None:
            return jsonify({"error": "Tax system not fully initialized"}), 503

        # Deactivate in rule manager (and persistence layer)
        success = rule_manager.db.deactivate_tax_rule(rule_id, "api_user")
        if not success:
            return (
                jsonify(
                    {
                        "error": "Failed to deactivate tax rule (rule not found or DB error)"
                    }
                ),
                404,
            )

        # Reload rules in tax engine to remove the deactivated rule
        tax_engine.tax_rules.clear()
        active_rules = rule_manager.db.get_active_tax_rules()
        for rule in active_rules:
            tax_engine.add_tax_rule(rule)

        return jsonify(
            {"message": "Tax rule deactivated successfully", "rule_id": rule_id}
        )

    except Exception as e:
        logger.error(f"Error deactivating tax rule: {e}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@app.route("/api/tax/jurisdictions", methods=["GET"])
def get_jurisdictions():
    """Get list of supported jurisdictions"""
    try:
        if rule_manager is None:
            return jsonify({"error": "Tax rule manager not initialized"}), 503

        rules = rule_manager.db.get_active_tax_rules()
        # Use a set comprehension for efficient unique collection
        jurisdictions = sorted(list(set(rule.jurisdiction for rule in rules)))

        return jsonify({"jurisdictions": jurisdictions, "count": len(jurisdictions)})

    except Exception as e:
        logger.error(f"Error getting jurisdictions: {e}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@app.route("/api/tax/types", methods=["GET"])
def get_tax_types():
    """Get list of supported tax types"""
    try:
        # Assuming TaxType is an iterable enum
        tax_types = [tax_type.value for tax_type in TaxType]

        return jsonify({"tax_types": tax_types, "count": len(tax_types)})

    except Exception as e:
        logger.error(f"Error getting tax types: {e}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    # Initialize the tax system
    init_tax_system()

    # BUG FIX: debug=True enables the interactive Werkzeug debugger which exposes
    # an RCE vulnerability in any environment and leaks full stack traces to clients.
    # Use the DEBUG environment variable to control this safely.
    import os

    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=debug_mode)
