/**
 * Durable Airtable Persistence Adapter for Jhe's Cafe' Delivery Domain:
 * - Delivery Zones (provider: "delivery_zone", ref: "ZONE-...")
 * - Deliveries (provider: "delivery_dispatch", ref: "DLV-...")
 * - Customer Saved Addresses (provider: "customer_address", ref: "ADDR-...")
 * - In-App Customer Notifications (provider: "customer_notification", ref: "NTF-...")
 * - Driver Profiles linked to Airtable Staff (provider: "driver_profile", ref: "DRV-...")
 *
 * All system envelopes are strictly excluded from Payments, Loyalty Ledger, and Customer Orders
 * via isDeliverySystemRecord() in paymentLedger.ts and backend/app/modules/payments/repository.py.
 * Works seamlessly across Vercel serverless cold starts with zero schema-permission failures.
 */

import crypto from "crypto";
import { airtableCreate, airtableDelete, airtableGet, airtableList, airtableUpdate } from "@/lib/airtable";
import { escapeFormulaString } from "@/lib/serverAuth";
import {
  type CustomerAddress,
  type CustomerNotification,
  type DeliveryAuditEvent,
  type DeliveryMessageOrIssue,
  type DeliveryRecord,
  type DeliveryStatus,
  type DeliveryZone,
  type DriverAvailabilityStatus,
  type DriverProfile,
  formatFullDeliveryAddress,
} from "@/lib/deliveryTypes";

