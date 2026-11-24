import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate } from "@/lib/airtable";
import { getAuthenticatedAdmin } from "@/lib/serverAuth";

const CATEGORY_TABLE = "Category";

export async function GET() {
  try {
    const records = await airtableList(CATEGORY_TABLE, undefined, true);
    const seen = new Set<string>();
    const unique = records
      .filter((c: any) => {
        const key = String(c.name || "").trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((c: any) => ({ ...c, is_active: Boolean(c.is_active) }))
      .sort((a: any, b: any) => (Number(a.display_order) || 99) - (Number(b.display_order) || 99));

    return NextResponse.json(unique, {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to load categories from Airtable" },
      { status: 502 }
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
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ detail: "Category name is required." }, { status: 400 });
    }
    const slug = (body.slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const created = await airtableCreate(CATEGORY_TABLE, {
      name,
      slug,
      display_order: Number(body.display_order) || 5,
      description: body.description ? String(body.description).trim() : "",
      is_active: body.is_active !== false,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error adding category" },
      { status: 500 }
    );
  }
}
