/**
 * Core Domain Types, Lifecycle State Machine, Validation Rules & Constants
 * for Jhe's Cafe' Delivery, Zone Configuration, Driver Portal, and Customer Notifications.
 */

export type DiningPreference = "Dine-in" | "Takeaway" | "Delivery";

export type DeliveryStatus =
  | "PENDING_ASSIGNMENT"
  | "DRIVER_ASSIGNED"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "FAILED_DELIVERY"
  | "RETURNED";

export const CORE_DELIVERY_TIMELINE: DeliveryStatus[] = [
  "PENDING_ASSIGNMENT",
  "DRIVER_ASSIGNED",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export const EXCEPTION_DELIVERY_STATUSES = new Set<DeliveryStatus>([
  "CANCELLED",
  "FAILED_DELIVERY",
  "RETURNED",
]);

export const TERMINAL_DELIVERY_STATUSES = new Set<DeliveryStatus>([
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
]);

export const ALLOWED_DELIVERY_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  PENDING_ASSIGNMENT: ["DRIVER_ASSIGNED", "READY_FOR_PICKUP", "CANCELLED"],
  DRIVER_ASSIGNED: ["READY_FOR_PICKUP", "PICKED_UP", "CANCELLED"],
  READY_FOR_PICKUP: ["DRIVER_ASSIGNED", "PICKED_UP", "CANCELLED"],
  PICKED_UP: ["OUT_FOR_DELIVERY", "FAILED_DELIVERY", "RETURNED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED_DELIVERY", "RETURNED"],
  FAILED_DELIVERY: ["DRIVER_ASSIGNED", "RETURNED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
  RETURNED: [],
};

export const DRIVER_ALLOWED_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  PENDING_ASSIGNMENT: [],
  DRIVER_ASSIGNED: ["PICKED_UP"],
  READY_FOR_PICKUP: ["PICKED_UP"],
  PICKED_UP: ["OUT_FOR_DELIVERY", "FAILED_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED_DELIVERY"],
  FAILED_DELIVERY: [],
  DELIVERED: [],
  CANCELLED: [],
  RETURNED: [],
};

export function isValidDeliveryTransition(
  current: DeliveryStatus,
  next: DeliveryStatus,
  actor: "admin" | "driver"
): boolean {
  const table = actor === "driver" ? DRIVER_ALLOWED_TRANSITIONS : ALLOWED_DELIVERY_TRANSITIONS;
  return (table[current] || []).includes(next);
}

export function formatDeliveryStatusLabel(status: DeliveryStatus | string): string {
  switch (status) {
    case "PENDING_ASSIGNMENT":
      return "Pending Assignment";
    case "DRIVER_ASSIGNED":
      return "Driver Assigned";
    case "READY_FOR_PICKUP":
      return "Ready for Pickup";
    case "PICKED_UP":
      return "Picked Up";
    case "OUT_FOR_DELIVERY":
      return "Out for Delivery";
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
      return "Cancelled";
    case "FAILED_DELIVERY":
      return "Failed Delivery";
    case "RETURNED":
      return "Returned";
    default:
      return String(status || "Pending");
  }
}

export interface DeliveryZone {
  id: string;
  zone_code: string;
  city: string;
  barangay: string;
  area_label: string;
  delivery_fee: number;
  min_order_amount: number;
  estimated_minutes: string;
  is_active: boolean;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  customer_email: string;
  label: string;
  recipient_name: string;
  contact_number: string;
  house_number: string;
  street: string;
  barangay: string;
  city: string;
  landmark: string;
  delivery_instructions: string;
  is_default: boolean;
  created_at: string;
}

export interface DeliveryAuditEvent {
  at: string;
  action: string;
  from_status?: string;
  to_status?: string;
  by: string;
  role: "system" | "admin" | "manager" | "driver" | "customer";
  note?: string;
}

export interface DeliveryMessageOrIssue {
  id: string;
  kind: "message" | "issue";
  at: string;
  sender_name: string;
  sender_role: "customer" | "driver" | "admin" | "manager";
  text: string;
  issue_category?: string;
}

export interface DeliveryRecord {
  id: string;
  delivery_ref: string;
  order_id: string;
  order_number: string;
  customer_id: string;
  customer_email: string;

  // Recipient & structured address
  recipient_name: string;
  contact_number: string;
  house_number: string;
  street: string;
  barangay: string;
  city: string;
  landmark: string;
  delivery_instructions: string;
  full_address: string;

  // Zone & fee snapshot (authoritative from backend)
  zone_id: string;
  zone_label: string;
  delivery_fee: number;
  estimated_delivery_time: string;
  schedule_type: "asap" | "scheduled";
  scheduled_window: string | null;

  // Lifecycle & assignment
  delivery_status: DeliveryStatus;
  driver_id: string | null;
  driver_staff_code: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  driver_vehicle: string | null;
  driver_acknowledged_at: string | null;

  // Proof of delivery, failures & COD cash collection (separate from admin payment settlement)
  confirmation_code: string;
  proof_note: string | null;
  proof_confirmed_code: string | null;
  delivered_at: string | null;
  failure_reason: string | null;
  failed_attempts: number;

  payment_method: string;
  cod_amount_due: number;
  cash_collected_amount: number | null;
  cash_collected_at: string | null;
  cash_collected_by: string | null;

  // Audit trail & restricted customer/driver/admin communication log
  audit_trail: DeliveryAuditEvent[];
  messages: DeliveryMessageOrIssue[];

  created_at: string;
  updated_at: string;
}

export type DriverAvailabilityStatus = "available" | "on_delivery" | "offline";

export interface DriverProfile {
  id: string; // Airtable Staff record ID
  profile_record_id?: string | null;
  staff_id: string;
  full_name: string;
  email: string;
  phone: string;
  vehicle_type: string;
  plate_number: string;
  shift: string;
  is_active: boolean;
  availability_status: DriverAvailabilityStatus;
  active_deliveries_count?: number;
}

export interface CustomerNotification {
  id: string;
  notification_ref: string;
  customer_id: string;
  customer_email: string;
  order_id: string;
  order_number: string;
  event_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function normalizeGeoText(val?: string | null): string {
  return String(val || "")
    .toLowerCase()
    .replace(/\b(brgy\.?|barangay|city of|municipality of)\b/gi, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function formatFullDeliveryAddress(addr: {
  house_number?: string;
  street?: string;
  barangay?: string;
  city?: string;
  landmark?: string;
}): string {
  const main = [
    addr.house_number?.trim(),
    addr.street?.trim(),
    addr.barangay ? `Brgy. ${addr.barangay.replace(/^(brgy\.?|barangay)\s*/i, "").trim()}` : null,
    addr.city?.trim(),
  ]
    .filter(Boolean)
    .join(", ");
  return addr.landmark?.trim() ? `${main} (Landmark: ${addr.landmark.trim()})` : main;
}

export function matchServiceableZone(
  zones: DeliveryZone[],
  city: string,
  barangay: string
): DeliveryZone | null {
  const normCity = normalizeGeoText(city);
  const normBrgy = normalizeGeoText(barangay);
  if (!normCity || !normBrgy) return null;

  return (
    zones.find(
      (z) =>
        z.is_active &&
        normalizeGeoText(z.city) === normCity &&
        normalizeGeoText(z.barangay) === normBrgy
    ) || null
  );
}
