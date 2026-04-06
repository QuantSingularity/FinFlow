import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../src"))

from typing import Any
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def mock_jwt_validation() -> Any:
    with patch(
        "main.get_current_user", return_value={"sub": "test-user", "role": "USER"}
    ):
        yield


def test_health_check() -> Any:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["service"] == "credit-engine"


def test_credit_score_low_risk() -> Any:
    test_data = {
        "income": 150000,
        "numInvoices": 50,
        "avgCashflow": 15000,
        "delinquencies": 0,
    }
    response = client.post("/score", json=test_data)
    assert response.status_code == 200
    data = response.json()
    assert "credit_score" in data
    assert "risk_category" in data
    assert "timestamp" in data
    assert 0.0 <= data["credit_score"] <= 1.0
    assert data["risk_category"] == "LOW_RISK"


def test_credit_score_high_risk() -> Any:
    test_data = {
        "income": 20000,
        "numInvoices": 5,
        "avgCashflow": 1000,
        "delinquencies": 5,
    }
    response = client.post("/score", json=test_data)
    assert response.status_code == 200
    data = response.json()
    assert data["risk_category"] == "HIGH_RISK"


def test_loan_offers_low_score() -> Any:
    response = client.get("/offers?score=0.3")
    assert response.status_code == 200
    data = response.json()
    assert len(data["offers"]) == 2


def test_loan_offers_high_score() -> Any:
    response = client.get("/offers?score=0.9")
    assert response.status_code == 200
    data = response.json()
    assert len(data["offers"]) == 3
    assert "credit_score" in data
    assert "offers" in data
    assert "timestamp" in data
    offer = data["offers"][0]
    assert "amount" in offer
    assert "interest_rate" in offer
    assert "term_months" in offer
    assert "monthly_payment" in offer


def test_gdpr_export() -> Any:
    response = client.get("/user/data")
    assert response.status_code == 200
    data = response.json()
    assert "user_id" == data["user_id"]
    assert "credit_scores" in data
    assert "loan_applications" in data


def test_gdpr_delete() -> Any:
    response = client.delete("/user/data")
    assert response.status_code == 204
    assert response.text == ""
