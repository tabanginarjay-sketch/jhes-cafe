"""Tests for AirtableClient error handling, retries, and operations."""

import pytest
from unittest.mock import AsyncMock, patch
import httpx

from app.core.airtable import (
    AirtableClient,
    AirtableConfigError,
    AirtableAuthError,
    AirtableNotFoundError,
    AirtableRateLimitError,
)


def test_airtable_client_unconfigured():
    client = AirtableClient(pat="", base_id="")
    assert not client.is_configured
    with pytest.raises(AirtableConfigError):
        client._get_headers()


def test_airtable_client_headers():
    client = AirtableClient(pat="patTestSecret", base_id="appTest123")
    assert client.is_configured
    headers = client._get_headers()
    assert headers["Authorization"] == "Bearer patTestSecret"
    assert headers["Content-Type"] == "application/json"


@pytest.mark.asyncio
async def test_airtable_client_list_records_success():
    client = AirtableClient(pat="patTest", base_id="appTest")
    mock_response = {
        "records": [
            {"id": "rec001", "createdTime": "2026-11-23T00:00:00.000Z", "fields": {"name": "Spanish Latte"}}
        ]
    }
    with patch.object(client, "_request", new_callable=AsyncMock) as mock_req:
        mock_req.return_value = mock_response
        records = await client.list_records("Products")
        assert len(records) == 1
        assert records[0]["fields"]["name"] == "Spanish Latte"


@pytest.mark.asyncio
async def test_airtable_client_handles_not_found():
    client = AirtableClient(pat="patTest", base_id="appTest")
    with patch("httpx.AsyncClient.request") as mock_http:
        mock_resp = httpx.Response(status_code=404, text="NOT_FOUND", request=httpx.Request("GET", "http://test"))
        mock_http.return_value = mock_resp
        with pytest.raises(AirtableNotFoundError):
            await client.get_record("Products", "recNonexistent")
