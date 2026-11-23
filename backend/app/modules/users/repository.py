"""Users (Customers) and Staff repositories backed by Airtable."""

from typing import List, Optional
from app.core.base_repository import BaseAirtableRepository
from app.modules.users.schemas import (
    StaffCreate,
    StaffResponse,
    StaffUpdate,
    UserCreate,
    UserResponse,
    UserUpdate,
)


class UserRepository(BaseAirtableRepository[UserResponse, UserCreate, UserUpdate]):
    table_name = "Users"
    response_model = UserResponse

    async def get_by_email(self, email: str) -> Optional[UserResponse]:
        """Fetch customer by email address."""
        formula = f"{{email}} = '{email}'"
        results = await self.list_all(filter_by_formula=formula, max_records=1)
        return results[0] if results else None


class StaffRepository(BaseAirtableRepository[StaffResponse, StaffCreate, StaffUpdate]):
    table_name = "Staff"
    response_model = StaffResponse

    async def list_active(self) -> List[StaffResponse]:
        """Fetch all active on-duty staff."""
        formula = "{is_active} = 1"
        return await self.list_all(filter_by_formula=formula)
