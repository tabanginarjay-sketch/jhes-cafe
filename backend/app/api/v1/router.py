"""Central /api/v1 router aggregating all modular domain routers."""

from fastapi import APIRouter

from app.api.v1 import health
from app.modules.auth.router import router as auth_router
from app.modules.catalog.router import router as catalog_router
from app.modules.orders.router import router as orders_router
from app.modules.inventory.router import router as inventory_router
from app.modules.users.router import router as users_router
from app.modules.payments.router import router as payments_router
from app.modules.reservations.router import router as reservations_router

api_router = APIRouter()

# Core health verification
api_router.include_router(health.router)

# Authentication & session router
api_router.include_router(auth_router)

# Domain module routers
api_router.include_router(catalog_router)
api_router.include_router(orders_router)
api_router.include_router(inventory_router)
api_router.include_router(users_router)
api_router.include_router(payments_router)
api_router.include_router(reservations_router)
