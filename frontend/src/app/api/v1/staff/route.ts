import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate } from "@/lib/airtable";

const DEFAULT_STAFF = [
  { id: "BARISTA-01", name: "Jhe Tabangin", email: "jhe@jhescafe.ph", role: "Head Roaster & Cafe Lead", shift: "Morning (6:00 AM - 2:00 PM)", status: "Active" },
  { id: "BARISTA-02", name: "Carlo Dizon", email: "carlo@brewandco.ph", role: "Senior Espresso Barista", shift: "Mid (10:00 AM - 6:00 PM)", status: "Active" },
  { id: "BARISTA-03", name: "Ana Reyes", email: "ana@brewandco.ph", role: "Latte Artist & Barista", shift: "Closing (2:00 PM - 10:00 PM)", status: "Active" },
  { id: "BARISTA-04", name: "Mark Mendoza", email: "mark@brewandco.ph", role: "Cold Brew Specialist", shift: "Morning (6:00 AM - 2:00 PM)", status: "Active" },
];

export async function GET() {
  try {
    const records = await airtableList("Staff", undefined, true);
    if (records.length > 0) {
      return NextResponse.json(records);
    }
    return NextResponse.json(DEFAULT_STAFF);
  } catch {
    return NextResponse.json(DEFAULT_STAFF);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const created = await airtableCreate("Staff", {
      name: body.name,
      email: body.email,
      role: body.role || "Barista",
      shift: body.shift || "Morning",
      status: "Active",
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error creating staff record" },
      { status: 500 }
    );
  }
}
