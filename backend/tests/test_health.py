"""Tests for /api/v1/health endpoint and Airtable status reporting."""

import pytest
from unittest.mock import AsyncMock, patch
from app.core.config import settings


@pytest.mark.asyncio
async def test_health_not_configured(client, monkeypatch):
    """When credentials are empty or placeholders, health check reports not_configured honestly."""
    monkeypatch.setattr(settings, "AIRTABLE_PAT", "")
    monkeypatch.setattr(settings, "AIRTABLE_BASE_ID", "")
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "service" in data
    assert data["database"]["status"] == "not_configured"
    assert "AIRTABLE_PAT" in data["database"]["detail"]


@pytest.mark.asyncio
async def test_health_connected_mock(client):
    """When Airtable is reached successfully, status reports connected."""
    mock_check = {
        "status": "connected",
        "detail": "Connected to Airtable base 'appTest123'.",
    }
    with patch("app.api.v1.health.check_airtable_connection", new_callable=AsyncMock) as mock_func:
        mock_func.return_value = mock_check
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["database"]["status"] == "connected"
        assert "appTest123" in data["database"]["detail"]


@pytest.mark.asyncio
async def test_health_unauthorized_mock(client):
    """When Airtable PAT is rejected, status reports unauthorized."""
    mock_check = {
        "status": "unauthorized",
        "detail": "Airtable authentication error: Invalid PAT",
    }
    with patch("app.api.v1.health.check_airtable_connection", new_callable=AsyncMock) as mock_func:
        mock_func.return_value = mock_check
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["database"]["status"] == "unauthorized"
