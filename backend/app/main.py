"""FastAPI application entrypoint for Jhe's Cafe'."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.airtable import close_airtable_client
from app.core.security_headers import SecurityHeadersMiddleware
from app.core.rate_limit import RateLimitMiddleware
from app.core.observability import ObservabilityMiddleware, register_global_exception_handlers


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager handling startup and graceful shutdown."""
    # Startup actions
    yield
    # Shutdown actions: close HTTP connection pools cleanly
    await close_airtable_client()


def create_app() -> FastAPI:
    """Application factory for clean testing, observability, and modular monolith architecture."""
    application = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "Full-stack Coffee Shop Management & Online Ordering System API "
            "for BREW & CO., built with FastAPI, Airtable Web API, and Pydantic v2."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # 1. CORS Middleware
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 2. Security Headers Middleware (OWASP protection against sniffing, clickjacking, XSS)
    application.add_middleware(SecurityHeadersMiddleware)

    # 3. Observability & Correlation ID Middleware (X-Request-ID, duration, structured logs)
    application.add_middleware(ObservabilityMiddleware)

    # 4. Rate Limiting Middleware (Token bucket sliding window protecting against abuse & 429s)
    application.add_middleware(RateLimitMiddleware)

    # 5. Global RFC 7807 Problem Details exception handler
    register_global_exception_handlers(application)

    # Mount versioned REST API (/api/v1/...)
    application.include_router(api_router, prefix=settings.API_V1_PREFIX)

    @application.get("/", tags=["Root"])
    def root() -> dict[str, str]:
        return {
            "service": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "health": f"{settings.API_V1_PREFIX}/health",
            "docs": "/docs",
        }

    return application


app = create_app()
