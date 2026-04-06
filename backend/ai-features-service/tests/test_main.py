import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../src"))

from main import create_app

app = create_app()
client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ai-features-service"
    assert "timestamp" in data


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "FinFlow AI Features Service"
    assert data["version"] == "1.0.0"
    assert data["status"] == "running"
    assert "health" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
