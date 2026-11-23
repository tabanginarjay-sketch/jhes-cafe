# Jhe's Cofe' — Coffee Shop Management & Online Ordering System

A full-stack specialty coffee shop management and online ordering platform built with an independent **Next.js** frontend and a **Python FastAPI** modular monolith backend backed by **Airtable Web API**.

Inspired by warm terracotta wooden slats, olive green acoustic textures, soft glowing neon signs, and slow-roasted highland coffee.

---

## Architecture Overview

| Layer | Technology | Local URL |
|---|---|---|
| **Frontend** | Next.js 16 (App Router), TypeScript, Tailwind CSS | `http://localhost:3002` |
| **Backend** | Python 3.12, FastAPI, Pydantic v2, HTTPX, Pytest | `http://localhost:8000` |
| **Database** | Airtable Web API (v0) | Cloud Managed |
| **API Docs** | Interactive OpenAPI / Swagger UI | `http://localhost:8000/docs` |
| **Test Suite** | Pytest with asyncio & mock | CLI runner |

### Project Structure

```text
brew-and-co/
├── README.md
├── .gitignore
├── frontend/                         # Independent Next.js frontend (port 3002)
│   ├── .env.example                  # Frontend env template
│   ├── .env.local                    # Local env (gitignored)
│   ├── package.json
│   └── src/
│       ├── lib/api.ts                # Typed REST API client helpers
│       ├── components/
│       │   └── HealthStatusCard.tsx  # Live FastAPI & Airtable health widget
│       └── app/
│           ├── layout.tsx            # Cormorant Garamond serif + DM Sans typography
│           ├── globals.css           # Fluted terracotta, olive slats & neon glow tokens
│           └── page.tsx              # Cozy cafe storefront & live order placement
└── backend/                          # Independent FastAPI modular monolith (port 8000)
    ├── .venv/                        # Isolated Python virtual environment
    ├── .env.example                  # Environment template (no secrets committed)
    ├── .env                          # Local secrets (gitignored)
    ├── pytest.ini                    # Pytest configuration
    ├── requirements.txt              # Pinned Python dependencies
    ├── tests/                        # Automated Pytest suite (11 unit & integration tests)
    │   ├── conftest.py
    │   ├── test_health.py
    │   ├── test_airtable_client.py
    │   └── test_domains.py
    └── app/
        ├── main.py                   # FastAPI entrypoint, CORS & middleware
        ├── core/
        │   ├── config.py             # Pydantic Settings loading backend/.env
        │   ├── airtable.py           # Async Airtable REST client, retries & health
        │   └── base_repository.py    # Generic CRUD repository mapping to Airtable
        ├── api/v1/
        │   ├── router.py             # Central /api/v1 router
        │   └── health.py             # GET /api/v1/health endpoint
        └── modules/                  # Domain modules with typed schemas & repositories
            ├── catalog/              # Products & Categories
            ├── orders/               # Orders & OrderItems
            ├── inventory/            # Stock tracking & low stock thresholds
            ├── users/                # Customers & Staff
            └── payments/             # Transactions & GCash logs
```

---

## Airtable Database Setup Guide

Instead of maintaining a local relational database server, **Jhe's Cofe'** uses **Airtable** as its primary cloud database.

