import { NextResponse } from "next/server";
import { airtableList } from "@/lib/airtable";

export async function GET() {
  try {
    const records = await airtableList("Categories");
    return NextResponse.json(records, {
      headers: {
        "Cache-Control": "public, max-age=120, stale-while-revalidate=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    // Return fallback categories if table not configured
    return NextResponse.json([
      { id: "cat1", name: "Signature Espresso", display_order: 1 },
      { id: "cat2", name: "Cold Brews", display_order: 2 },
      { id: "cat3", name: "Warm Classics", display_order: 3 },
      { id: "cat4", name: "Artisanal Pastries", display_order: 4 },
    ]);
  }
}
