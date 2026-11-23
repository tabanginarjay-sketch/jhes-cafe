"""
Thread-safe sliding-window rate limiting middleware for Jhe's Cafe' API.

Protects against:
- Brute-force attacks on authentication/registration (/api/v1/users)
- Spam order creation (/api/v1/orders)
- Depleting Airtable's 5 requests/second rate limit
"""

import time
from collections import defaultdict
from dataclasses import dataclass, field
import threading
from typing import Dict, List, Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse


@dataclass
class RateLimitRule:
    """Defines request limit per sliding time window in seconds."""
    max_requests: int
    window_seconds: int


class RateLimiter:
    """In-memory sliding window rate limiter."""

    def __init__(self):
        self._lock = threading.Lock()
        # client_ip -> list of epoch timestamps
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self.throttled_total = 0

    def is_allowed(self, client_id: str, rule: RateLimitRule) -> tuple[bool, int, int]:
        """
        Check if request is permitted under sliding window.
        Returns (is_allowed, remaining_requests, retry_after_seconds).
        """
        now = time.time()
        window_start = now - rule.window_seconds

        with self._lock:
            # Clean expired timestamps outside current window
            timestamps = [ts for ts in self._requests[client_id] if ts > window_start]
            self._requests[client_id] = timestamps

            if len(timestamps) >= rule.max_requests:
                self.throttled_total += 1
                earliest = timestamps[0]
                retry_after = max(1, int(earliest + rule.window_seconds - now))
                return False, 0, retry_after

            # Record this request
            timestamps.append(now)
            remaining = max(0, rule.max_requests - len(timestamps))
            return True, remaining, 0

    def get_stats(self) -> dict:
        """Return rate limiter statistics for diagnostics."""
        with self._lock:
            active_clients = len(self._requests)
            return {
                "active_tracked_ips": active_clients,
                "total_throttled_requests": self.throttled_total,
                "status": "active",
            }

    def reset(self):
        """Reset all tracked state (useful for test suites)."""
        with self._lock:
            self._requests.clear()
            self.throttled_total = 0


# Global singleton instance
rate_limiter = RateLimiter()

# Default rules
RULE_DEFAULT = RateLimitRule(max_requests=120, window_seconds=60)      # 120 req/min for general reads
RULE_SENSITIVE = RateLimitRule(max_requests=30, window_seconds=60)     # 30 req/min for auth and checkout


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware applying sliding window rate limits.
    Distinguishes sensitive endpoints (users/register, orders) from public read endpoints.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Skip health endpoints and swagger docs from rate limits
        path = request.url.path
        if path.startswith(("/docs", "/redoc", "/openapi.json")) or "/health" in path:
            return await call_next(request)

        # Determine client identifier (support proxy headers)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        elif request.client and request.client.host:
            client_ip = request.client.host
        else:
            client_ip = "127.0.0.1"

        # Apply appropriate rule based on path
        is_sensitive = any(s in path for s in ("/users", "/orders", "/payments"))
        rule = RULE_SENSITIVE if is_sensitive else RULE_DEFAULT
        client_key = f"{client_ip}:{ 'sensitive' if is_sensitive else 'standard' }"

        allowed, remaining, retry_after = rate_limiter.is_allowed(client_key, rule)

        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "status": "error",
                    "code": 429,
                    "title": "Too Many Requests",
                    "detail": "Rate limit exceeded. Please wait before retrying.",
                    "retry_after_seconds": retry_after,
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(rule.max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(retry_after),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(rule.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
