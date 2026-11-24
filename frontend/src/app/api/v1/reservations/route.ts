import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate } from "@/lib/airtable";

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

    return NextResponse.json(filtered, {
      headers: {
        "Cache-Control": "no-store",
        "X-Storage-Mode": storageMode,
      },
    });
  } catch {
    return NextResponse.json(inMemoryReservations, {
      headers: {
        "Cache-Control": "no-store",
        "X-Storage-Mode": "demo_memory",
      },
    });
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
      customer_name: String(customer_name).trim(),
      customer_email: String(customer_email).trim().toLowerCase(),
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