### 1. Create an Airtable Personal Access Token (PAT)
1. Log in to [airtable.com](https://airtable.com) and navigate to [airtable.com/create/tokens](https://airtable.com/create/tokens).
2. Click **Create new token**.
3. Name your token (e.g., `jhes-cofe-api`).
4. Add the following **Scopes**:
   - `data.records:read` (Read records)
   - `data.records:write` (Create, update, and delete records)
   - `schema.bases:read` (Inspect base schemas)
5. Under **Access**, select your workspace or choose the specific Base you will use.
6. Copy the generated token (`pat...`).

### 2. Locate Your Airtable Base ID
1. Open your Base in your browser.
2. The URL will look like: `https://airtable.com/appXXXXXXXXXXXXXX/...`
3. The identifier starting with `app` is your **AIRTABLE_BASE_ID**.

### 3. Configure `backend/.env`
In `backend/.env`, set your credentials:

```ini
APP_NAME="Jhe's Cofe' API"
APP_VERSION="0.2.0"
APP_ENV="development"
DEBUG=true

API_V1_PREFIX="/api/v1"
CORS_ORIGINS="http://localhost:3002,http://127.0.0.1:3002"

# Airtable Web API
AIRTABLE_PAT="patXXXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
AIRTABLE_BASE_ID="appXXXXXXXXXXXXXX"
AIRTABLE_API_URL="https://api.airtable.com/v0"
```

> [!NOTE]
> When `AIRTABLE_PAT` or `AIRTABLE_BASE_ID` is not yet configured, the system gracefully reports `"status": "not_configured"` at `/api/v1/health` without crashing.

---

## Airtable Base Schema Reference

Create the following 8 tables in your Airtable Base. Field names match the backend Pydantic models:

### 1. `Products`
| Field Name | Airtable Field Type | Notes |
|---|---|---|
| `name` | Single line text | Product name (e.g., *Spanish Latte Dulce*) |
| `category_name` | Single line text | Category (e.g., *Signature Espresso*) |
| `category_id` | Single line text | Airtable Record ID of parent category |
| `description` | Long text | Tasting notes & ingredients |
| `price` | Number (Currency / Decimal) | Base price in PHP |
| `image_url` | URL | Photo URL |
| `origin` | Single line text | Single origin farm (e.g., *Amadeo Cavite*) |
| `roast_level` | Single line text | Medium, Dark, Light |
| `tasting_notes` | Single line text | Jackfruit, dark cacao, spiced cinnamon |
| `is_available` | Checkbox | In-stock flag (default checked) |
| `tag` | Single line text | Bestseller, Signature, Artisanal |

### 2. `Categories`
| Field Name | Airtable Field Type | Notes |
|---|---|---|
| `name` | Single line text | Signature Espresso, Cold Brews, Warm Classics |
| `slug` | Single line text | URL slug (e.g., `signature-espresso`) |
| `description` | Long text | Category overview |
| `display_order` | Number (Integer) | Sorting sequence |
| `is_active` | Checkbox | Active flag |

### 3. `Orders`
| Field Name | Airtable Field Type | Notes |
|---|---|---|
| `order_number` | Single line text | Human code e.g. `ORD-1024` |
| `customer_name` | Single line text | Customer name |
| `customer_phone`| Single line text | Contact number |
| `customer_email`| Email | Contact email |
| `dining_option` | Single line text | `Dine-in`, `Takeaway`, `Delivery` |
| `status`        | Single line text | `pending`, `preparing`, `ready`, `completed`, `cancelled` |
| `total_amount`  | Number (Currency) | Total order value |
| `payment_status`| Single line text | `pending`, `paid`, `refunded` |
| `payment_method`| Single line text | `gcash`, `maya`, `card`, `cash` |
| `special_notes` | Long text | Barista preparation notes |

### 4. `OrderItems`
| Field Name | Airtable Field Type | Notes |
|---|---|---|
| `order_id`     | Single line text | Associated Order Airtable Record ID |
| `product_name` | Single line text | Ordered drink name |
| `product_id`   | Single line text | Product Record ID |
| `size`         | Single line text | `12oz`, `16oz Regular`, `20oz Grande` |
| `temperature`  | Single line text | `Hot`, `Iced` |
| `milk_type`    | Single line text | `Whole Milk`, `Barista Oat`, `Almond Milk` |
| `sweetness`    | Number (Integer) | Sweetness percentage (0 to 100) |
| `add_ons`      | Single line text | Comma-separated add-on syrups or foam |
| `quantity`     | Number (Integer) | Quantity ordered |
| `unit_price`   | Number (Currency) | Price per item |
| `subtotal`     | Number (Currency) | Total line amount |

### 5. `Inventory`
| Field Name | Airtable Field Type | Notes |
|---|---|---|
| `item_name`         | Single line text | E.g. *Cavite Liberica Beans 1kg* |
| `sku`               | Single line text | Stock code e.g. `BEAN-LIB-01` |
| `category`          | Single line text | `coffee_beans`, `dairy`, `syrups`, `packaging` |
| `stock_quantity`    | Number (Decimal) | Current stock level |
| `unit`              | Single line text | `kg`, `liters`, `pcs`, `bags` |
| `reorder_threshold` | Number (Decimal) | Alert threshold |
| `supplier`          | Single line text | Supplier / farm name |
| `last_restocked`    | Date | Last delivery date |

### 6. `Users`
| Field Name | Airtable Field Type | Notes |
|---|---|---|
| `full_name`      | Single line text | Customer name |
| `email`          | Email | Customer email address |
| `phone`          | Single line text | Mobile phone |
| `role`           | Single line text | `customer`, `vip` |
| `loyalty_points` | Number (Integer) | Earned coffee bean points |

### 7. `Staff`
| Field Name | Airtable Field Type | Notes |
|---|---|---|
| `staff_id`  | Single line text | Employee code e.g. `BARISTA-01` |
| `full_name` | Single line text | Staff name |
| `email`     | Email | Work email |
| `role`      | Single line text | `barista`, `shift_supervisor`, `manager`, `cashier` |
| `shift`     | Single line text | `Morning`, `Mid`, `Closing` |
| `is_active` | Checkbox | Active employment status |

### 8. `Payments`
| Field Name | Airtable Field Type | Notes |
|---|---|---|
| `payment_ref`    | Single line text | Unique payment code e.g. `PAY-2026-0001` |
| `order_id`       | Single line text | Order Airtable Record ID |
| `order_number`   | Single line text | `ORD-1024` |
| `amount`         | Number (Currency) | Paid amount |
| `provider`       | Single line text | `gcash`, `maya`, `stripe`, `cash` |
| `status`         | Single line text | `completed`, `pending`, `failed`, `refunded` |
| `transaction_id` | Single line text | Gateway reference code |

---

## Running the Application

### 1. Run the Backend API (FastAPI)
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Base: `http://localhost:8000`
- Health check: `http://localhost:8000/api/v1/health`
- Interactive Swagger UI: `http://localhost:8000/docs`

### 2. Run Backend Pytest Suite
```powershell
cd backend
.\.venv\Scripts\pytest.exe -v
```
All unit tests and integration tests mock Airtable responses and assert contract validation across all 8 entity repositories.

### 3. Run the Frontend (Next.js)
```powershell
cd frontend
npm run dev -- -p 3002
```
- Web Storefront: `http://localhost:3002`

---

## API Endpoints Reference (`/api/v1`)

| Module | Method | Endpoint | Description |
|---|---|---|---|
| **Health** | `GET` | `/api/v1/health` | Live service & Airtable connectivity check |
| **Catalog** | `GET` | `/api/v1/catalog/products` | List products (with category filter) |
| | `POST` | `/api/v1/catalog/products` | Create product record |
| | `GET` | `/api/v1/catalog/products/{id}` | Get product details |
| | `PATCH` | `/api/v1/catalog/products/{id}` | Update product record |
| | `DELETE` | `/api/v1/catalog/products/{id}` | Delete product record |
| | `GET` | `/api/v1/catalog/categories` | List categories sorted by display order |
| | `POST` | `/api/v1/catalog/categories` | Create category |
| **Orders** | `GET` | `/api/v1/orders` | List orders (with status filter) |
| | `POST` | `/api/v1/orders` | Create order and child order items |
| | `GET` | `/api/v1/orders/{id}` | Get order with line items |
| | `PATCH` | `/api/v1/orders/{id}/status` | Update preparation & payment status |
| | `GET` | `/api/v1/orders/{id}/items` | Get line items for order |
| **Inventory** | `GET` | `/api/v1/inventory` | List stock items (with low stock filter) |
| | `POST` | `/api/v1/inventory` | Add inventory item |
| | `PATCH` | `/api/v1/inventory/{id}` | Update stock quantity or threshold |
| **Users** | `GET` | `/api/v1/users` | List customer profiles |
| | `POST` | `/api/v1/users` | Register or lookup customer |
| | `GET` | `/api/v1/staff` | List active on-duty staff |
| | `POST` | `/api/v1/staff` | Add staff member |
| **Payments** | `GET` | `/api/v1/payments` | List payment transactions |
| | `POST` | `/api/v1/payments` | Record payment transaction |
