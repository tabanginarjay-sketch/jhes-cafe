import { NextRequest, NextResponse } from "next/server";
import { airtableList } from "@/lib/airtable";
import { getAuthenticatedDriver } from "@/lib/serverAuth";
import { listDeliveries } from "@/lib/deliveryStore";

/**
 * GET /api/v1/driver/deliveries
 * Strictly role-protected Driver Portal endpoint.
 * Returns ONLY deliveries explicitly assigned to the authenticated driver's Staff ID.
 * Never returns unassigned orders, other drivers' orders, or admin payment controls.
 */
export async function GET(req: NextRequest) {
  const driver = getAuthenticatedDriver(req);
  if (!driver) {
    return NextResponse.json(
      { detail: "Driver authentication required." },
      { status: 401, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  try {
    const assigned = await listDeliveries({ driverId: driver.sub });

    // Attach itemized product names & quantities needed for handoff verification
    const allItems = assigned.length > 0 ? await airtableList("OrderItems", undefined, true).catch(() => []) : [];
    const itemsByOrder = new Map<string, any[]>();
    for (const item of allItems) {
      const key = String(item.order_id || "").trim();
      if (!key) continue;
      const arr = itemsByOrder.get(key) || [];
      arr.push({
        id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        size: item.size,
        temperature: item.temperature,
      });
      itemsByOrder.set(key, arr);
    }

    // Mask customer confirmation_code so driver must actually obtain it from customer (or provide proof note)
    const driverView = assigned.map((d) => ({
      ...d,
      confirmation_code: undefined, // Never leak expected code to driver before customer gives it
      has_confirmation_code: Boolean(d.confirmation_code),
      items: itemsByOrder.get(d.order_id) || itemsByOrder.get(d.order_number) || [],
    }));

    return NextResponse.json(
      { deliveries: driverView, total: driverView.length },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to load assigned deliveries." },
      { status: 500 }
    );
  }
}
