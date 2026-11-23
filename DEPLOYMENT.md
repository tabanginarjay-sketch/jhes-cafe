# Jhe's Cafe' - Production Architecture & Deployment Guide

This guide details the production implementation of the **5 Architectural Pillars** for **Jhe's Cafe'**:

---

## 🏛️ The 5 Pillars Architecture

```
                    ┌────────────────────────────────────────┐
                    │          JHE'S CAFE' SYSTEM            │
                    └───────────────────┬────────────────────┘
                                        │
    ┌───────────────┬───────────────────┼───────────────────┬────────────────┐
    │               │                   │                   │                │
┌───▼─────────┐ ┌───▼─────────┐   ┌─────▼───────┐     ┌─────▼───────┐  ┌─────▼──────┐
│ 1. SECURITY │ │ 2. SHIPPING │   │  3. SPEED   │     │ 4. TRAFFIC  │  │ 5.SURVIVAL │
├─────────────┤ ├─────────────┤   ├─────────────┤     ├─────────────┤  ├────────────┤
│• OWASP Sec  │ │• Dockerfile │   │• In-Memory  │     │• Keep-Alive │  │• Deep /    │
│  Headers    │ │  (Python &  │   │  TTL Cache  │     │  HTTPX Pool │  │  health    │
│• RBAC & RLS │ │   Node)     │   │• Stale-     │     │  (50 conns) │  │  endpoint  │
│  Access     │ │• docker-    │   │  While-     │     │• 429 Retry  │  │• X-Request │
│  Control    │ │  compose    │   │  Revalidate │     │  & Backoff  │  │  ID trace  │
│• Sliding    │ │• GitHub     │   │• Instant    │     │• Multi-     │  │• RFC 7807  │
│  Window     │ │  Actions    │   │  Tag Purge  │     │  worker     │  │  Problem   │
│  Rate Limit │ │  CI/CD      │   │  on mutation│     │  scaling    │  │  Shield    │
└─────────────┘ └─────────────┘   └─────────────┘     └─────────────┘  └────────────┘
```

---

## 1. 🛡️ Pillar 1: Security
- **Security Headers Middleware**: Injects `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, and `Referrer-Policy: strict-origin-when-cross-origin` into all API responses.
- **Role-Based Access Control (RBAC)**: Enforces role checks (`customer`, `staff`, `admin`) via `require_auth` and `require_admin` in `app/core/auth_guard.py`.
- **Row-Level Security (RLS)**: Enforces record ownership checks so customers can only access their own profile and order records.
- **Sliding Window Rate Limiter**: Thread-safe in-memory rate limiter in `app/core/rate_limit.py` preventing brute force on auth (`/users`) and orders (`/orders`) while protecting Airtable's 5 req/sec quota.

---

## 2. 🚢 Pillar 2: Shipping (Deployment & CI/CD)
- **Backend Dockerfile**: Multi-stage `python:3.12-slim`, non-root user (`appuser`), internal health check, and Uvicorn multi-worker process.
- **Frontend Dockerfile**: Multi-stage `node:20-alpine`, Next.js standalone output, non-root user (`nextjs`).
- **docker-compose.yml**: Orchestrates backend (`:8000`) and frontend (`:3002`) with inter-service networking and healthcheck dependencies.
- **GitHub Actions (`.github/workflows/ci.yml`)**: Automates Python pytest suite (18/18 passing) and Next.js typecheck & build on every git push or pull request.

---

## 3. ⚡ Pillar 3: Speed (Caching & CDN)
- **TTL Cache Manager (`app/core/cache.py`)**: In-memory cache-aside architecture for catalog products and categories with configurable TTL (60s–120s).
- **Instant Prefix Invalidation**: Cache entries automatically purged (`cache.invalidate_prefix("catalog:")`) when admin creates, updates, or deletes items.
- **HTTP Cache Headers**: Endpoints serve `Cache-Control: public, max-age=60, stale-while-revalidate=300` allowing browser and CDN caching.

---

## 4. 🚦 Pillar 4: Traffic (Load Balancing & Connection Pooling)
- **Persistent HTTPX Pool**: Reuses HTTP connections (`max_keepalive_connections=20, max_connections=50`) to Airtable, eliminating repetitive SSL handshake delays.
- **Graceful Backoff**: Automatic retry with exponential backoff on HTTP 429 status codes.
- **Worker Scaling**: Production container runs with 2+ Uvicorn ASGI workers for concurrent request throughput.

---

## 5. 🏥 Pillar 5: Survival (Observability & Recovery)
- **Deep Health Diagnostics (`/api/v1/health`)**: Reports live uptime, memory RSS footprint (MB), real-time Airtable roundtrip ping (ms), cache hit ratio %, and rate limiter statistics.
- **Container Probes**: Dedicated `/api/v1/health/liveness` and `/api/v1/health/readiness` endpoints for Kubernetes/Docker orchestration.
- **Correlation ID Tracking (`X-Request-ID`)**: Every incoming request receives or preserves a unique UUID logged alongside response latency in ms.
- **RFC 7807 Exception Shield**: Unhandled exceptions return standardized Problem Details JSON without leaking sensitive server credentials.

---

## 🚀 Quick Start with Docker Compose

```bash
# 1. Provide your Airtable credentials in backend/.env
AIRTABLE_PAT=patYourKeyHere...
AIRTABLE_BASE_ID=appggtW264wuDdGKl

# 2. Build and launch all services
docker compose up --build -d

# 3. View status
docker compose ps
```

- **Frontend Application**: `http://localhost:3002`
- **Backend REST API**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **System Health Diagnostics**: `http://localhost:8000/api/v1/health`
- **Admin System Monitor**: `http://localhost:3002/admin/settings`
