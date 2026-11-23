import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate } from "@/lib/airtable";
import { CENTRALIZED_CATALOG, getProductImage } from "@/lib/productRegistry";
import { getProductType } from "@/lib/productCustomization";

export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get("category");
    const formula = category ? `{category_name} = '${category}'` : undefined;
    const records = await airtableList("tblcQD4QoANpq0ytK", formula, true);

    // Enrich records with canonical slug, product_type, and verified high-res image
    const enriched = (records || []).map((r: any) => {
      const pType = getProductType(r);
      const slug = (r.name || "coffee")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      return {
        ...r,
        slug: r.slug || slug,
        product_type: r.product_type || pType,
        image_url: getProductImage(r),
        is_available: r.is_available !== false,
      };
    });

    // If Airtable has fewer items, include missing canonical items
    if (!category) {
      const existingSlugs = new Set(enriched.map((e: any) => e.slug));
      for (const item of CENTRALIZED_CATALOG) {
        if (!existingSlugs.has(item.slug)) {
          enriched.push(item);
        }
      }
    }

    return NextResponse.json(enriched, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    // If Airtable query fails, fallback cleanly to CENTRALIZED_CATALOG
    return NextResponse.json(CENTRALIZED_CATALOG, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
      },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const slug = (body.name || "coffee")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

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
        image_url: getProductImage(body),
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
