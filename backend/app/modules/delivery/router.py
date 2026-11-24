"""FastAPI Delivery Zones & Lifecycle Verification Router backed by Airtable."""

import json
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException, status
from app.core.airtable import airtable_client
from app.modules.delivery.schemas import (
    ALLOWED_DELIVERY_TRANSITIONS,
    DRIVER_ALLOWED_TRANSITIONS,
    DeliveryZoneCreate,
)

router = APIRouter(tags=["Delivery"])


@router.get("/delivery/zones", summary="List active serviceable delivery zones")
async def list_active_delivery_zones() -> Dict[str, Any]:
    records = await airtable_client.list_records("Payments", filter_by_formula="{provider} = 'delivery_zone'")
    zones: List[Dict[str, Any]] = []
    for rec in records:
        fields = rec.get("fields") or {}
        try:
            payload = json.loads(str(fields.get("transaction_id") or "{}"))
        except Exception:
            continue
        if payload.get("is_active", True) and str(fields.get("status") or "active") != "inactive":
            zones.append({"id": rec["id"], **payload})
    return {"zones": zones, "total": len(zones)}


@router.get("/delivery/transitions", summary="Inspect validated delivery lifecycle transitions")
async def get_delivery_transition_matrix() -> Dict[str, Any]:
    return {
        "admin_transitions": ALLOWED_DELIVERY_TRANSITIONS,
        "driver_transitions": DRIVER_ALLOWED_TRANSITIONS,
    }


@router.post(
    "/delivery/zones/validate",
    summary="Validate a delivery zone payload with Pydantic v2",
    status_code=status.HTTP_200_OK,
)
async def validate_delivery_zone_payload(payload: DeliveryZoneCreate) -> Dict[str, Any]:
    if not payload.city.strip() or not payload.barangay.strip():
        raise HTTPException(status_code=400, detail="City and barangay are required.")
    return {"valid": True, "zone": payload.model_dump()}
