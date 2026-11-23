"""Orders and Order Items repositories backed by Airtable."""

from typing import List, Optional
import time
from app.core.base_repository import BaseAirtableRepository
from app.modules.orders.schemas import (
    OrderCreate,
    OrderItemCreate,
    OrderItemResponse,
    OrderItemUpdate,
    OrderResponse,
    OrderUpdateStatus,
)


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
        """Create an Order record and all its child OrderItem records in Airtable."""
        order_num = order_data.order_number or f"JHE-{int(time.time()) % 100000:05d}"
        total_amount = sum(item.subtotal for item in order_data.items)

        order_fields = {
            "order_number": order_num,
            "customer_name": order_data.customer_name,
            "customer_phone": order_data.customer_phone,
            "customer_email": order_data.customer_email,
            "dining_option": order_data.dining_option,
            "status": "pending",
            "total_amount": round(total_amount, 2),
            "payment_status": "pending",
            "payment_method": order_data.payment_method,
            "special_notes": order_data.special_notes,
        }

        created_order_record = await self.client.create_record(
            self.table_name,
            {k: v for k, v in order_fields.items() if v is not None},
        )
        order_id = created_order_record["id"]

        # Create child items
        created_items: List[OrderItemResponse] = []
        for item in order_data.items:
            item_payload = item.model_dump(exclude_unset=True)
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
                qty_deduct = sum(item.quantity for item in order_data.items)
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
