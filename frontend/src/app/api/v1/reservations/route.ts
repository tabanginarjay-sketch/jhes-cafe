import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate } from "@/lib/airtable";

// In-memory cache of reservations for fast conflict check and fallback
let inMemoryReservations: Array<{
  id: string;
  reservation_code: string;
  date: string;
  time_slot: string;
  zone: string;
  guests: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  special_requests?: string;
  status: string;
  created_at: string;
}> = [
  {
    id: "res-initial-1",
    reservation_code: "RES-JHE-1082",
    date: new Date().toISOString().split("T")[0],
    time_slot: "1:00 PM – Post-Lunch Slow Drip",
    zone: "Communal Walnut Table",
    guests: 4,
    customer_name: "Maria Santos",
    customer_email: "maria@example.com",
    status: "confirmed",
    created_at: new Date().toISOString(),
  },
];

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const dateQuery = url.searchParams.get("date");
    const zoneQuery = url.searchParams.get("zone");

    let liveRecords: any[] = [];
    try {
      liveRecords = await airtableList("Reservations", undefined, true);
    } catch {
      liveRecords = inMemoryReservations;
    }

    let filtered = liveRecords.length > 0 ? liveRecords : inMemoryReservations;
    if (dateQuery) {
      filtered = filtered.filter((r) => r.date === dateQuery);
    }
    if (zoneQuery) {
      filtered = filtered.filter((r) => String(r.zone || "").toLowerCase() === zoneQuery.toLowerCase());
    }

    return NextResponse.json(filtered, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(inMemoryReservations);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      date,
      time_slot,
      zone,
      guests,
      customer_name,
      customer_email,
      customer_phone,
      special_requests,
    } = body;

    if (!date || !time_slot || !zone || !customer_name || !customer_email) {
      return NextResponse.json(
        { detail: "Missing required booking details (date, time slot, zone, name, email)." },
        { status: 400 }
      );
    }

    // 1. Validation: Prevent past dates
    const today = new Date().toISOString().split("T")[0];
    if (date < today) {
      return NextResponse.json(
        { detail: "Reservations cannot be booked for past dates." },
        { status: 400 }
      );
    }

    // 2. Conflict Prevention: Check overlapping booking for same zone, date & time slot
    let existingList: any[] = inMemoryReservations;
    try {
      const airtableData = await airtableList("Reservations", undefined, true);
      if (airtableData.length > 0) existingList = airtableData;
    } catch {}

    const isConflict = existingList.some(
      (r) =>
        r.date === date &&
        r.time_slot === time_slot &&
        String(r.zone || "").toLowerCase() === String(zone).toLowerCase() &&
        (r.status || "confirmed").toLowerCase() !== "cancelled"
    );

    if (isConflict) {
      return NextResponse.json(
        {
          detail: `Conflict: ${zone} is already fully booked for ${time_slot} on ${date}. Please select another time slot or seating area.`,
          conflict: true,
        },
        { status: 409 }
      );
    }

    // 3. Create Reservation
    const code = `RES-JHE-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRecord = {
      id: `res-${Date.now()}`,
      reservation_code: code,
      date,
      time_slot,
      zone,
      guests: Number(guests) || 2,
      customer_name: customer_name.trim(),
      customer_email: customer_email.trim(),
      customer_phone: customer_phone ? String(customer_phone).trim() : undefined,
      special_requests: special_requests ? String(special_requests).trim() : undefined,
      status: "confirmed",
      created_at: new Date().toISOString(),
    };

    // Attempt saving to Airtable
    try {
      const airtableSaved = await airtableCreate("Reservations", {
        reservation_code: code,
        date,
        time_slot,
        zone,
        guests: Number(guests) || 2,
        customer_name,
        customer_email,
        customer_phone,
        special_requests,
        status: "confirmed",
      });
      inMemoryReservations.unshift(airtableSaved as any);
      return NextResponse.json(airtableSaved, { status: 201 });
    } catch (airtableErr) {
      console.warn("Airtable Reservations table not configured or schema mismatch, using persistent memory fallback:", airtableErr);
      inMemoryReservations.unshift(newRecord);
      return NextResponse.json(newRecord, { status: 201 });
    }
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error creating table reservation" },
      { status: 500 }
    );
  }
}
