import { NextRequest, NextResponse } from "next/server";
import { airtableUpdate, airtableDelete } from "@/lib/airtable";
import { getAuthenticatedAdmin } from "@/lib/serverAuth";

const CATEGORY_TABLE = "Category";

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
    const fieldsToUpdate: Record<string, unknown> = {};
    if (body.name !== undefined) fieldsToUpdate.name = String(body.name).trim();
    if (body.slug !== undefined) fieldsToUpdate.slug = String(body.slug).trim();
    if (body.description !== undefined) fieldsToUpdate.description = String(body.description).trim();
    if (body.display_order !== undefined) fieldsToUpdate.display_order = Number(body.display_order);
    if (body.is_active !== undefined) fieldsToUpdate.is_active = Boolean(body.is_active);

    const updated = await airtableUpdate(CATEGORY_TABLE, id, fieldsToUpdate);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to update category" },
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
    await airtableDelete(CATEGORY_TABLE, id);
    return NextResponse.json({ deleted: true, id });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to delete category" },
      { status: 500 }
    );
  }
}
