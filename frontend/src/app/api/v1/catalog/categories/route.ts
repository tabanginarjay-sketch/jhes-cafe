import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate } from "@/lib/airtable";

const DEFAULT_CATEGORIES = [
  { id: "cat1", name: "Signature Espresso", slug: "signature-espresso", count: 2, order: 1 },
  { id: "cat2", name: "Cold Brews", slug: "cold-brews", count: 1, order: 2 },
  { id: "cat3", name: "Warm Classics", slug: "warm-classics", count: 1, order: 3 },
  { id: "cat4", name: "Artisanal Pastries", slug: "artisanal-pastries", count: 2, order: 4 },
];

export async function GET() {
  try {
    const records = await airtableList("Categories", undefined, true);
    if (records.length > 0) {
      return NextResponse.json(records);
    }
    return NextResponse.json(DEFAULT_CATEGORIES);
  } catch {
    return NextResponse.json(DEFAULT_CATEGORIES);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const slug = (body.name || "category")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const created = await airtableCreate("Categories", {
      name: body.name,
      slug: body.slug || slug,
      display_order: Number(body.display_order) || 5,
      description: body.description || "",
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error adding category" },
      { status: 500 }
    );
  }
}
