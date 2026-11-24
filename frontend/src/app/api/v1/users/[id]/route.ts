import { NextRequest, NextResponse } from "next/server";
import { airtableDelete, airtableGet } from "@/lib/airtable";
import { getAuthenticatedAdmin } from "@/lib/serverAuth";

export async function GET(
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
    const record: any = await airtableGet("Users", id);
    const { password_hash: _pw, ...safeUser } = record;
    return NextResponse.json(safeUser, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "User not found" },
      { status: 404 }
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
    await airtableDelete("Users", id);
    return NextResponse.json({ deleted: true, id });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error deleting user" },
      { status: 500 }
    );
  }
}
