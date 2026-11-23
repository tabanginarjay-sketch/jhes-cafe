"""Reservations router."""

import random
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query, status

from app.modules.reservations.schemas import ReservationCreate, ReservationResponse
from app.core.airtable import airtable_client

router = APIRouter(prefix="/reservations", tags=["Table Reservations"])

# In-memory storage cache
_reservations_store: List[dict] = [
  {
    "id": "res-fastapi-demo-1",
    "reservation_code": "RES-JHE-1001",
    "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    "time_slot": "1:00 PM – Post-Lunch Slow Drip",
    "zone": "Communal Walnut Table",
    "guests": 2,
    "customer_name": "Maria Santos",
    "customer_email": "maria@example.com",
    "customer_phone": "+639189876543",
    "status": "confirmed",
    "created_at": datetime.now(timezone.utc).isoformat(),
  }
]


@router.get("", response_model=List[ReservationResponse])
async def list_reservations(date: Optional[str] = Query(default=None)):
    """Fetch active reservations with optional date filter."""
    try:
        records = await airtable_client.list_records("Reservations")
        if records:
            items = []
            for r in records:
                fields = r.get("fields", {})
                items.append({
                    "id": r["id"],
                    "reservation_code": fields.get("reservation_code", f"RES-JHE-{r['id'][:4]}"),
                    "date": fields.get("date", ""),
                    "time_slot": fields.get("time_slot", ""),
                    "zone": fields.get("zone", ""),
                    "guests": fields.get("guests", 2),
                    "customer_name": fields.get("customer_name", "Valued Guest"),
                    "customer_email": fields.get("customer_email", ""),
                    "customer_phone": fields.get("customer_phone"),
                    "special_requests": fields.get("special_requests"),
                    "status": fields.get("status", "confirmed"),
                    "created_at": r.get("createdTime"),
                })
            if date:
                items = [it for it in items if it["date"] == date]
            return items
    except Exception:
        pass

    results = _reservations_store
    if date:
        results = [r for r in results if r["date"] == date]
    return results


@router.post("", response_model=ReservationResponse, status_code=status.HTTP_201_CREATED)
async def create_reservation(data: ReservationCreate):
    """Create a new table reservation with overlap prevention."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if data.date < today:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reservations cannot be booked for past dates.",
        )

    # Check conflict in memory
    for r in _reservations_store:
        if (
            r["date"] == data.date
            and r["time_slot"] == data.time_slot
            and r["zone"].lower() == data.zone.lower()
            and r.get("status", "confirmed").lower() != "cancelled"
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Conflict: {data.zone} is already reserved for {data.time_slot} on {data.date}.",
            )

    code = f"RES-JHE-{random.randint(1000, 9999)}"
    record_dict = {
        "id": f"res-{int(datetime.now(timezone.utc).timestamp())}",
        "reservation_code": code,
        "date": data.date,
        "time_slot": data.time_slot,
        "zone": data.zone,
        "guests": data.guests,
        "customer_name": data.customer_name,
        "customer_email": data.customer_email,
        "customer_phone": data.customer_phone,
        "special_requests": data.special_requests,
        "status": "confirmed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # Attempt Airtable create
    try:
        airtable_record = await airtable_client.create_record("Reservations", {
            "reservation_code": code,
            "date": data.date,
            "time_slot": data.time_slot,
            "zone": data.zone,
            "guests": data.guests,
            "customer_name": data.customer_name,
            "customer_email": data.customer_email,
            "customer_phone": data.customer_phone,
            "special_requests": data.special_requests,
            "status": "confirmed",
        })
        record_dict["id"] = airtable_record["id"]
    except Exception:
        pass

    _reservations_store.insert(0, record_dict)
    return record_dict