function safeJsonParse<T>(raw: unknown): T | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function generateDeliveryConfirmationCode(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

// ============================================================================
// 1. CONFIGURABLE DELIVERY ZONES (ZERO HARDCODED RATES)
// ============================================================================

export async function listDeliveryZones(activeOnly = false): Promise<DeliveryZone[]> {
  const rows = await airtableList("Payments", `{provider} = 'delivery_zone'`, true).catch(() => []);
  const zones: DeliveryZone[] = [];

  for (const row of rows) {
    const data = safeJsonParse<Partial<DeliveryZone>>(row.transaction_id);
    if (!data || !data.city || !data.barangay) continue;
    const zone: DeliveryZone = {
      id: String(row.id),
      zone_code: String(row.payment_ref || data.zone_code || row.id),
      city: String(data.city).trim(),
      barangay: String(data.barangay).trim(),
      area_label: String(data.area_label || `${data.barangay}, ${data.city}`).trim(),
      delivery_fee: Math.max(0, Number(data.delivery_fee ?? row.amount ?? 0)),
      min_order_amount: Math.max(0, Number(data.min_order_amount ?? 0)),
      estimated_minutes: String(data.estimated_minutes || "30–45 mins").trim(),
      is_active: data.is_active !== false && String(row.status || "active") !== "inactive",
      updated_by: data.updated_by,
      created_at: String(row.created_at || data.created_at || new Date().toISOString()),
      updated_at: String(data.updated_at || row.created_at || new Date().toISOString()),
    };
    if (!activeOnly || zone.is_active) {
      zones.push(zone);
    }
  }

  zones.sort((a, b) => a.city.localeCompare(b.city) || a.barangay.localeCompare(b.barangay));
  return zones;
}

export async function createDeliveryZone(input: {
  city: string;
  barangay: string;
  area_label?: string;
  delivery_fee: number;
  min_order_amount: number;
  estimated_minutes: string;
  is_active?: boolean;
  updated_by?: string;
}): Promise<DeliveryZone> {
  const nowIso = new Date().toISOString();
  const zoneCode = `ZONE-${Date.now().toString().slice(-5)}-${Math.floor(100 + Math.random() * 900)}`;
  const payload = {
    zone_code: zoneCode,
    city: input.city.trim(),
    barangay: input.barangay.trim(),
    area_label: (input.area_label || `${input.barangay.trim()}, ${input.city.trim()}`).trim(),
    delivery_fee: Math.round(Math.max(0, Number(input.delivery_fee)) * 100) / 100,
    min_order_amount: Math.round(Math.max(0, Number(input.min_order_amount)) * 100) / 100,
    estimated_minutes: input.estimated_minutes.trim() || "30–45 mins",
    is_active: input.is_active !== false,
    updated_by: input.updated_by || "Administrator",
    created_at: nowIso,
    updated_at: nowIso,
  };

  const created: any = await airtableCreate("Payments", {
    payment_ref: zoneCode,
    order_id: `${payload.city.toLowerCase()}::${payload.barangay.toLowerCase()}`,
    order_number: "DELIVERY-ZONE",
    amount: payload.delivery_fee,
    provider: "delivery_zone",
    status: payload.is_active ? "active" : "inactive",
    transaction_id: JSON.stringify(payload),
  });

  return { id: String(created.id), ...payload };
}

export async function updateDeliveryZone(
  id: string,
  updates: Partial<{
    city: string;
    barangay: string;
    area_label: string;
    delivery_fee: number;
    min_order_amount: number;
    estimated_minutes: string;
    is_active: boolean;
    updated_by: string;
  }>
): Promise<DeliveryZone | null> {
  const raw: any = await airtableGet("Payments", id).catch(() => null);
  if (!raw || String(raw.provider || "").toLowerCase() !== "delivery_zone") return null;

  const existing = safeJsonParse<Partial<DeliveryZone>>(raw.transaction_id) || {};
  const nowIso = new Date().toISOString();

  const merged = {
    zone_code: String(raw.payment_ref || existing.zone_code || id),
    city: (updates.city ?? existing.city ?? "").trim(),
    barangay: (updates.barangay ?? existing.barangay ?? "").trim(),
    area_label: (
      updates.area_label ??
      existing.area_label ??
      `${(updates.barangay ?? existing.barangay ?? "").trim()}, ${(updates.city ?? existing.city ?? "").trim()}`
    ).trim(),
    delivery_fee:
      updates.delivery_fee !== undefined
        ? Math.round(Math.max(0, Number(updates.delivery_fee)) * 100) / 100
        : Number(existing.delivery_fee ?? raw.amount ?? 0),
    min_order_amount:
      updates.min_order_amount !== undefined
        ? Math.round(Math.max(0, Number(updates.min_order_amount)) * 100) / 100
        : Number(existing.min_order_amount ?? 0),
    estimated_minutes: (updates.estimated_minutes ?? existing.estimated_minutes ?? "30–45 mins").trim(),
    is_active: updates.is_active !== undefined ? Boolean(updates.is_active) : existing.is_active !== false,
    updated_by: updates.updated_by || existing.updated_by || "Administrator",
    created_at: String(raw.created_at || existing.created_at || nowIso),
    updated_at: nowIso,
  };

  await airtableUpdate("Payments", id, {
    order_id: `${merged.city.toLowerCase()}::${merged.barangay.toLowerCase()}`,
    amount: merged.delivery_fee,
    status: merged.is_active ? "active" : "inactive",
    transaction_id: JSON.stringify(merged),
  });

  return { id, ...merged };
}

export async function deleteDeliveryZone(id: string): Promise<boolean> {
  const raw: any = await airtableGet("Payments", id).catch(() => null);
  if (!raw || String(raw.provider || "").toLowerCase() !== "delivery_zone") return false;
  await airtableDelete("Payments", id);
  return true;
}

// ============================================================================
// 2. CUSTOMER SAVED ADDRESSES
// ============================================================================

export async function listCustomerAddresses(
  customerId: string,
  customerEmail: string
): Promise<CustomerAddress[]> {
  const cleanEmail = customerEmail.toLowerCase().trim();
  const rows = await airtableList("Payments", `{provider} = 'customer_address'`, true).catch(() => []);
  const addresses: CustomerAddress[] = [];

  for (const row of rows) {
    const data = safeJsonParse<Partial<CustomerAddress>>(row.transaction_id);
    if (!data) continue;
    const ownerMatch =
      String(row.order_id || "") === customerId ||
      String(data.customer_id || "") === customerId ||
      String(data.customer_email || "").toLowerCase().trim() === cleanEmail;
    if (!ownerMatch) continue;

    addresses.push({
      id: String(row.id),
      customer_id: String(data.customer_id || customerId),
      customer_email: cleanEmail,
      label: String(data.label || "Saved Address").trim(),
      recipient_name: String(data.recipient_name || "").trim(),
      contact_number: String(data.contact_number || "").trim(),
      house_number: String(data.house_number || "").trim(),
      street: String(data.street || "").trim(),
      barangay: String(data.barangay || "").trim(),
      city: String(data.city || "").trim(),
      landmark: String(data.landmark || "").trim(),
      delivery_instructions: String(data.delivery_instructions || "").trim(),
      is_default: Boolean(data.is_default),
      created_at: String(row.created_at || data.created_at || new Date().toISOString()),
    });
  }

  addresses.sort((a, b) => Number(b.is_default) - Number(a.is_default) || b.created_at.localeCompare(a.created_at));
  return addresses;
}

export async function saveCustomerAddress(input: Omit<CustomerAddress, "id" | "created_at">): Promise<CustomerAddress> {
  const nowIso = new Date().toISOString();
  const addrRef = `ADDR-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  // Avoid duplicate identical addresses for the same customer
  const existing = await listCustomerAddresses(input.customer_id, input.customer_email);
  const dup = existing.find(
    (a) =>
      a.house_number.toLowerCase() === input.house_number.trim().toLowerCase() &&
      a.street.toLowerCase() === input.street.trim().toLowerCase() &&
      a.barangay.toLowerCase() === input.barangay.trim().toLowerCase() &&
      a.city.toLowerCase() === input.city.trim().toLowerCase()
  );

  const payload = {
    customer_id: input.customer_id,
    customer_email: input.customer_email.toLowerCase().trim(),
    label: input.label.trim() || "Home",
    recipient_name: input.recipient_name.trim(),
    contact_number: input.contact_number.trim(),
    house_number: input.house_number.trim(),
    street: input.street.trim(),
    barangay: input.barangay.trim(),
    city: input.city.trim(),
    landmark: input.landmark.trim(),
    delivery_instructions: input.delivery_instructions.trim(),
    is_default: Boolean(input.is_default),
    created_at: nowIso,
  };

  if (dup) {
    await airtableUpdate("Payments", dup.id, {
      transaction_id: JSON.stringify({ ...payload, created_at: dup.created_at }),
    });
    return { id: dup.id, ...payload, created_at: dup.created_at };
  }

  const created: any = await airtableCreate("Payments", {
    payment_ref: addrRef,
    order_id: input.customer_id,
    order_number: "CUSTOMER-ADDRESS",
    amount: 0,
    provider: "customer_address",
    status: "active",
    transaction_id: JSON.stringify(payload),
  });

  return { id: String(created.id), ...payload };
}

export async function deleteCustomerAddress(id: string, customerId: string, customerEmail: string): Promise<boolean> {
  const raw: any = await airtableGet("Payments", id).catch(() => null);
  if (!raw || String(raw.provider || "").toLowerCase() !== "customer_address") return false;
  const data = safeJsonParse<Partial<CustomerAddress>>(raw.transaction_id);
  const cleanEmail = customerEmail.toLowerCase().trim();
  const isOwner =
    String(raw.order_id || "") === customerId ||
    String(data?.customer_id || "") === customerId ||
    String(data?.customer_email || "").toLowerCase().trim() === cleanEmail;
  if (!isOwner) return false;
  await airtableDelete("Payments", id);
  return true;
}

// ============================================================================
// 3. DELIVERIES (DISPATCH & LIFECYCLE)
// ============================================================================

function parseDeliveryRow(row: Record<string, any>): DeliveryRecord | null {
  const data = safeJsonParse<Partial<DeliveryRecord>>(row.transaction_id);
  if (!data || !data.order_number) return null;
  return {
    id: String(row.id),
    delivery_ref: String(row.payment_ref || data.delivery_ref || row.id),
    order_id: String(row.order_id || data.order_id || ""),
    order_number: String(row.order_number || data.order_number || ""),
    customer_id: String(data.customer_id || ""),
    customer_email: String(data.customer_email || "").toLowerCase().trim(),

    recipient_name: String(data.recipient_name || ""),
    contact_number: String(data.contact_number || ""),
    house_number: String(data.house_number || ""),
    street: String(data.street || ""),
    barangay: String(data.barangay || ""),
    city: String(data.city || ""),
    landmark: String(data.landmark || ""),
    delivery_instructions: String(data.delivery_instructions || ""),
    full_address:
      data.full_address ||
      formatFullDeliveryAddress({
        house_number: data.house_number,
        street: data.street,
        barangay: data.barangay,
        city: data.city,
        landmark: data.landmark,
      }),

    zone_id: String(data.zone_id || ""),
    zone_label: String(data.zone_label || `${data.barangay || ""}, ${data.city || ""}`),
    delivery_fee: Number(data.delivery_fee ?? row.amount ?? 0),
    estimated_delivery_time: String(data.estimated_delivery_time || "30–45 mins"),
    schedule_type: data.schedule_type === "scheduled" ? "scheduled" : "asap",
    scheduled_window: data.scheduled_window || null,

    delivery_status: (data.delivery_status || row.status || "PENDING_ASSIGNMENT") as DeliveryStatus,
    driver_id: data.driver_id || null,
    driver_staff_code: data.driver_staff_code || null,
    driver_name: data.driver_name || null,
    driver_phone: data.driver_phone || null,
    driver_vehicle: data.driver_vehicle || null,
    driver_acknowledged_at: data.driver_acknowledged_at || null,

    confirmation_code: String(data.confirmation_code || ""),
    proof_note: data.proof_note || null,
    proof_confirmed_code: data.proof_confirmed_code || null,
    delivered_at: data.delivered_at || null,
    failure_reason: data.failure_reason || null,
    failed_attempts: Number(data.failed_attempts || 0),

    payment_method: String(data.payment_method || "cod"),
    cod_amount_due: Number(data.cod_amount_due || 0),
    cash_collected_amount:
      data.cash_collected_amount !== undefined && data.cash_collected_amount !== null
        ? Number(data.cash_collected_amount)
        : null,
    cash_collected_at: data.cash_collected_at || null,
    cash_collected_by: data.cash_collected_by || null,

    audit_trail: Array.isArray(data.audit_trail) ? data.audit_trail : [],
    messages: Array.isArray(data.messages) ? data.messages : [],

    created_at: String(row.created_at || data.created_at || new Date().toISOString()),
    updated_at: String(data.updated_at || row.created_at || new Date().toISOString()),
  };
}

export async function listDeliveries(filter?: {
  driverId?: string;
  customerEmail?: string;
  customerId?: string;
  status?: string;
}): Promise<DeliveryRecord[]> {
  const rows: any[] = await airtableList("Payments", `{provider} = 'delivery_dispatch'`, true).catch(() => []);
  let deliveries: DeliveryRecord[] = rows
    .map((row: any) => parseDeliveryRow(row))
    .filter((d: DeliveryRecord | null): d is DeliveryRecord => d !== null);

  if (filter?.driverId) {
    deliveries = deliveries.filter((d) => d.driver_id === filter.driverId);
  }
  if (filter?.customerEmail || filter?.customerId) {
    const cleanEmail = (filter.customerEmail || "").toLowerCase().trim();
    deliveries = deliveries.filter(
      (d) =>
        (filter.customerId && d.customer_id === filter.customerId) ||
        (cleanEmail && d.customer_email === cleanEmail)
    );
  }
  if (filter?.status && filter.status !== "all") {
    const st = filter.status.toUpperCase().trim();
    deliveries = deliveries.filter((d) => d.delivery_status === st);
  }

  deliveries.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return deliveries;
}

export async function getDeliveryById(id: string): Promise<DeliveryRecord | null> {
  const raw: any = await airtableGet("Payments", id).catch(() => null);
  if (!raw || String(raw.provider || "").toLowerCase() !== "delivery_dispatch") return null;
  return parseDeliveryRow(raw);
}

export async function getDeliveryByOrderIdOrNumber(
  orderId?: string | null,
  orderNumber?: string | null
): Promise<DeliveryRecord | null> {
  const all = await listDeliveries();
  return (
    all.find(
      (d) =>
        (orderId && d.order_id === orderId) ||
        (orderNumber && d.order_number.toUpperCase() === orderNumber.toUpperCase())
    ) || null
  );
}

export async function createDeliveryRecord(
  input: Omit<
    DeliveryRecord,
    | "id"
    | "delivery_ref"
    | "full_address"
    | "delivery_status"
    | "driver_id"
    | "driver_staff_code"
    | "driver_name"
    | "driver_phone"
    | "driver_vehicle"
    | "driver_acknowledged_at"
    | "confirmation_code"
    | "proof_note"
    | "proof_confirmed_code"
    | "delivered_at"
    | "failure_reason"
    | "failed_attempts"
    | "cash_collected_amount"
    | "cash_collected_at"
    | "cash_collected_by"
    | "audit_trail"
    | "messages"
    | "created_at"
    | "updated_at"
  >
): Promise<DeliveryRecord> {
  const nowIso = new Date().toISOString();
  const deliveryRef = `DLV-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  const confirmationCode = generateDeliveryConfirmationCode();
  const fullAddress = formatFullDeliveryAddress(input);

  const initialAudit: DeliveryAuditEvent = {
    at: nowIso,
    action: "delivery_created",
    to_status: "PENDING_ASSIGNMENT",
    by: "Checkout System",
    role: "system",
    note: `Delivery queued for ${input.zone_label} (Fee: ₱${input.delivery_fee}, ETA: ${input.estimated_delivery_time}).`,
  };

  const payload: Omit<DeliveryRecord, "id"> = {
    delivery_ref: deliveryRef,
    ...input,
    customer_email: input.customer_email.toLowerCase().trim(),
    full_address: fullAddress,
    delivery_status: "PENDING_ASSIGNMENT",
    driver_id: null,
    driver_staff_code: null,
    driver_name: null,
    driver_phone: null,
    driver_vehicle: null,
    driver_acknowledged_at: null,
    confirmation_code: confirmationCode,
    proof_note: null,
    proof_confirmed_code: null,
    delivered_at: null,
    failure_reason: null,
    failed_attempts: 0,
    cash_collected_amount: null,
    cash_collected_at: null,
    cash_collected_by: null,
    audit_trail: [initialAudit],
    messages: [],
    created_at: nowIso,
    updated_at: nowIso,
  };

  const created: any = await airtableCreate("Payments", {
    payment_ref: deliveryRef,
    order_id: input.order_id,
    order_number: input.order_number,
    amount: input.delivery_fee,
    provider: "delivery_dispatch",
    status: "PENDING_ASSIGNMENT",
    transaction_id: JSON.stringify(payload),
  });

  return { id: String(created.id), ...payload };
}

export async function saveUpdatedDeliveryRecord(record: DeliveryRecord): Promise<DeliveryRecord> {
  const { id, ...rest } = record;
  const bounded: Omit<DeliveryRecord, "id"> = {
    ...rest,
    audit_trail: rest.audit_trail.slice(-30),
    messages: rest.messages.slice(-40),
    updated_at: new Date().toISOString(),
  };

  await airtableUpdate("Payments", id, {
    status: bounded.delivery_status,
    transaction_id: JSON.stringify(bounded),
  });

  return { id, ...bounded };
}

// ============================================================================
// 4. DRIVER PROFILES (AUGMENTS EXISTING AIRTABLE STAFF TABLE)
// ============================================================================

export async function listDrivers(): Promise<DriverProfile[]> {
  const [staffRows, profileRows, allDeliveries] = await Promise.all([
    airtableList("Staff", undefined, true).catch(() => []),
    airtableList("Payments", `{provider} = 'driver_profile'`, true).catch(() => []),
    listDeliveries().catch(() => []),
  ]);

  const profileByStaffId = new Map<string, { id: string; data: any }>();
  for (const row of profileRows) {
    const data = safeJsonParse<any>(row.transaction_id);
    if (row.order_id && data) {
      profileByStaffId.set(String(row.order_id), { id: String(row.id), data });
    }
  }

  const activeStatuses = new Set<DeliveryStatus>([
    "DRIVER_ASSIGNED",
    "READY_FOR_PICKUP",
    "PICKED_UP",
    "OUT_FOR_DELIVERY",
  ]);

  const drivers: DriverProfile[] = [];
  for (const s of staffRows) {
    if (String(s.role || "").toLowerCase().trim() !== "driver") continue;
    const prof = profileByStaffId.get(String(s.id));
    const activeCount = allDeliveries.filter(
      (d) => d.driver_id === String(s.id) && activeStatuses.has(d.delivery_status)
    ).length;

    const storedAvailability = prof?.data?.availability_status as DriverAvailabilityStatus | undefined;
    const resolvedAvailability: DriverAvailabilityStatus =
      !Boolean(s.is_active)
        ? "offline"
        : storedAvailability || (activeCount > 0 ? "on_delivery" : "available");

    drivers.push({
      id: String(s.id),
      profile_record_id: prof?.id || null,
      staff_id: String(s.staff_id || ""),
      full_name: String(s.full_name || "Delivery Driver"),
      email: String(s.email || "").toLowerCase().trim(),
      phone: String(prof?.data?.phone || ""),
      vehicle_type: String(prof?.data?.vehicle_type || "Motorcycle"),
      plate_number: String(prof?.data?.plate_number || ""),
      shift: String(s.shift || "Day Shift"),
      is_active: Boolean(s.is_active),
      availability_status: resolvedAvailability,
      active_deliveries_count: activeCount,
    });
  }

  return drivers;
}

export async function upsertDriverProfileMeta(
  staffRecordId: string,
  meta: {
    phone?: string;
    vehicle_type?: string;
    plate_number?: string;
    availability_status?: DriverAvailabilityStatus;
  }
): Promise<void> {
  const safeId = escapeFormulaString(staffRecordId);
  const existing = await airtableList(
    "Payments",
    `AND({provider} = 'driver_profile', {order_id} = '${safeId}')`,
    true
  ).catch(() => []);

  const currentData = existing.length > 0 ? safeJsonParse<any>(existing[0].transaction_id) || {} : {};
  const nextData = {
    phone: meta.phone !== undefined ? meta.phone.trim() : currentData.phone || "",
    vehicle_type: meta.vehicle_type !== undefined ? meta.vehicle_type.trim() : currentData.vehicle_type || "Motorcycle",
    plate_number: meta.plate_number !== undefined ? meta.plate_number.trim() : currentData.plate_number || "",
    availability_status: meta.availability_status || currentData.availability_status || "available",
    updated_at: new Date().toISOString(),
  };

  if (existing.length > 0) {
    await airtableUpdate("Payments", existing[0].id, {
      status: nextData.availability_status,
      transaction_id: JSON.stringify(nextData),
    });
  } else {
    await airtableCreate("Payments", {
      payment_ref: `DRV-${staffRecordId.slice(-8).toUpperCase()}`,
      order_id: staffRecordId,
      order_number: "DRIVER-PROFILE",
      amount: 0,
      provider: "driver_profile",
      status: nextData.availability_status,
      transaction_id: JSON.stringify(nextData),
    });
  }
}

// ============================================================================
// 5. REAL IN-APP CUSTOMER NOTIFICATIONS
// ============================================================================

export async function createCustomerNotification(input: {
  customer_id: string;
  customer_email: string;
  order_id: string;
  order_number: string;
  event_type: string;
  title: string;
  message: string;
}): Promise<CustomerNotification | null> {
  try {
    const nowIso = new Date().toISOString();
    const ref = `NTF-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const payload = {
      notification_ref: ref,
      customer_id: input.customer_id,
      customer_email: input.customer_email.toLowerCase().trim(),
      order_id: input.order_id,
      order_number: input.order_number,
      event_type: input.event_type,
      title: input.title,
      message: input.message,
      is_read: false,
      created_at: nowIso,
    };

    const created: any = await airtableCreate("Payments", {
      payment_ref: ref,
      order_id: input.customer_id || input.order_id,
      order_number: "NOTIFICATION",
      amount: 0,
      provider: "customer_notification",
      status: "unread",
      transaction_id: JSON.stringify(payload),
    });

    return { id: String(created.id), ...payload };
  } catch (err) {
    console.warn("Notification write warning:", err);
    return null;
  }
}

export async function listCustomerNotifications(
  customerId: string,
  customerEmail: string
): Promise<CustomerNotification[]> {
  const cleanEmail = customerEmail.toLowerCase().trim();
  const rows = await airtableList("Payments", `{provider} = 'customer_notification'`, true).catch(() => []);
  const items: CustomerNotification[] = [];

  for (const row of rows) {
    const data = safeJsonParse<Partial<CustomerNotification>>(row.transaction_id);
    if (!data) continue;
    const isOwner =
      (customerId && (String(row.order_id || "") === customerId || String(data.customer_id || "") === customerId)) ||
      (cleanEmail && String(data.customer_email || "").toLowerCase().trim() === cleanEmail);
    if (!isOwner) continue;

    items.push({
      id: String(row.id),
      notification_ref: String(row.payment_ref || data.notification_ref || row.id),
      customer_id: String(data.customer_id || customerId),
      customer_email: cleanEmail,
      order_id: String(data.order_id || ""),
      order_number: String(data.order_number || ""),
      event_type: String(data.event_type || "status_update"),
      title: String(data.title || "Order Update"),
      message: String(data.message || ""),
      is_read: Boolean(data.is_read) || String(row.status || "") === "read",
      created_at: String(row.created_at || data.created_at || new Date().toISOString()),
    });
  }

  items.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return items.slice(0, 50);
}

export async function markCustomerNotificationsRead(
  customerId: string,
  customerEmail: string,
  notificationId?: string
): Promise<number> {
  const list = await listCustomerNotifications(customerId, customerEmail);
  const targets = notificationId
    ? list.filter((n) => n.id === notificationId && !n.is_read)
    : list.filter((n) => !n.is_read);

  let updated = 0;
  for (const n of targets) {
    const { id, ...rest } = n;
    await airtableUpdate("Payments", id, {
      status: "read",
      transaction_id: JSON.stringify({ ...rest, is_read: true }),
    }).catch(() => {});
    updated += 1;
  }
  return updated;
}

export type { DeliveryMessageOrIssue };
