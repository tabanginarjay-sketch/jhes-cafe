import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate } from "@/lib/airtable";
import {
  CENTRALIZED_CATALOG,
  dedupeAndMergeCatalog,
  getProductImage,
  resolveCanonicalSlug,
} from "@/lib/productRegistry";
import { getProductType } from "@/lib/productCustomization";

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");
  try {
    const formula = category ? `{category_name} = '${category}'` : undefined;
    const records = await airtableList("tblcQD4QoANpq0ytK", formula, true);

    // Strictly deduplicate & merge with canonical catalog so no duplicate slugs/names ever occur
    const merged = dedupeAndMergeCatalog(records || [], {
      category,
      includeMissingCanonical: true,
    });

    return NextResponse.json(merged, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    // Fallback cleanly to CENTRALIZED_CATALOG (filtered if category requested)
    const fallback = category
      ? CENTRALIZED_CATALOG.filter((item) => item.category_name === category)
      : CENTRALIZED_CATALOG;

    return NextResponse.json(fallback, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
      },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const slug = resolveCanonicalSlug(body.name || "coffee");

    const created = await airtableCreate("tblcQD4QoANpq0ytK", {
      name: body.name,
      category_name: body.category_name || "Signature Espresso",
      price: Number(body.price) || 200,
      origin: body.origin || "Tagaytay Ridge",
      roast_level: body.roast_level || "Medium",
      tasting_notes: body.tasting_notes || "Artisan single-origin profile",
      is_available: true,
      tag: body.tag || "Fresh",
    });

    return NextResponse.json(
      {
        ...created,
        slug,
        image_url: getProductImage({ ...body, slug }),
        product_type: getProductType(body),
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error adding coffee product" },
      { status: 500 }
    );
  }
}
