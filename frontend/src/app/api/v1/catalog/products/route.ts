import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate } from "@/lib/airtable";
import {
  CENTRALIZED_CATALOG,
  dedupeAndMergeCatalog,
  getProductImage,
  resolveCanonicalSlug,
} from "@/lib/productRegistry";
import { getProductType } from "@/lib/productCustomization";
import { escapeFormulaString, getAuthenticatedAdmin } from "@/lib/serverAuth";

const PRODUCTS_TABLE = "tblcQD4QoANpq0ytK";

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");
  try {
    const formula = category
      ? `{category_name} = '${escapeFormulaString(category)}'`
      : undefined;
    const records = await airtableList(PRODUCTS_TABLE, formula, true);

    // Airtable is the single source of truth: merge metadata/images ONLY for live Airtable records
    const merged = dedupeAndMergeCatalog(records || [], {
      category,
      includeMissingCanonical: false,
    });

    return NextResponse.json(merged, {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Data-Source": "airtable",
      },
    });
  } catch {
    // Graceful outage fallback only if Airtable is unreachable
    const fallback = category
      ? CENTRALIZED_CATALOG.filter((item) => item.category_name === category)
      : CENTRALIZED_CATALOG;

    return NextResponse.json(fallback, {
      headers: {
        "Cache-Control": "no-store",
        "X-Data-Source": "fallback",
      },
    });
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
      return NextResponse.json({ detail: "Product name is required." }, { status: 400 });
    }
    const slug = resolveCanonicalSlug(name);

    const created = await airtableCreate(PRODUCTS_TABLE, {
      name,
      category_name: body.category_name || "Signature Espresso",
      price: Number(body.price) || 200,
      origin: body.origin || "Tagaytay Ridge",
      roast_level: body.roast_level || "Medium",
      tasting_notes: body.tasting_notes || "Artisan single-origin profile",
      is_available: body.is_available !== false,
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
      { detail: err instanceof Error ? err.message : "Error adding product" },
      { status: 500 }
    );
  }
}
