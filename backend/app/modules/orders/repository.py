"""Orders and Order Items repositories backed by Airtable."""

from typing import List, Optional
import time
from fastapi import HTTPException
from app.core.base_repository import BaseAirtableRepository
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


def compute_server_item_price(item: OrderItemCreate) -> float:
    name_clean = item.product_name.strip().lower()
    base_price = CANONICAL_PRICES.get(name_clean)
    if base_price is None:
        for k, v in CANONICAL_PRICES.items():
            if k in name_clean or name_clean in k:
                base_price = v
                break
    if base_price is None:
        base_price = item.unit_price or 200.0

    delta = 0.0
    size_lower = (item.size or "").lower()
    if "venti" in size_lower or "20oz" in size_lower:
        delta += 30.0
    elif "tall" in size_lower or "12oz" in size_lower:
        delta -= 20.0

    milk_lower = (item.milk_type or "").lower()
    if any(p in milk_lower for p in ["oat", "almond", "soy", "coconut"]):
        delta += 40.0

    addons_lower = (item.add_ons or "").lower()
    if "+2 shot" in addons_lower or "2 extra shot" in addons_lower:
        delta += 85.0
    elif "+1 shot" in addons_lower or "1 extra shot" in addons_lower or "+ shot" in addons_lower:
        delta += 45.0

    if "cold foam" in addons_lower:
        delta += 45.0
    if "vanilla drizzle" in addons_lower:
        delta += 35.0
    if "caramel crunch" in addons_lower:
        delta += 35.0
    if "compote" in addons_lower or "strawberry" in addons_lower:
        delta += 35.0
    if "cacao" in addons_lower or "chocolate" in addons_lower:
        delta += 30.0
    if "butter" in addons_lower or "ganache" in addons_lower or "almonds" in addons_lower:
        delta += 25.0
    if "honey" in addons_lower:
        delta += 30.0

    return max(80.0, base_price + delta)


class OrderItemRepository(BaseAirtableRepository[OrderItemResponse, OrderItemCreate, OrderItemUpdate]):
    table_name = "OrderItems"
    response_model = OrderItemResponse

    async def list_by_order_id(self, order_id: str) -> List[OrderItemResponse]:
        """Fetch all items belonging to an order."""
        formula = f"{{order_id}} = '{order_id}'"
        return await self.list_all(filter_by_formula=formula)


class OrderRepository(BaseAirtableRepository[OrderResponse, OrderCreate, OrderUpdateStatus]):
    table_name = "Orders"
    response_model = OrderResponse

    def __init__(self):
        super().__init__()
        self.item_repo = OrderItemRepository(client=self.client)

    async def create_order_with_items(self, order_data: OrderCreate) -> OrderResponse:
        """Create an Order record and all child OrderItem records in Airtable with server-validated pricing."""
        customer_name = (order_data.customer_name or "").strip()
        if not customer_name or len(customer_name) < 2:
            raise HTTPException(status_code=400, detail="Customer name is required (at least 2 characters).")

        if not order_data.items:
            raise HTTPException(status_code=400, detail="Order must contain at least one item.")

        order_num = order_data.order_number
        if not order_num or not order_num.startswith("JHE-"):
            order_num = f"JHE-2026-{int(time.time() * 1000) % 90000 + 10000}"

        # Recalculate price server-side for each line item
        verified_items: List[dict] = []
        total_amount = 0.0

        for item in order_data.items:
            server_unit_price = compute_server_item_price(item)
            qty = max(1, item.quantity)
            subtotal = round(server_unit_price * qty, 2)
            total_amount += subtotal

            item_payload = item.model_dump(exclude_unset=True)
            item_payload["unit_price"] = server_unit_price
            item_payload["subtotal"] = subtotal
            verified_items.append(item_payload)

        total_amount = round(total_amount, 2)

        order_fields = {
            "order_number": order_num,
            "customer_name": customer_name,
            "customer_phone": order_data.customer_phone,
            "customer_email": order_data.customer_email,
            "dining_option": order_data.dining_option or "Dine-in",
            "status": "pending",
            "total_amount": total_amount,
            "payment_status": "pending",  # Enforce pending payment status
            "payment_method": order_data.payment_method or "gcash",
            "special_notes": order_data.special_notes,
        }

        created_order_record = await self.client.create_record(
            self.table_name,
            {k: v for k, v in order_fields.items() if v is not None},
        )
        order_id = created_order_record["id"]

        # Create child items
        created_items: List[OrderItemResponse] = []
        for item_payload in verified_items:
            item_payload["order_id"] = order_id
            created_item = await self.item_repo.client.create_record(
                self.item_repo.table_name,
                item_payload,
            )
            created_items.append(self.item_repo._record_to_model(created_item))

        # Deduct coffee stock in Inventory if configured
        try:
            inv_records = await self.client.list_records("Inventory")
            if inv_records:
                first_inv = inv_records[0]
                curr_stock = first_inv.get("fields", {}).get("stock_quantity", 10)
                qty_deduct = sum(it["quantity"] for it in verified_items)
                new_stock = max(0, curr_stock - qty_deduct)
                await self.client.update_record("Inventory", first_inv["id"], {"stock_quantity": new_stock})
        except Exception:
            pass

        response = self._record_to_model(created_order_record)
        response.items = created_items
        return response

    async def get_order_with_items(self, order_id: str) -> OrderResponse:
        """Fetch order record and eagerly fetch line items."""
        order = await self.get_by_id(order_id)
        order.items = await self.item_repo.list_by_order_id(order_id)
        return order
