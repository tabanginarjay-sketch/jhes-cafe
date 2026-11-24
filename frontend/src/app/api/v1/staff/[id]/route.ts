import { NextRequest, NextResponse } from "next/server";
import { airtableUpdate, airtableDelete } from "@/lib/airtable";
import { getAuthenticatedAdmin } from "@/lib/serverAuth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { detail: "Administrator authentication required." },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const fields: Record<string, unknown> = {};
    if (body.full_name !== undefined) fields.full_name = String(body.full_name).trim();
    if (body.email !== undefined) fields.email = String(body.email).trim().toLowerCase();
    if (body.role !== undefined) fields.role = String(body.role).trim();
    if (body.shift !== undefined) fields.shift = String(body.shift).trim();
    if (body.is_active !== undefined) fields.is_active = Boolean(body.is_active);

    const updated = await airtableUpdate("Staff", id, fields);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error updating staff record" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { detail: "Administrator authentication required." },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    await airtableDelete("Staff", id);
    return NextResponse.json({ deleted: true, id });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error removing staff record" },
      { status: 500 }
    );
  }
}
