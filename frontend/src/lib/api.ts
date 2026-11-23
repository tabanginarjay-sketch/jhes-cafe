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
