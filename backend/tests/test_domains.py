"""Tests for Catalog, Orders, Inventory, Users, and Payments endpoints."""

import pytest
from unittest.mock import AsyncMock, patch


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
async def test_create_order_endpoint(client):
    mock_order_record = {
        "id": "recOrder01",
        "createdTime": "2026-11-23T00:00:00.000Z",
        "fields": {
            "order_number": "ORD-00101",
            "customer_name": "Juan Dela Cruz",
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
            "size": "Regular",
            "temperature": "Hot",
            "quantity": 2,
            "unit_price": 190.0,
            "subtotal": 380.0,
        },
    }

    with patch("app.core.airtable.AirtableClient.create_record", new_callable=AsyncMock) as mock_create:
        mock_create.side_effect = [mock_order_record, mock_item_record]
        payload = {
            "order_number": "ORD-00101",
            "customer_name": "Juan Dela Cruz",
            "customer_phone": "+639171234567",
            "dining_option": "Dine-in",
            "payment_method": "gcash",
            "items": [
                {
                    "product_name": "Barako Espresso Romano",
                    "size": "Regular",
                    "temperature": "Hot",
                    "quantity": 2,
                    "unit_price": 190.0,
                    "subtotal": 380.0,
                }
            ],
        }
        response = await client.post("/api/v1/orders", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["order_number"] == "ORD-00101"
        assert data["total_amount"] == 380.0
        assert len(data["items"]) == 1
        assert data["items"][0]["quantity"] == 2


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
    mock_payment = {
        "id": "recPay01",
        "createdTime": "2026-11-23T00:00:00.000Z",
        "fields": {
            "payment_ref": "PAY-2026-0001",
            "order_id": "recOrder01",
            "order_number": "ORD-00101",
            "amount": 380.0,
            "provider": "gcash",
            "status": "completed",
        },
    }
    with patch("app.core.airtable.AirtableClient.create_record", new_callable=AsyncMock) as mock_create:
        mock_create.return_value = mock_payment
        payload = {
            "payment_ref": "PAY-2026-0001",
            "order_id": "recOrder01",
            "order_number": "ORD-00101",
            "amount": 380.0,
            "provider": "gcash",
            "status": "completed",
        }
        response = await client.post("/api/v1/payments", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["payment_ref"] == "PAY-2026-0001"
        assert data["amount"] == 380.0
