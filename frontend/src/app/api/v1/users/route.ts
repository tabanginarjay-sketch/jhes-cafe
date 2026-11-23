import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate } from "@/lib/airtable";

export async function GET() {
  try {
    const records = await airtableList("Users");
    return NextResponse.json(records);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error listing users" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const existing = await airtableList("Users", `{email} = '${body.email}'`).catch(() => []);
    if (existing.length > 0) {
      return NextResponse.json(existing[0], { status: 200 });
    }
    const created = await airtableCreate("Users", {
      full_name: body.full_name,
      email: body.email,
      phone: body.phone ? String(body.phone) : undefined,
      role: body.role || "customer",
      loyalty_points: 25,
      is_active: true,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error creating user" },
      { status: 500 }
    );
  }
}
