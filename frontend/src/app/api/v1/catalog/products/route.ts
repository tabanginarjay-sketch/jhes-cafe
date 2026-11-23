import { NextRequest, NextResponse } from "next/server";
import { airtableList } from "@/lib/airtable";

export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get("category");
    const formula = category ? `{category_name} = '${category}'` : undefined;
    const records = await airtableList("tblcQD4QoANpq0ytK", formula);
    return NextResponse.json(records, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
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
