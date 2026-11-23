import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate } from "@/lib/airtable";

export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get("category");
    const formula = category ? `{category_name} = '${category}'` : undefined;
    const records = await airtableList("tblcQD4QoANpq0ytK", formula, true);
    return NextResponse.json(records, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error fetching products" },
      { status: 500 }
    );
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
      slug: body.slug || slug,
      category_name: body.category_name || "Signature Espresso",
      price: Number(body.price) || 200,
      origin: body.origin || "Tagaytay Ridge",
      roast_level: body.roast_level || "Medium Dark",
      tasting_notes: body.tasting_notes || "Artisan single-origin profile",
      is_available: true,
      image_url: body.image_url || "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80",
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error adding coffee product" },
      { status: 500 }
    );
  }
}
