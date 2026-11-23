"""Users (Customers) and Staff repositories backed by Airtable."""

from typing import Any, Dict, List, Optional
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
        clean_email = email.lower().strip()
        formula = f"LOWER({{email}}) = '{clean_email}'"
        results = await self.list_all(filter_by_formula=formula, max_records=1)
        return results[0] if results else None

    async def get_raw_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Fetch full raw Airtable record including password_hash and provider fields."""
        clean_email = email.lower().strip()
        formula = f"LOWER({{email}}) = '{clean_email}'"
        records = await self.client.list_records(
            table_name=self.table_name,
            filter_by_formula=formula,
            max_records=1,
        )
        if not records:
            return None
        rec = records[0]
        fields = dict(rec.get("fields", {}))
        fields["id"] = rec.get("id")
        fields["created_at"] = rec.get("createdTime")
        return fields

    async def get_by_provider_sub(self, provider: str, sub_id: str) -> Optional[Dict[str, Any]]:
        """Fetch customer by OAuth provider subject ID."""
        formula = f"AND({{auth_provider}} = '{provider}', {{provider_sub_id}} = '{sub_id}')"
        records = await self.client.list_records(
            table_name=self.table_name,
            filter_by_formula=formula,
            max_records=1,
        )
        if not records:
            return None
        rec = records[0]
        fields = dict(rec.get("fields", {}))
        fields["id"] = rec.get("id")
        fields["created_at"] = rec.get("createdTime")
        return fields

    async def create_raw(self, fields: Dict[str, Any]) -> Dict[str, Any]:
        """Creates a customer record in Airtable with arbitrary custom fields."""
        record = await self.client.create_record(self.table_name, fields)
        out = dict(record.get("fields", {}))
        out["id"] = record.get("id")
        out["created_at"] = record.get("createdTime")
        return out

    async def update_raw(self, record_id: str, fields: Dict[str, Any]) -> Dict[str, Any]:
        """Updates arbitrary fields on a customer record in Airtable."""
        record = await self.client.update_record(self.table_name, record_id, fields)
        out = dict(record.get("fields", {}))
        out["id"] = record.get("id")
        out["created_at"] = record.get("createdTime")
        return out


class StaffRepository(BaseAirtableRepository[StaffResponse, StaffCreate, StaffUpdate]):
    table_name = "Staff"
    response_model = StaffResponse

    async def list_active(self) -> List[StaffResponse]:
        """Fetch all active on-duty staff."""
        formula = "{is_active} = 1"
        return await self.list_all(filter_by_formula=formula)
