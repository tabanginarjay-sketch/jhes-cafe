"""
Security headers and defense-in-depth middleware for BREW & CO. API.

Adds essential HTTP security headers recommended by OWASP to mitigate:
- Clickjacking (X-Frame-Options)
- MIME-type sniffing (X-Content-Type-Options)
- Cross-Site Scripting (X-XSS-Protection / CSP)
- Referrer information leakage (Referrer-Policy)
"""

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware injecting modern HTTP security headers into all responses.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)

        # Prevent browser from guessing MIME types outside declared Content-Type
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent clickjacking by forbidding embedding in frames/iframes
        response.headers["X-Frame-Options"] = "DENY"

        # Enable browser XSS filtering
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Control referrer information sent in HTTP requests
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Restrict dangerous browser features (camera, mic, geolocation)
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

        return response
