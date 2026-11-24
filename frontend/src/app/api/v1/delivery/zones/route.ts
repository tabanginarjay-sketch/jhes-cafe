import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/serverAuth";
import { createDeliveryZone, listDeliveryZones } from "@/lib/deliveryStore";
import { normalizeGeoText } from "@/lib/deliveryTypes";

/**
 * GET /api/v1/delivery/zones
 * Public/Customer callers receive ONLY active serviceable delivery zones (zero hardcoded rates).
 * Admin callers with ?include_inactive=true receive all configured zones.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = getAuthenticatedAdmin(req);
    const { searchParams } = new URL(req.url);
    const includeInactive = Boolean(admin) && searchParams.get("include_inactive") === "true";

    const zones = await listDeliveryZones(!includeInactive);
    return NextResponse.json(
      { zones, total: zones.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to load delivery zones." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/delivery/zones
 * Admin-only: creates a new serviceable delivery zone in Airtable.
 */
export async function POST(req: NextRequest) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { detail: "Administrator authentication required to configure delivery zones." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const city = String(body.city || "").trim();
    const barangay = String(body.barangay || "").trim();
    const areaLabel = String(body.area_label || `${barangay}, ${city}`).trim();
    const deliveryFee = Number(body.delivery_fee);
    const minOrderAmount = Number(body.min_order_amount ?? 0);
    const estimatedMinutes = String(body.estimated_minutes || "30–45 mins").trim();
    const isActive = body.is_active !== false;

    if (city.length < 2 || barangay.length < 2) {
      return NextResponse.json(
        { detail: "Valid city and barangay names (at least 2 characters each) are required." },
        { status: 400 }
      );
    }
    if (!Number.isFinite(deliveryFee) || deliveryFee < 0 || deliveryFee > 2000) {
      return NextResponse.json(
        { detail: "Delivery fee must be a valid non-negative PHP amount (0–2000)." },
        { status: 400 }
      );
    }
    if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0 || minOrderAmount > 10000) {
      return NextResponse.json(
        { detail: "Minimum order amount must be a valid non-negative PHP amount." },
        { status: 400 }
      );
    }

    const existing = await listDeliveryZones(false);
    const dup = existing.find(
      (z) =>
        normalizeGeoText(z.city) === normalizeGeoText(city) &&
        normalizeGeoText(z.barangay) === normalizeGeoText(barangay)
    );
    if (dup) {
      return NextResponse.json(
        { detail: `Delivery zone for Brgy. ${barangay}, ${city} already exists.` },
        { status: 409 }
      );
    }

    const created = await createDeliveryZone({
      city,
      barangay,
      area_label: areaLabel,
      delivery_fee: deliveryFee,
      min_order_amount: minOrderAmount,
      estimated_minutes: estimatedMinutes,
      is_active: isActive,
      updated_by: admin.name,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to create delivery zone." },
      { status: 500 }
    );
  }
}
