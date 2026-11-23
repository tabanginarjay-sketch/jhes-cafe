"""
Deep health check & diagnostic service for BREW & CO. API.

Provides:
- Liveness probe for container orchestrators (/health/liveness)
- Readiness probe for traffic routing (/health/readiness)
- Comprehensive system observability endpoint (/health) exposing:
  - Process uptime and memory footprint
  - Real-time Airtable roundtrip latency
  - In-memory cache hit ratio and metrics
  - Rate-limiter tracking status
"""

from datetime import datetime, timezone
from typing import Any, Optional
from fastapi import APIRouter, Response, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.airtable import check_airtable_connection
from app.core.cache import cache
from app.core.rate_limit import rate_limiter
from app.core.observability import get_memory_usage_mb, get_uptime_seconds

router = APIRouter(tags=["Health & Diagnostics"])


class DatabaseDiagnostics(BaseModel):
    status: str
    detail: str
    latency_ms: Optional[float] = None


class CacheDiagnostics(BaseModel):
    active_items: int
    hits: int
    misses: int
    total_queries: int
    hit_ratio_percent: float
    status: str


class RateLimitDiagnostics(BaseModel):
    active_tracked_ips: int
    total_throttled_requests: int
    status: str


class SystemDiagnostics(BaseModel):
    uptime_seconds: float
    memory_rss_mb: float
    environment: str


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    environment: str
    timestamp: str
    database: DatabaseDiagnostics
    system: SystemDiagnostics
    cache: CacheDiagnostics
    rate_limiter: RateLimitDiagnostics


@router.get("/health", response_model=HealthResponse, summary="Deep system & database health check")
async def get_deep_health() -> HealthResponse:
    """
    Returns deep health diagnostics across all 5 architectural pillars:
    - Survival: Uptime, Memory, Error handling
    - Speed: Cache stats and hit ratios
    - Traffic: Rate limiter stats
    - Security: Authenticated connectivity
    - Database: Live Airtable connectivity and latency
    """
    db_check = await check_airtable_connection()
    cache_stats = cache.get_stats()
    rate_stats = rate_limiter.get_stats()

    return HealthResponse(
        status="ok",
        service=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.APP_ENV,
        timestamp=datetime.now(timezone.utc).isoformat(),
        database=DatabaseDiagnostics(**db_check),
        system=SystemDiagnostics(
            uptime_seconds=get_uptime_seconds(),
            memory_rss_mb=get_memory_usage_mb(),
            environment=settings.APP_ENV,
        ),
        cache=CacheDiagnostics(**cache_stats),
        rate_limiter=RateLimitDiagnostics(**rate_stats),
    )


@router.get("/health/liveness", summary="Container liveness probe")
async def liveness_probe() -> dict[str, str]:
    """Lightweight check verifying the web server process is alive and accepting connections."""
    return {"status": "alive", "uptime": f"{get_uptime_seconds()}s"}


@router.get("/health/readiness", summary="Container readiness probe")
async def readiness_probe(response: Response) -> dict[str, Any]:
    """Probe verifying the service is ready to accept production traffic."""
    db_check = await check_airtable_connection()
    if db_check.get("status") not in ("connected", "not_configured"):
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "not_ready", "database": db_check}
    return {"status": "ready", "database": db_check.get("status")}
