"""
Airtable Web API core client and health check service.

Handles async HTTP requests to Airtable REST API (v0), persistent connection pooling,
rate-limiting retries, typecasting, error handling, and connectivity diagnostics.
"""

import asyncio
import logging
import time
from typing import Any, Optional
import httpx

from app.core.config import settings

logger = logging.getLogger("airtable")


# ==================== EXCEPTIONS ====================

class AirtableError(Exception):
    """Base exception for Airtable operations."""

    def __init__(self, message: str, status_code: Optional[int] = None, detail: Any = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.detail = detail


class AirtableConfigError(AirtableError):
    """Raised when required Airtable credentials are not configured."""
    pass


class AirtableAuthError(AirtableError):
    """Raised when authentication with Airtable fails (401/403)."""
    pass


class AirtableNotFoundError(AirtableError):
    """Raised when a table or record is not found (404)."""
    pass


class AirtableValidationError(AirtableError):
    """Raised when Airtable rejects payload structure or types (422)."""
    pass


class AirtableRateLimitError(AirtableError):
    """Raised when Airtable rate limits (429) persist beyond retry allowance."""
    pass


# ==================== CONNECTION POOLING ====================

_shared_http_client: Optional[httpx.AsyncClient] = None


def get_shared_client(timeout: float = 15.0) -> httpx.AsyncClient:
    """
    Returns a pooled, persistent httpx.AsyncClient with keep-alive connections.
    Drastically reduces SSL handshake overhead and prevents socket exhaustion.
    """
    global _shared_http_client
    if _shared_http_client is None or _shared_http_client.is_closed:
        limits = httpx.Limits(
            max_keepalive_connections=20,
            max_connections=50,
            keepalive_expiry=30.0,
        )
        _shared_http_client = httpx.AsyncClient(limits=limits, timeout=timeout)
    return _shared_http_client


async def close_airtable_client() -> None:
    """Gracefully close HTTP connection pool on application shutdown."""
    global _shared_http_client
    if _shared_http_client is not None and not _shared_http_client.is_closed:
        await _shared_http_client.aclose()
        _shared_http_client = None


# ==================== AIRTABLE CLIENT ====================

class AirtableClient:
    """
    Asynchronous client for Airtable REST API.
    Leverages persistent connection pool and automatic 429 exponential backoff.
    """

    def __init__(
        self,
        pat: Optional[str] = None,
        base_id: Optional[str] = None,
        api_url: Optional[str] = None,
        timeout: float = 15.0,
    ):
        self.pat = pat if pat is not None else settings.AIRTABLE_PAT
        self.base_id = base_id if base_id is not None else settings.AIRTABLE_BASE_ID
        self.api_url = (api_url if api_url is not None else settings.AIRTABLE_API_URL).rstrip("/")
        self.timeout = timeout

    @property
    def is_configured(self) -> bool:
        """Verify whether PAT and Base ID are present."""
        return bool(
            self.pat
            and self.base_id
            and "YOUR_AIRTABLE_PAT" not in self.pat
            and "YOUR_BASE_ID" not in self.base_id
        )

    def _get_headers(self) -> dict[str, str]:
        if not self.is_configured:
            raise AirtableConfigError(
                "Airtable PAT or Base ID is missing. Configure AIRTABLE_PAT and AIRTABLE_BASE_ID."
            )
        return {
            "Authorization": f"Bearer {self.pat}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _table_url(self, table_name: str) -> str:
        return f"{self.api_url}/{self.base_id}/{table_name}"

    async def _request(
        self,
        method: str,
        url: str,
        params: Optional[dict[str, Any]] = None,
        json_data: Optional[dict[str, Any]] = None,
        max_retries: int = 3,
    ) -> dict[str, Any]:
        """Execute HTTP request using pooled client with automatic 429 rate limit backoff."""
        headers = self._get_headers()
        backoff_delay = 0.5
        client = get_shared_client(self.timeout)

        for attempt in range(1, max_retries + 1):
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    params=params,
                    json=json_data,
                )

                if response.status_code == 429:
                    if attempt < max_retries:
                        logger.warning(
                            f"Airtable rate limited (429). Retrying in {backoff_delay:.1f}s (attempt {attempt}/{max_retries})"
                        )
                        await asyncio.sleep(backoff_delay)
                        backoff_delay *= 2
                        continue
                    raise AirtableRateLimitError(
                        "Airtable rate limit exceeded (5 requests/second max).",
                        status_code=429,
                    )

                if response.status_code in (401, 403):
                    raise AirtableAuthError(
                        f"Airtable authentication failed: {response.text}",
                        status_code=response.status_code,
                    )

                if response.status_code == 404:
                    raise AirtableNotFoundError(
                        f"Airtable resource not found: {response.text}",
                        status_code=404,
                    )

                if response.status_code == 422:
                    raise AirtableValidationError(
                        f"Airtable invalid field data or schema mismatch: {response.text}",
                        status_code=422,
                        detail=response.text,
                    )

                if response.status_code >= 400:
                    raise AirtableError(
                        f"Airtable API error ({response.status_code}): {response.text}",
                        status_code=response.status_code,
                        detail=response.text,
                    )

                return response.json() if response.content else {}

            except (httpx.RequestError, httpx.TimeoutException) as exc:
                if attempt < max_retries:
                    await asyncio.sleep(backoff_delay)
                    backoff_delay *= 2
                    continue
                raise AirtableError(f"Network error connecting to Airtable: {exc}") from exc

        raise AirtableError("Airtable request failed after all retry attempts.")

    # ==================== CRUD OPERATIONS ====================

    async def list_records(
        self,
        table_name: str,
        filter_by_formula: Optional[str] = None,
        max_records: Optional[int] = None,
        page_size: int = 100,
        sort_by: Optional[list[dict[str, str]]] = None,
        view: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        """List and optionally paginate records from an Airtable table."""
        url = self._table_url(table_name)
        params: dict[str, Any] = {"pageSize": min(page_size, 100)}

        if filter_by_formula:
            params["filterByFormula"] = filter_by_formula
        if max_records:
            params["maxRecords"] = max_records
        if view:
            params["view"] = view
        if sort_by:
            for idx, item in enumerate(sort_by):
                params[f"sort[{idx}][field]"] = item.get("field")
                params[f"sort[{idx}][direction]"] = item.get("direction", "asc")

        records: list[dict[str, Any]] = []
        offset: Optional[str] = None

        while True:
            current_params = dict(params)
            if offset:
                current_params["offset"] = offset

            data = await self._request("GET", url, params=current_params)
            batch = data.get("records", [])
            records.extend(batch)

            offset = data.get("offset")
            if not offset or (max_records and len(records) >= max_records):
                break

        if max_records:
            records = records[:max_records]

        return records

    async def get_record(self, table_name: str, record_id: str) -> dict[str, Any]:
        """Fetch a single record by Airtable record ID (rec...)."""
        url = f"{self._table_url(table_name)}/{record_id}"
        return await self._request("GET", url)

    async def create_record(
        self,
        table_name: str,
        fields: dict[str, Any],
        typecast: bool = True,
    ) -> dict[str, Any]:
        """Create a single record in the specified table."""
        url = self._table_url(table_name)
        payload = {"fields": fields, "typecast": typecast}
        return await self._request("POST", url, json_data=payload)

    async def update_record(
        self,
        table_name: str,
        record_id: str,
        fields: dict[str, Any],
        typecast: bool = True,
    ) -> dict[str, Any]:
        """Partially update an existing record by record ID."""
        url = f"{self._table_url(table_name)}/{record_id}"
        payload = {"fields": fields, "typecast": typecast}
        return await self._request("PATCH", url, json_data=payload)

    async def delete_record(self, table_name: str, record_id: str) -> bool:
        """Delete a single record by record ID."""
        url = f"{self._table_url(table_name)}/{record_id}"
        result = await self._request("DELETE", url)
        return bool(result.get("deleted", False))


# Global default client instance
airtable_client = AirtableClient()


# ==================== HEALTH & LATENCY CHECK ====================

async def check_airtable_connection() -> dict[str, Any]:
    """
    Honest connectivity & latency check against Airtable API.
    Measures real network roundtrip time and returns clear diagnostics.
    """
    if not settings.is_airtable_configured:
        return {
            "status": "not_configured",
            "detail": "Configure AIRTABLE_PAT and AIRTABLE_BASE_ID in backend/.env.",
            "latency_ms": None,
        }

    client = AirtableClient()
    start_time = time.perf_counter()
    try:
        target_table = settings.AIRTABLE_TABLE_PRODUCTS or "Products"
        await client.list_records(target_table, max_records=1)
        latency_ms = round((time.perf_counter() - start_time) * 1000, 1)

        return {
            "status": "connected",
            "detail": f"Connected to Airtable base '{settings.AIRTABLE_BASE_ID}'.",
            "latency_ms": latency_ms,
        }
    except AirtableAuthError as exc:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 1)
        return {
            "status": "unauthorized",
            "detail": f"Airtable authentication error: {exc.message}",
            "latency_ms": latency_ms,
        }
    except AirtableNotFoundError:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 1)
        return {
            "status": "connected",
            "detail": f"Connected to Airtable base '{settings.AIRTABLE_BASE_ID}' (base is reachable).",
            "latency_ms": latency_ms,
        }
    except AirtableError as exc:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 1)
        return {
            "status": "unavailable",
            "detail": f"Could not reach Airtable API: {exc.message}",
            "latency_ms": latency_ms,
        }
    except Exception as exc:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 1)
        return {
            "status": "unavailable",
            "detail": f"Unexpected error checking Airtable: {exc}",
            "latency_ms": latency_ms,
        }
