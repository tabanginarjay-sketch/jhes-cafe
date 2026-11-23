/**
 * Base API client configuration for communicating with the FastAPI backend.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
    ? `${window.location.origin}/api/v1`
    : "http://localhost:8000/api/v1");

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  database: {
    status: "connected" | "not_configured" | "unavailable" | string;
    detail: string;
    latency_ms?: number | null;
  };
  system?: {
    uptime_seconds: number;
    memory_rss_mb: number;
    environment: string;
  };
  cache?: {
    active_items: number;
    hits: number;
    misses: number;
    total_queries: number;
    hit_ratio_percent: number;
    status: string;
  };
  rate_limiter?: {
    active_tracked_ips: number;
    total_throttled_requests: number;
    status: string;
  };
}

export interface UserData {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: string;
  loyalty_points: number;
  auth_provider?: "google" | "apple" | "email" | string;
  avatar_url?: string;
  created_at?: string;
}

export interface OrderItemData {
  product_id?: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  size?: string;
  temperature?: string;
  milk?: string;
}

export interface OrderData {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  dining_option: string;
  status: string;
  total_amount: number;
  payment_status: string;
  payment_method: string;
  special_notes?: string;
  created_at?: string;
}

export async function fetchApiHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Health endpoint returned HTTP ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}

export async function fetchUsers(): Promise<UserData[]> {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch users: HTTP ${response.status}`);
  }

  return response.json() as Promise<UserData[]>;
}

export async function registerCustomer(payload: {
  full_name: string;
  email: string;
  phone?: string;
}): Promise<UserData> {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      errorBody.detail || `Registration failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<UserData>;
}

export async function fetchUserByEmail(email: string): Promise<UserData | null> {
  const users = await fetchUsers();
  const matched = users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase()
  );
  return matched ?? null;
}

export async function bindSocialAccountApi(payload: {
  provider: "google" | "apple";
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
}): Promise<UserData> {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      full_name: payload.full_name,
      email: payload.email,
      phone: payload.phone || "+639178889900",
      social_provider: payload.provider,
    }),
  });

  if (!response.ok) {
    const found = await fetchUserByEmail(payload.email);
    if (found) {
      return {
        ...found,
        auth_provider: payload.provider,
        avatar_url: payload.avatar_url,
      };
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to link social account.");
  }

  const user = await response.json();
  return {
    ...user,
    auth_provider: payload.provider,
    avatar_url: payload.avatar_url,
  };
}


export async function fetchOrders(): Promise<OrderData[]> {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch orders: HTTP ${response.status}`);
  }
  return response.json();
}

export async function updateOrderStatus(
  orderId: string,
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled"
) {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update order status: HTTP ${response.status}`);
  }
  return response.json();
}

export async function fetchInventory() {
  const response = await fetch(`${API_BASE_URL}/inventory`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch inventory: HTTP ${response.status}`);
  }
  return response.json();
}

export async function updateInventoryStock(itemId: string, stockQuantity: number) {
  const response = await fetch(`${API_BASE_URL}/inventory`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ id: itemId, stock_quantity: stockQuantity }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update inventory: HTTP ${response.status}`);
  }
  return response.json();
}

export async function fetchStaff() {
  const response = await fetch(`${API_BASE_URL}/staff`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch staff: HTTP ${response.status}`);
  }
  return response.json();
}

export async function fetchPayments() {
  const response = await fetch(`${API_BASE_URL}/payments`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch payments: HTTP ${response.status}`);
  }
  return response.json();
}

export async function createProduct(payload: {
  name: string;
  category_name?: string;
  price: number;
  origin?: string;
  roast_level?: string;
  tasting_notes?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/catalog/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to create product: HTTP ${response.status}`);
  }
  return response.json();
}

export async function createCategory(payload: {
  name: string;
  display_order?: number;
  description?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/catalog/categories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to create category: HTTP ${response.status}`);
  }
  return response.json();
}
