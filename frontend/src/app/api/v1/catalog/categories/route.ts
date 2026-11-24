import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate } from "@/lib/airtable";
import { CENTRALIZED_CATALOG } from "@/lib/productRegistry";

const countByCategory = (name: string) =>
  CENTRALIZED_CATALOG.filter((p) => p.category_name === name).length;

const DEFAULT_CATEGORIES = [
  { id: "cat1", name: "Signature Espresso", slug: "signature-espresso", count: countByCategory("Signature Espresso"), order: 1 },
  { id: "cat2", name: "Cold Brews", slug: "cold-brews", count: countByCategory("Cold Brews"), order: 2 },
  { id: "cat3", name: "Warm Classics", slug: "warm-classics", count: countByCategory("Warm Classics"), order: 3 },
  { id: "cat4", name: "Artisanal Pastries", slug: "artisanal-pastries", count: countByCategory("Artisanal Pastries"), order: 4 },
];

export async function GET() {
  try {
    const records = await airtableList("Categories", undefined, true);
    if (records.length > 0) {
      // Deduplicate categories by normalized name
      const seen = new Set<string>();
      const unique = records.filter((c: any) => {
        const key = String(c.name || "").trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return NextResponse.json(unique);
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
