"""Tests for supplier endpoints."""

from fastapi.testclient import TestClient


def test_create_supplier(client: TestClient):
    """Test creating a new supplier."""
    response = client.post(
        "/api/v1/suppliers",
        json={"name": "ACME Foods"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "ACME Foods"
    assert "id" in data


def test_list_suppliers(client: TestClient):
    """Test listing suppliers."""
    # Create two suppliers
    client.post(
        "/api/v1/suppliers",
        json={"name": "Fresh Farms"},
    )
    client.post(
        "/api/v1/suppliers",
        json={"name": "Local Produce Co"},
    )

    response = client.get("/api/v1/suppliers")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
