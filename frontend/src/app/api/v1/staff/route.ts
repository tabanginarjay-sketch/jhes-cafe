import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate } from "@/lib/airtable";
import { getAuthenticatedAdmin } from "@/lib/serverAuth";

export async function GET(req: NextRequest) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { detail: "Administrator authentication required." },
      { status: 401 }
    );
  }

  try {
    const records = await airtableList("Staff", undefined, true);
    const normalized = records.map((r: any) => ({ ...r, is_active: Boolean(r.is_active) }));
    return NextResponse.json(normalized, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to load staff roster from Airtable" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { detail: "Administrator authentication required." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const fullName = String(body.full_name || body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();

    if (!fullName || !email) {
      return NextResponse.json(
        { detail: "Staff full_name and email are required." },
        { status: 400 }
      );
    }

    const existing = await airtableList("Staff", undefined, true).catch(() => []);
    const nextNum = String(existing.length + 1).padStart(2, "0");
    const staffId = String(body.staff_id || `BARISTA-${nextNum}`).trim();

    // Matches actual Airtable Staff table schema: staff_id, full_name, email, role, shift, is_active
    const created = await airtableCreate("Staff", {
      staff_id: staffId,
      full_name: fullName,
      email,
      role: body.role || "barista",
      shift: body.shift || "Morning",
      is_active: body.is_active !== false,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error creating staff record" },
      { status: 500 }
    );
  }
}
