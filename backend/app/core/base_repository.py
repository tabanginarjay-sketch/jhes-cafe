"""Base Airtable repository providing shared CRUD and record mapping logic."""

from typing import Any, Generic, List, Optional, Type, TypeVar
from pydantic import BaseModel

from app.core.airtable import AirtableClient, airtable_client

TModel = TypeVar("TModel", bound=BaseModel)
TCreate = TypeVar("TCreate", bound=BaseModel)
TUpdate = TypeVar("TUpdate", bound=BaseModel)


class BaseAirtableRepository(Generic[TModel, TCreate, TUpdate]):
    """Generic repository mapping domain Pydantic schemas to Airtable tables."""

    table_name: str
    response_model: Type[TModel]

    def __init__(self, client: Optional[AirtableClient] = None):
        self.client = client or airtable_client

    def _record_to_model(self, record: dict[str, Any]) -> TModel:
        """Convert Airtable {id, createdTime, fields} into typed Pydantic response model."""
        fields = dict(record.get("fields", {}))
        fields["id"] = record.get("id")
        if "createdTime" in record:
            fields["created_at"] = record.get("createdTime")
        return self.response_model.model_validate(fields)

    async def list_all(
        self,
        filter_by_formula: Optional[str] = None,
        max_records: Optional[int] = None,
        sort_by: Optional[list[dict[str, str]]] = None,
    ) -> List[TModel]:
        """Fetch records from Airtable and return typed model list."""
        records = await self.client.list_records(
            table_name=self.table_name,
            filter_by_formula=filter_by_formula,
            max_records=max_records,
            sort_by=sort_by,
        )
        return [self._record_to_model(r) for r in records]

    async def get_by_id(self, record_id: str) -> TModel:
        """Fetch single record by Airtable rec ID."""
        record = await self.client.get_record(self.table_name, record_id)
        return self._record_to_model(record)

    async def create(self, data: TCreate) -> TModel:
        """Create new record in Airtable table."""
        payload = data.model_dump(exclude_unset=True, exclude_none=True)
        record = await self.client.create_record(self.table_name, payload)
        return self._record_to_model(record)

    async def update(self, record_id: str, data: TUpdate) -> TModel:
        """Update existing record in Airtable."""
        payload = data.model_dump(exclude_unset=True, exclude_none=True)
        record = await self.client.update_record(self.table_name, record_id, payload)
        return self._record_to_model(record)

    async def delete(self, record_id: str) -> bool:
        """Delete record by ID."""
        return await self.client.delete_record(self.table_name, record_id)
