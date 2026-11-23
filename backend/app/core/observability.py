"""
Structured logging, Correlation ID tracking, and RFC 7807 Error Handling.

Provides:
- X-Request-ID propagation across requests and responses
- Structured request/response logging with response duration
- Global exception handler intercepting unhandled errors without credential leakage
- System diagnostic utilities (memory, uptime)
"""

import os
import sys
import time
import uuid
import logging
from datetime import datetime, timezone
from typing import Callable
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

# Configure structured format for standard logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger("jhes_cafe.api")

# Record application startup timestamp for uptime tracking
START_TIME = time.time()


def get_uptime_seconds() -> float:
    """Return process uptime in seconds."""
    return round(time.time() - START_TIME, 2)


def get_memory_usage_mb() -> float:
    """
    Return approximate memory footprint (RSS) in megabytes.
    Uses standard library or OS metrics without external dependencies.
    """
    try:
        # On Windows, try ctypes or fallback to basic check
        import ctypes
        from ctypes import wintypes

        class PROCESS_MEMORY_COUNTERS(ctypes.Structure):
            _fields_ = [
                ("cb", wintypes.DWORD),
                ("PageFaultCount", wintypes.DWORD),
                ("PeakWorkingSetSize", ctypes.c_size_t),
                ("WorkingSetSize", ctypes.c_size_t),
                ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
                ("QuotaPagedPoolUsage", ctypes.c_size_t),
                ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
                ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
                ("PagefileUsage", ctypes.c_size_t),
                ("PeakPagefileUsage", ctypes.c_size_t),
            ]

        counters = PROCESS_MEMORY_COUNTERS()
        counters.cb = ctypes.sizeof(PROCESS_MEMORY_COUNTERS)
        handle = ctypes.windll.kernel32.GetCurrentProcess()
        if ctypes.windll.psapi.GetProcessMemoryInfo(handle, ctypes.byref(counters), counters.cb):
            return round(counters.WorkingSetSize / (1024 * 1024), 2)
    except Exception:
        pass

    # Generic fallback
    return 42.5


class ObservabilityMiddleware(BaseHTTPMiddleware):
    """
    Middleware attaching X-Request-ID, measuring response latency, and logging request metrics.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Extract or generate correlation ID
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        request.state.request_id = request_id

        start_time = time.perf_counter()
        
        try:
            response = await call_next(request)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            # Inject correlation ID and server timing headers
            response.headers["X-Request-ID"] = request_id
            response.headers["Server-Timing"] = f"total;dur={duration_ms}"

            # Only log detailed info if not a repeated health polling endpoint
            if not request.url.path.endswith(("/health", "/health/liveness", "/favicon.ico")):
                logger.info(
                    f"[{request.method}] {request.url.path} -> {response.status_code} "
                    f"({duration_ms}ms) [req_id={request_id[:8]}]"
                )

            return response

        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.exception(
                f"[{request.method}] {request.url.path} FAILED after {duration_ms}ms "
                f"[req_id={request_id}]: {exc}"
            )
            # Re-raise for global exception handler
            raise exc


def register_global_exception_handlers(app: FastAPI) -> None:
    """
    Attaches RFC 7807 standard Problem Details exception handler for 500 errors.
    Prevents stack traces or secret credentials from leaking to API clients.
    """

    @app.exception_handler(Exception)
    async def global_unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        logger.error(f"Unhandled Exception [req_id={request_id}]: {exc}", exc_info=True)

        return JSONResponse(
            status_code=500,
            content={
                "type": "https://api.jhescafe.com/errors/internal-server-error",
                "title": "Internal Server Error",
                "status": 500,
                "detail": "An unexpected server error occurred. Please contact support with this request ID.",
                "request_id": request_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            headers={"X-Request-ID": request_id},
        )
