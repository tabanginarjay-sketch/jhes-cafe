import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate } from "@/lib/airtable";
import { getAuthenticatedAdmin, getAuthenticatedUser } from "@/lib/serverAuth";

interface ReservationRecord {
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
  storage_mode?: "airtable" | "demo_memory";
  created_at: string;
}

const globalForRes = globalThis as unknown as {
  __jhesReservations?: ReservationRecord[];
};

const inMemoryReservations: ReservationRecord[] =
  globalForRes.__jhesReservations || (globalForRes.__jhesReservations = []);

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const dateQuery = url.searchParams.get("date");
    const zoneQuery = url.searchParams.get("zone");

    let liveRecords: any[] = [];
    let storageMode: "airtable" | "demo_memory" = "airtable";
    try {
      liveRecords = await airtableList("Reservations", undefined, true);
    } catch {
      storageMode = "demo_memory";
      liveRecords = inMemoryReservations;
    }

    let filtered = liveRecords;
    if (dateQuery) {
      filtered = filtered.filter((r) => r.date === dateQuery);
    }
    if (zoneQuery) {
      filtered = filtered.filter(
        (r) => String(r.zone || "").toLowerCase() === zoneQuery.toLowerCase()
      );
    }

    const admin = getAuthenticatedAdmin(req);
    const user = getAuthenticatedUser(req);

    // Protect customer PII: guests receive only slot availability; customers see details only for their own bookings
    const sanitized = filtered.map((r) => {
      const isOwn =
        Boolean(admin) ||
        Boolean(user?.email && r.customer_email && String(r.customer_email).toLowerCase() === user.email.toLowerCase());
      if (isOwn) return r;
      return {
        id: r.id,
        date: r.date,
        time_slot: r.time_slot,
        zone: r.zone,
        status: r.status || "confirmed",
      };
    });

    return NextResponse.json(sanitized, {
      headers: {
        "Cache-Control": "no-store",
        "X-Storage-Mode": storageMode,
      },
    });
  } catch {
    const admin = getAuthenticatedAdmin(req);
    const sanitizedMem = inMemoryReservations.map((r) =>
      admin
        ? r
        : {
            id: r.id,
            date: r.date,
            time_slot: r.time_slot,
            zone: r.zone,
            status: r.status || "confirmed",
          }
    );
    return NextResponse.json(sanitizedMem, {
      headers: {
        "Cache-Control": "no-store",
        "X-Storage-Mode": "demo_memory",
      },
    });
  }
}

export async function POST(req: NextRequest) {
  const admin = getAuthenticatedAdmin(req);
  const user = getAuthenticatedUser(req);
  if (!user && !admin) {
    return NextResponse.json(
      { detail: "Authentication required to book a table. Please sign in first." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const {
      date,
      time_slot,
      zone,
      guests,
      customer_phone,
      special_requests,
    } = body;

    // Bind reservation identity strictly to the server-verified session for customer requests
    const verifiedName = !admin && user ? user.name || String(body.customer_name || "").trim() : String(body.customer_name || admin?.name || "").trim();
    const verifiedEmail = !admin && user ? user.email.toLowerCase().trim() : String(body.customer_email || admin?.email || "").toLowerCase().trim();

    if (!date || !time_slot || !zone || !verifiedName || !verifiedEmail) {
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

    // 2. Conflict Prevention
    let existingList: any[] = inMemoryReservations;
    let airtableAvailable = false;
    try {
      const airtableData = await airtableList("Reservations", undefined, true);
      existingList = airtableData;
      airtableAvailable = true;
    } catch {
      airtableAvailable = false;
    }

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
          detail: `Conflict: ${zone} is already booked for ${time_slot} on ${date}. Please select another time slot or seating area.`,
          conflict: true,
        },
        { status: 409 }
      );
    }

    const code = `RES-JHE-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRecord: ReservationRecord = {
      id: `res-${Date.now()}`,
      reservation_code: code,
      date,
      time_slot,
      zone,
      guests: Number(guests) || 2,
      customer_name: verifiedName,
      customer_email: verifiedEmail,
      customer_phone: customer_phone ? String(customer_phone).trim() : undefined,
      special_requests: special_requests ? String(special_requests).trim() : undefined,
      status: "confirmed",
      created_at: new Date().toISOString(),
    };

    if (airtableAvailable) {
      try {
        const airtableSaved = await airtableCreate("Reservations", {
          reservation_code: code,
          date,
          time_slot,
          zone,
          guests: Number(guests) || 2,
          customer_name: newRecord.customer_name,
          customer_email: newRecord.customer_email,
          ...(newRecord.customer_phone ? { customer_phone: newRecord.customer_phone } : {}),
          ...(newRecord.special_requests ? { special_requests: newRecord.special_requests } : {}),
          status: "confirmed",
        });
        return NextResponse.json(
          { ...airtableSaved, storage_mode: "airtable" },
          { status: 201 }
        );
      } catch {
        // Fall through to transparent demo memory mode
      }
    }

    const memoryRecord: ReservationRecord = {
      ...newRecord,
      storage_mode: "demo_memory",
    };
    inMemoryReservations.unshift(memoryRecord);
    return NextResponse.json(memoryRecord, {
      status: 201,
      headers: { "X-Storage-Mode": "demo_memory" },
    });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error creating table reservation" },
      { status: 500 }
    );
  }
}
