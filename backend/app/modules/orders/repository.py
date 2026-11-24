"""Orders and Order Items repositories backed by Airtable."""

import re
import time
from typing import Any, List, Optional
from fastapi import HTTPException
from app.core.base_repository import BaseAirtableRepository
from app.core.config import settings
from app.modules.catalog.repository import resolve_product_type
from app.modules.orders.schemas import (
    OrderCreate,
    OrderItemCreate,
    OrderItemResponse,
    OrderItemUpdate,
    OrderResponse,
    OrderUpdateStatus,
)

CANONICAL_PRICES: dict[str, float] = {
    "barako espresso romano": 190.0,
    "barako-espresso-romano": 190.0,
    "spanish latte dulce": 220.0,
    "spanish-latte-dulce": 220.0,
    "iced brown sugar shaken espresso": 230.0,
    "iced-brown-sugar-shaken-espresso": 230.0,
    "single-origin affogato al caffe": 210.0,
    "single-origin-affogato-al-caffe": 210.0,
    "tagaytay cloud cold brew": 240.0,
    "tagaytay-cloud-coldbrew": 240.0,
    "kyoto drip slow pour cold brew": 250.0,
    "kyoto-drip-slow-pour-cold-brew": 250.0,
    "salted wild honey latte": 230.0,
    "salted-honey-latte": 230.0,
    "tagaytay tablea mocha": 210.0,
    "tagaytay-tablea-mocha": 210.0,
    "highland uji matcha latte": 220.0,
    "highland-uji-matcha-latte": 220.0,
    "burnt basque cheesecake": 280.0,
    "burnt-basque-cheesecake": 280.0,
    "rosemary butter croissant": 160.0,
    "rosemary-butter-croissant": 160.0,
    "strawberry pistachio croissant": 190.0,
    "strawberry-pistachio-croissant": 190.0,
    "vanilla bean glazed doughnut": 140.0,
    "glazed-heritage-doughnut": 140.0,
    "dark cacao ganache brioche doughnut": 150.0,
    "dark-cacao-ganache-brioche-doughnut": 150.0,
}

FOOD_TYPES = {"cake", "doughnut", "pastry"}


def _sanitize_phone(phone: Optional[str]) -> Optional[int]:
    if not phone:
        return None
    digits = re.sub(r"\D", "", str(phone))
    if len(digits) < 7:
        return None
    return int(digits)


def compute_server_item_price(
    item: OrderItemCreate,
    db_base_price: Optional[float] = None,
    is_food: bool = False,
) -> float:
    name_clean = item.product_name.strip().lower()
    base_price = db_base_price
    if base_price is None:
        base_price = CANONICAL_PRICES.get(name_clean)
    if base_price is None:
        for k, v in CANONICAL_PRICES.items():
            if k in name_clean or name_clean in k:
                base_price = v
                break
    if base_price is None:
        base_price = item.unit_price or 200.0

    delta = 0.0
    if not is_food:
        size_lower = (item.size or "").lower()
        if "venti" in size_lower or "20oz" in size_lower:
            delta += 30.0
        elif "tall" in size_lower or "12oz" in size_lower:
            delta -= 20.0

        milk_lower = (item.milk_type or "").lower()
        if any(p in milk_lower for p in ["oat", "almond", "soy", "coconut"]):
            delta += 40.0

    addons_lower = (item.add_ons or "").lower()
    if not is_food:
        if "+2 shot" in addons_lower or "2 extra shot" in addons_lower:
            delta += 85.0
        elif "+1 shot" in addons_lower or "1 extra shot" in addons_lower or "+ shot" in addons_lower:
            delta += 45.0
        if "cold foam" in addons_lower or "cold-foam" in addons_lower:
            delta += 45.0
        if "vanilla drizzle" in addons_lower or "vanilla-drizzle" in addons_lower:
            delta += 35.0
        if "caramel crunch" in addons_lower or "caramel-crunch" in addons_lower:
            delta += 35.0
    else:
        if "compote" in addons_lower or "berry" in addons_lower:
            delta += 35.0
        if "cacao-dip" in addons_lower or "chocolate dip" in addons_lower:
            delta += 35.0
        elif "cacao-drizzle" in addons_lower or "cacao drizzle" in addons_lower:
            delta += 30.0
        elif "ganache" in addons_lower or "dark-cacao-dip" in addons_lower:
            delta += 25.0
        if "butter" in addons_lower or "almonds" in addons_lower:
            delta += 25.0
        if "honey" in addons_lower:
            delta += 30.0

    return max(50.0, base_price + delta)


class OrderItemRepository(BaseAirtableRepository[OrderItemResponse, OrderItemCreate, OrderItemUpdate]):
    table_name = "OrderItems"
    response_model = OrderItemResponse

    async def list_by_order_id(self, order_id: str, order_number: Optional[str] = None) -> List[OrderItemResponse]:
        """Fetch all items belonging to an order (matching record ID or order number)."""
        if order_number:
            formula = f"OR({{order_id}} = '{order_id}', {{order_id}} = '{order_number}')"
        else:
            formula = f"{{order_id}} = '{order_id}'"
        return await self.list_all(filter_by_formula=formula)


