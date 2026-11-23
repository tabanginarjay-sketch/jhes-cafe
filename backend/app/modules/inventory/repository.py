"""Inventory repository backed by Airtable."""

from typing import List
from app.core.base_repository import BaseAirtableRepository
from app.modules.inventory.schemas import (
    InventoryItemCreate,
    InventoryItemResponse,
    InventoryItemUpdate,
)


class InventoryRepository(BaseAirtableRepository[InventoryItemResponse, InventoryItemCreate, InventoryItemUpdate]):
    table_name = "Inventory"
    response_model = InventoryItemResponse

    async def list_low_stock(self) -> List[InventoryItemResponse]:
        """Fetch items where current stock is at or below reorder threshold."""
        formula = "{stock_quantity} <= {reorder_threshold}"
        return await self.list_all(filter_by_formula=formula)
