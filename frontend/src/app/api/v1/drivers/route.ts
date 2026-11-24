import { NextRequest, NextResponse } from "next/server";
import { airtableCreate, airtableList, airtableUpdate } from "@/lib/airtable";
import { escapeFormulaString, getAuthenticatedAdmin, getAuthenticatedDriver } from "@/lib/serverAuth";
import { listDrivers, upsertDriverProfileMeta } from "@/lib/deliveryStore";
import type { DriverAvailabilityStatus } from "@/lib/deliveryTypes";

const VALID_AVAILABILITY = new Set<DriverAvailabilityStatus>(["available", "on_delivery", "offline"]);

/**
 * GET /api/v1/drivers
 * Admin-only: lists all delivery drivers with live active-delivery counts and availability.
 */
export async function GET(req: NextRequest) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { detail: "Administrator authentication required to view drivers." },
      { status: 401 }
    );
  }

  try {
    const drivers = await listDrivers();
    return NextResponse.json(
      { drivers },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to load drivers." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/drivers
 * Admin-only: creates a new delivery driver record in Airtable Staff (role = "driver")
 * along with phone, vehicle type, plate number, and availability metadata.
 */
export async function POST(req: NextRequest) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { detail: "Administrator authentication required to create drivers." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const fullName = String(body.full_name || "").trim();
    const email = String(body.email || "").toLowerCase().trim();
    const phone = String(body.phone || "").trim();
    const vehicleType = String(body.vehicle_type || "Motorcycle").trim();
    const plateNumber = String(body.plate_number || "").trim();
    const shift = String(body.shift || "Day Shift").trim();

    if (fullName.length < 2 || !email.includes("@") || phone.length < 7) {
      return NextResponse.json(
        { detail: "Driver full name, valid email address, and contact phone number are required." },
        { status: 400 }
      );
    }

    const safeEmail = escapeFormulaString(email);
    const dup = await airtableList("Staff", `LOWER({email}) = '${safeEmail}'`, true).catch(() => []);
    if (dup.length > 0) {
      return NextResponse.json(
        { detail: "A staff/driver record with this email already exists." },
        { status: 409 }
      );
    }

    const existingDrivers = await listDrivers().catch(() => []);
    const nextCode = `DRIVER-${String(existingDrivers.length + 1).padStart(2, "0")}`;
    const staffId = String(body.staff_id || nextCode).trim().toUpperCase();

    const createdStaff: any = await airtableCreate("Staff", {
      staff_id: staffId,
      full_name: fullName,
      email,
      role: "driver",
      shift,
      is_active: true,
    });

    await upsertDriverProfileMeta(String(createdStaff.id), {
      phone,
      vehicle_type: vehicleType,
      plate_number: plateNumber,
      availability_status: "available",
    });

    return NextResponse.json(
      {
        id: String(createdStaff.id),
        staff_id: staffId,
        full_name: fullName,
        email,
        phone,
        vehicle_type: vehicleType,
        plate_number: plateNumber,
        shift,
        is_active: true,
        availability_status: "available",
        active_deliveries_count: 0,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to create driver." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/drivers
 * Admin may update any driver's details/availability/active flag.
 * An authenticated driver may update ONLY their own availability_status.
 */
export async function PATCH(req: NextRequest) {
  const admin = getAuthenticatedAdmin(req);
  const driver = getAuthenticatedDriver(req);

  if (!admin && !driver) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const targetId = admin ? String(body.id || "").trim() : driver!.sub;

    if (!targetId) {
      return NextResponse.json({ detail: "Driver id is required." }, { status: 400 });
    }
    if (!admin && driver && targetId !== driver.sub) {
      return NextResponse.json(
        { detail: "Drivers may only update their own availability status." },
        { status: 403 }
      );
    }

    const avail = body.availability_status
      ? (String(body.availability_status).toLowerCase().trim() as DriverAvailabilityStatus)
      : undefined;
    if (avail && !VALID_AVAILABILITY.has(avail)) {
      return NextResponse.json(
        { detail: "Invalid availability status. Allowed: available, on_delivery, offline." },
        { status: 400 }
      );
    }

    if (admin && body.is_active !== undefined) {
      await airtableUpdate("Staff", targetId, { is_active: Boolean(body.is_active) });
    }

    await upsertDriverProfileMeta(targetId, {
      ...(admin && body.phone !== undefined ? { phone: String(body.phone) } : {}),
      ...(admin && body.vehicle_type !== undefined ? { vehicle_type: String(body.vehicle_type) } : {}),
      ...(admin && body.plate_number !== undefined ? { plate_number: String(body.plate_number) } : {}),
      ...(avail ? { availability_status: avail } : {}),
    });

    const updatedList = await listDrivers();
    const updatedDriver = updatedList.find((d) => d.id === targetId);
    return NextResponse.json(updatedDriver || { id: targetId, updated: true });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to update driver." },
      { status: 500 }
    );
  }
}