class OrderRepository(BaseAirtableRepository[OrderResponse, OrderCreate, OrderUpdateStatus]):
    table_name = "Orders"
    response_model = OrderResponse

    def __init__(self):
        super().__init__()
        self.item_repo = OrderItemRepository(client=self.client)

    async def create_order_with_items(self, order_data: OrderCreate) -> OrderResponse:
        """Create an Order record and child OrderItems in Airtable with DB-verified pricing."""
        customer_name = (order_data.customer_name or "").strip()
        if not customer_name or len(customer_name) < 2:
            raise HTTPException(status_code=400, detail="Customer name is required (at least 2 characters).")

        if not order_data.items:
            raise HTTPException(status_code=400, detail="Order must contain at least one item.")

        order_num = order_data.order_number
        if not order_num or not order_num.startswith("JHE-"):
            order_num = f"JHE-2026-{int(time.time() * 1000) % 90000 + 10000}"

        # Load live products from Airtable for DB prices and availability checks
        live_products: dict[str, dict[str, Any]] = {}
        try:
            prod_records = await self.client.list_records(settings.AIRTABLE_TABLE_PRODUCTS)
            for rec in prod_records:
                f = rec.get("fields", {})
                pname = str(f.get("name", "")).strip().lower()
                if pname:
                    live_products[pname] = f
        except Exception:
            pass

        verified_items: List[dict[str, Any]] = []
        total_amount = 0.0
        coffee_drinks = 0
        oat_milk_drinks = 0

        for item in order_data.items:
            name_lower = item.product_name.strip().lower()
            live_prod = live_products.get(name_lower)
            if live_prod and live_prod.get("is_available") is False:
                raise HTTPException(
                    status_code=400,
                    detail=f"'{item.product_name}' is currently unavailable.",
                )

            p_type = resolve_product_type(
                item.product_name,
                live_prod.get("category_name") if live_prod else None,
            )
            is_food = p_type in FOOD_TYPES
            db_price = float(live_prod["price"]) if live_prod and live_prod.get("price") is not None else None
            server_unit_price = compute_server_item_price(item, db_base_price=db_price, is_food=is_food)
            qty = max(1, item.quantity)
            subtotal = round(server_unit_price * qty, 2)
            total_amount += subtotal

            if p_type in ("coffee", "cold_brew"):
                coffee_drinks += qty
            if not is_food and "oat" in (item.milk_type or "").lower():
                oat_milk_drinks += qty

            # Only include columns that actually exist in Airtable OrderItems table,
            # and strictly omit drink-only fields for food/bakery items.
            item_payload: dict[str, Any] = {
                "product_name": item.product_name,
                "quantity": qty,
                "unit_price": server_unit_price,
                "subtotal": subtotal,
            }
            if not is_food:
                if item.size:
                    item_payload["size"] = item.size
                if item.temperature:
                    item_payload["temperature"] = "Iced" if p_type == "cold_brew" else item.temperature
                if item.milk_type:
                    item_payload["milk_type"] = item.milk_type
                if item.sweetness is not None:
                    item_payload["sweetness"] = item.sweetness

            verified_items.append(item_payload)

        total_amount = round(total_amount, 2)
        numeric_phone = _sanitize_phone(order_data.customer_phone)

        order_fields: dict[str, Any] = {
            "order_number": order_num,
            "customer_name": customer_name,
            "customer_phone": numeric_phone,
            "customer_email": order_data.customer_email,
            "dining_option": order_data.dining_option or "Dine-in",
            "status": "pending",
            "total_amount": total_amount,
            "payment_status": "pending",  # NEVER mark paid without confirmation
            "payment_method": order_data.payment_method or "gcash",
            "special_notes": order_data.special_notes,
        }

        created_order_record = await self.client.create_record(
            self.table_name,
            {k: v for k, v in order_fields.items() if v is not None},
        )
        order_id = created_order_record["id"]

        created_items: List[OrderItemResponse] = []
        for item_payload in verified_items:
            item_payload["order_id"] = order_id
            created_item = await self.item_repo.client.create_record(
                self.item_repo.table_name,
                item_payload,
            )
            created_items.append(self.item_repo._record_to_model(created_item))

        # Smart inventory deduction (only deduct beans for coffee/cold brew and oat milk when chosen)
        if coffee_drinks > 0 or oat_milk_drinks > 0:
            try:
                inv_records = await self.client.list_records("Inventory")
                if coffee_drinks > 0:
                    bean_rec = next(
                        (
                            r
                            for r in inv_records
                            if "bean" in str(r.get("fields", {}).get("item_name", "")).lower()
                        ),
                        None,
                    )
                    if bean_rec:
                        curr = bean_rec.get("fields", {}).get("stock_quantity", 0)
                        await self.client.update_record(
                            "Inventory",
                            bean_rec["id"],
                            {"stock_quantity": max(0, curr - coffee_drinks)},
                        )
                if oat_milk_drinks > 0:
                    oat_rec = next(
                        (
                            r
                            for r in inv_records
                            if "oat" in str(r.get("fields", {}).get("item_name", "")).lower()
                        ),
                        None,
                    )
                    if oat_rec:
                        curr = oat_rec.get("fields", {}).get("stock_quantity", 0)
                        await self.client.update_record(
                            "Inventory",
                            oat_rec["id"],
                            {"stock_quantity": max(0, curr - oat_milk_drinks)},
                        )
            except Exception:
                pass

        response = self._record_to_model(created_order_record)
        response.items = created_items
        return response

    async def get_order_with_items(self, order_id: str) -> OrderResponse:
        """Fetch order record and eagerly fetch line items."""
        order = await self.get_by_id(order_id)
        order.items = await self.item_repo.list_by_order_id(order_id, order.order_number)
        return order
