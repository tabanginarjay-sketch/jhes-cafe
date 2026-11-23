"""Payments repository backed by Airtable."""

from typing import List, Optional
from app.core.base_repository import BaseAirtableRepository
from app.modules.payments.schemas import (
    PaymentCreate,
    PaymentResponse,
    PaymentUpdate,
)


class PaymentRepository(BaseAirtableRepository[PaymentResponse, PaymentCreate, PaymentUpdate]):
    table_name = "Payments"
    response_model = PaymentResponse

    async def list_by_order(self, order_id: str) -> List[PaymentResponse]:
        """Fetch payment records associated with an order."""
        formula = f"{{order_id}} = '{order_id}'"
        return await self.list_all(filter_by_formula=formula)
