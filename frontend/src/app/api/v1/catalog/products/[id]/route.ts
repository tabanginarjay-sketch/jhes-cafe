import { NextRequest, NextResponse } from "next/server";
import { airtableGet, airtableUpdate, airtableDelete } from "@/lib/airtable";
import { getAuthenticatedAdmin } from "@/lib/serverAuth";
import { getProductImage, resolveCanonicalSlug } from "@/lib/productRegistry";
import { getProductType } from "@/lib/productCustomization";

const PRODUCTS_TABLE = "tblcQD4QoANpq0ytK";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const record: any = await airtableGet(PRODUCTS_TABLE, id);
    const slug = resolveCanonicalSlug(record.name || id);
    return NextResponse.json(
      {
        ...record,
        slug,
        product_type: getProductType(record),
        image_url: getProductImage({ ...record, slug }),
        is_available: record.is_available !== false,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Product not found" },
      { status: 404 }
    );
  }
}

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
    if (body.category_name !== undefined) fieldsToUpdate.category_name = String(body.category_name).trim();
    if (body.price !== undefined) {
      const priceNum = Number(body.price);
      if (Number.isNaN(priceNum) || priceNum < 0) {
        return NextResponse.json({ detail: "Invalid price value." }, { status: 400 });
      }
      fieldsToUpdate.price = priceNum;
    }
    if (body.origin !== undefined) fieldsToUpdate.origin = String(body.origin).trim();
    if (body.roast_level !== undefined) fieldsToUpdate.roast_level = String(body.roast_level).trim();
    if (body.tasting_notes !== undefined) fieldsToUpdate.tasting_notes = String(body.tasting_notes).trim();
    if (body.is_available !== undefined) fieldsToUpdate.is_available = Boolean(body.is_available);
    if (body.tag !== undefined) fieldsToUpdate.tag = String(body.tag).trim();

    if (Object.keys(fieldsToUpdate).length === 0) {
      return NextResponse.json({ detail: "No valid fields to update." }, { status: 400 });
    }

    const updated: any = await airtableUpdate(PRODUCTS_TABLE, id, fieldsToUpdate);
    const slug = resolveCanonicalSlug(updated.name || id);
    return NextResponse.json({
      ...updated,
      slug,
      product_type: getProductType(updated),
      image_url: getProductImage({ ...updated, slug }),
      is_available: updated.is_available !== false,
    });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to update product" },
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
    await airtableDelete(PRODUCTS_TABLE, id);
    return NextResponse.json({ deleted: true, id });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to delete product" },
      { status: 500 }
    );
  }
}
