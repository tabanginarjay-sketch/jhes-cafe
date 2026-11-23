# ☕ Gabay sa Pag-setup ng Airtable — Jhe's Cofe'

Ang gabay na ito ay nagpapaliwanag kung paano i-setup ang iyong Airtable database para sa **Jhe's Cofe'**.

---

## ⚡ Option A: Ang Pinakamabilis (1-Click CSV Import)

Sa folder na `brew-and-co/airtable-import/`, mayroong 8 handang CSV files na may kumpletong column names at sample data para sa coffee shop.

### Mga Hakbang:
1. Buksan ang iyong Base sa [Airtable](https://airtable.com) (halimbawa, pangalanang **Jhe's Cofe'**).
2. Sa bandang itaas (tab ng mga tables), i-click ang **`+ Add or import`** ➔ piliin ang **`CSV file`**.
3. I-upload ang mga sumusunod na file isa-isa at siguraduhing **eksakto ang Table Name**:

| CSV File sa `airtable-import/` | Eksaktong Table Name sa Airtable | Deskripsyon |
|---|---|---|
| `1-Products.csv` | **`Products`** | Menu ng mga inumin at kape (presyo, origin, roast) |
| `2-Categories.csv` | **`Categories`** | Kategorya (Signature Espresso, Cold Brews, atbp.) |
| `3-Inventory.csv` | **`Inventory`** | Imbentaryo ng beans, gatas, syrup, at safety stock |
| `4-Staff.csv` | **`Staff`** | Barista at manager roster at shift schedule |
| `5-Orders.csv` | **`Orders`** | Listahan ng mga order mula sa customer |
| `6-OrderItems.csv` | **`OrderItems`** | Bawat inumin sa loob ng isang order (size, temp, milk) |
| `7-Users.csv` | **`Users`** | Customer profiles at loyalty bean points |
| `8-Payments.csv` | **`Payments`** | Transaksyon at GCash confirmation records |

---

## 🔑 Pagkuha ng Credentials para sa `backend/.env`

Pagkatapos magawa ang Base, kailangan mo lang ilagay ang dalawang credentials sa `backend/.env`:

### 1. Kunin ang `AIRTABLE_BASE_ID`:
- Tingnan ang URL ng Base mo sa browser.
- Ang format nito ay: `https://airtable.com/appXXXXXXXXXXXXXX/...`
- Kopyahin ang `appXXXXXXXXXXXXXX` (nagsisimula sa `app`).

### 2. Kunin ang `AIRTABLE_PAT` (Personal Access Token):
1. Pumunta sa [airtable.com/create/tokens](https://airtable.com/create/tokens).
2. I-click ang **Create new token**.
3. Pangalan: `jhes-cofe-token`
4. Sa ilalim ng **Scopes**, idagdag ang:
   - `data.records:read`
   - `data.records:write`
   - `schema.bases:read`
5. Sa ilalim ng **Access**, piliin ang workspace o ang Base na ginawa mo.
6. I-click ang **Create token** at kopyahin ang token (nagsisimula sa `pat...`).

### 3. Ilagay sa `backend/.env`:
Buksan ang `backend/.env` at i-paste:
```ini
AIRTABLE_PAT="pat_ang_iyong_nakopyang_token"
AIRTABLE_BASE_ID="app_ang_iyong_base_id"
AIRTABLE_API_URL="https://api.airtable.com/v0"
```

---

## 📝 Option B: Mano-manong Pag-create ng Tables at Columns

Kung gusto mong i-type isa-isa ang mga columns sa halip na mag-import ng CSV:

### 1. Table: `Products`
- `name` ➔ Single line text
- `price` ➔ Number (Decimal / Currency)
- `category_name` ➔ Single line text
- `origin` ➔ Single line text
- `roast_level` ➔ Single line text (hal. Medium, Dark)
- `tasting_notes` ➔ Single line text
- `is_available` ➔ Checkbox
- `tag` ➔ Single line text (hal. Bestseller, Artisanal)

### 2. Table: `Categories`
- `name` ➔ Single line text
- `slug` ➔ Single line text
- `description` ➔ Long text
- `display_order` ➔ Number
- `is_active` ➔ Checkbox

### 3. Table: `Orders`
- `order_number` ➔ Single line text (hal. `ORD-1001`)
- `customer_name` ➔ Single line text
- `customer_phone` ➔ Single line text
- `customer_email` ➔ Email
- `dining_option` ➔ Single line text (`Dine-in` o `Takeaway`)
- `status` ➔ Single line text (`pending`, `preparing`, `ready`)
- `total_amount` ➔ Number
- `payment_status` ➔ Single line text (`pending`, `paid`)
- `payment_method` ➔ Single line text (`gcash`, `cash`)
- `special_notes` ➔ Long text

### 4. Table: `OrderItems`
- `order_id` ➔ Single line text
- `product_name` ➔ Single line text
- `size` ➔ Single line text (hal. `16oz Regular`)
- `temperature` ➔ Single line text (`Hot` o `Iced`)
- `milk_type` ➔ Single line text (`Whole Milk`, `Barista Oat`)
- `sweetness` ➔ Number (hal. `50`)
- `quantity` ➔ Number
- `unit_price` ➔ Number
- `subtotal` ➔ Number

### 5. Table: `Inventory`
- `item_name` ➔ Single line text
- `sku` ➔ Single line text (hal. `BEAN-LIB-01`)
- `category` ➔ Single line text (`coffee_beans`, `dairy`, `syrups`)
- `stock_quantity` ➔ Number
- `unit` ➔ Single line text (`kg`, `pcs`, `liters`)
- `reorder_threshold` ➔ Number
- `supplier` ➔ Single line text
- `last_restocked` ➔ Date

### 6. Table: `Staff`
- `staff_id` ➔ Single line text (`BARISTA-01`)
- `full_name` ➔ Single line text
- `email` ➔ Email
- `role` ➔ Single line text (`barista`, `manager`)
- `shift` ➔ Single line text (`Morning`, `Closing`)
- `is_active` ➔ Checkbox

### 7. Table: `Users`
- `full_name` ➔ Single line text
- `email` ➔ Email
- `phone` ➔ Single line text
- `role` ➔ Single line text (`customer`, `vip`)
- `loyalty_points` ➔ Number

### 8. Table: `Payments`
- `payment_ref` ➔ Single line text (`PAY-2026-0001`)
- `order_id` ➔ Single line text
- `order_number` ➔ Single line text
- `amount` ➔ Number
- `provider` ➔ Single line text (`gcash`, `maya`, `cash`)
- `status` ➔ Single line text (`completed`, `pending`)
- `transaction_id` ➔ Single line text

---

## 🟢 Paano I-verify Kung Connected Na

1. Patakbuhin ang backend:
   ```powershell
   cd backend
   .\.venv\Scripts\Activate.ps1
   uvicorn app.main:app --port 8000 --reload
   ```
2. Buksan ang frontend:
   ```text
   http://localhost:3002
   ```
3. I-click ang **Re-check** button sa System Health card.
   Dapat maging kulay **Green** ang badge:
   > **Airtable Database: connected**