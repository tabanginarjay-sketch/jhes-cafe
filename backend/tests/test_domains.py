"""Tests for Catalog, Orders, Inventory, Users, and Payments endpoints."""

import pytest
from unittest.mock import AsyncMock, patch
from app.modules.auth.security import create_session_token
from app.modules.payments.schemas import PaymentCreate


def _customer_auth_headers(email: str = "juan@example.com") -> dict[str, str]:
    token = create_session_token(
        user_id="recCust01",
        email=email,
        role="customer",
        name="Juan Dela Cruz",
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_list_products_endpoint(client):
    mock_records = [
        {
            "id": "recProd01",
            "createdTime": "2026-11-23T00:00:00.000Z",
            "fields": {
                "name": "Barako Espresso Romano",
                "category_name": "Signature Espresso",
                "price": 190.0,
                "origin": "Amadeo Cavite Liberica",
                "is_available": True,
            },
        }
    ]
    with patch("app.core.airtable.AirtableClient.list_records", new_callable=AsyncMock) as mock_list:
        mock_list.return_value = mock_records
        response = await client.get("/api/v1/catalog/products")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Barako Espresso Romano"
        assert data[0]["price"] == 190.0
        assert data[0]["id"] == "recProd01"


@pytest.mark.asyncio
async def test_create_order_requires_authentication(client):
    payload = {
        "order_number": "JHE-2026-99901",
        "customer_name": "Guest Visitor",
        "dining_option": "Dine-in",
        "payment_method": "gcash",
        "items": [
            {
                "product_name": "Barako Espresso Romano",
                "size": "Grande 16oz",
                "temperature": "Hot",
                "quantity": 1,
                "unit_price": 190.0,
                "subtotal": 190.0,
            }
        ],
    }
    response = await client.post("/api/v1/orders", json=payload)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_order_endpoint(client):
    mock_order_record = {
        "id": "recOrder01",
        "createdTime": "2026-11-23T00:00:00.000Z",
        "fields": {
            "order_number": "JHE-2026-00101",
            "customer_name": "Juan Dela Cruz",
            "customer_email": "juan@example.com",
            "customer_phone": "+639171234567",
            "dining_option": "Dine-in",
            "status": "pending",
            "total_amount": 380.0,
            "payment_status": "pending",
            "payment_method": "gcash",
        },
    }
    mock_item_record = {
        "id": "recItem01",
        "createdTime": "2026-11-23T00:00:00.000Z",
        "fields": {
            "order_id": "recOrder01",
            "product_name": "Barako Espresso Romano",
            "size": "Grande 16oz",
            "temperature": "Hot",
            "quantity": 2,
            "unit_price": 190.0,
            "subtotal": 380.0,
        },
    }

    with (
        patch("app.core.airtable.AirtableClient.list_records", new_callable=AsyncMock, return_value=[]),
        patch("app.core.airtable.AirtableClient.create_record", new_callable=AsyncMock) as mock_create,
    ):
        mock_create.side_effect = [mock_order_record, mock_item_record]
        payload = {
            "order_number": "JHE-2026-00101",
            "idempotency_key": "pytest-idem-unique-101",
            "customer_name": "Juan Dela Cruz",
            "customer_phone": "+639171234567",
            "dining_option": "Dine-in",
            "payment_method": "gcash",
            "items": [
                {
                    "product_name": "Barako Espresso Romano",
                    "size": "Grande 16oz",
                    "temperature": "Hot",
                    "quantity": 2,
                    "unit_price": 190.0,
                    "subtotal": 380.0,
                }
            ],
        }
        response = await client.post("/api/v1/orders", json=payload, headers=_customer_auth_headers())
        assert response.status_code == 201
        data = response.json()
        assert data["order_number"] == "JHE-2026-00101"
        assert data["total_amount"] == 380.0
        assert data["status"] == "pending"
        assert data["payment_status"] == "pending"
        assert len(data["items"]) == 1
        assert data["items"][0]["quantity"] == 2

        # Duplicate submission with the same idempotency_key must be rejected (409 Conflict)
        dup_response = await client.post("/api/v1/orders", json=payload, headers=_customer_auth_headers())
        assert dup_response.status_code == 409


@pytest.mark.asyncio
async def test_food_order_item_omits_drink_fields(client):
    captured_payloads = []

    async def fake_create(table_name: str, fields: dict):
        captured_payloads.append((table_name, fields))
        if table_name == "Orders":
            return {
                "id": "recOrderFood01",
                "createdTime": "2026-11-24T00:00:00.000Z",
                "fields": fields,
            }
        return {
            "id": "recItemFood01",
            "createdTime": "2026-11-24T00:00:00.000Z",
            "fields": fields,
        }

    with (
        patch("app.core.airtable.AirtableClient.list_records", new_callable=AsyncMock, return_value=[]),
        patch("app.core.airtable.AirtableClient.create_record", side_effect=fake_create),
    ):
        payload = {
            "order_number": "JHE-2026-00202",
            "idempotency_key": "pytest-idem-food-202",
            "customer_name": "Juan Dela Cruz",
            "dining_option": "Takeaway",
            "payment_method": "cash",
            "items": [
                {
                    "product_name": "Burnt Basque Cheesecake",
                    "quantity": 1,
                    "unit_price": 280.0,
                    "subtotal": 280.0,
                }
            ],
        }
        response = await client.post("/api/v1/orders", json=payload, headers=_customer_auth_headers())
        assert response.status_code == 201
        item_writes = [fields for table, fields in captured_payloads if table == "OrderItems"]
        assert len(item_writes) == 1
        assert "size" not in item_writes[0]
        assert "temperature" not in item_writes[0]
        assert "milk_type" not in item_writes[0]
        assert "sweetness" not in item_writes[0]


@pytest.mark.asyncio
async def test_list_inventory_endpoint(client):
    mock_inventory = [
        {
            "id": "recInv01",
            "createdTime": "2026-11-23T00:00:00.000Z",
            "fields": {
                "item_name": "Amadeo Cavite Liberica Beans 1kg",
                "sku": "BEAN-LIB-01",
                "category": "coffee_beans",
                "stock_quantity": 12.5,
                "unit": "kg",
                "reorder_threshold": 5.0,
            },
        }
    ]
    with patch("app.core.airtable.AirtableClient.list_records", new_callable=AsyncMock) as mock_list:
        mock_list.return_value = mock_inventory
        response = await client.get("/api/v1/inventory")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["sku"] == "BEAN-LIB-01"


@pytest.mark.asyncio
async def test_payments_endpoint(client):
    default_model = PaymentCreate(
        payment_ref="PAY-2026-0001",
        order_id="recOrder01",
        order_number="JHE-2026-00101",
        amount=380.0,
        provider="gcash",
    )
    assert default_model.status == "pending"

    mock_payment = {
        "id": "recPay01",
        "createdTime": "2026-11-23T00:00:00.000Z",
        "fields": {
            "payment_ref": "PAY-2026-0001",
            "order_id": "recOrder01",
            "order_number": "JHE-2026-00101",
            "amount": 380.0,
            "provider": "gcash",
            "status": "pending",
        },
    }
    with patch("app.core.airtable.AirtableClient.create_record", new_callable=AsyncMock) as mock_create:
        mock_create.return_value = mock_payment
        payload = {
            "payment_ref": "PAY-2026-0001",
            "order_id": "recOrder01",
            "order_number": "JHE-2026-00101",
            "amount": 380.0,
            "provider": "gcash",
        }
        response = await client.post("/api/v1/payments", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["payment_ref"] == "PAY-2026-0001"
        assert data["amount"] == 380.0
        assert data["status"] == "pending"
