import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate } from "@/lib/airtable";
import {
  escapeFormulaString,
  getAuthenticatedAdmin,
  sanitizeNumericPhone,
} from "@/lib/serverAuth";

/**
 * GET /api/v1/users — Administrator only (prevents unauthenticated scraping of customer emails/phones).
 */
export async function GET(req: NextRequest) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { detail: "Administrator authentication required to view customer directory." },
      { status: 401 }
    );
  }

  try {
    const records = await airtableList("Users", undefined, true);
    // Strip any password_hash before returning
    const safeRecords = records.map(({ password_hash: _ph, ...rest }: any) => rest);
    return NextResponse.json(safeRecords, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error listing users" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/users — Public customer creation (strictly enforces role = "customer").
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cleanEmail = String(body.email || "").toLowerCase().trim();
    const fullName = String(body.full_name || "").trim();

    if (!cleanEmail || !cleanEmail.includes("@") || !fullName) {
      return NextResponse.json(
        { detail: "Valid full_name and email are required." },
        { status: 400 }
      );
    }

    const safeEmail = escapeFormulaString(cleanEmail);
    const existing = await airtableList("Users", `LOWER({email}) = '${safeEmail}'`, true).catch(() => []);
    if (existing.length > 0) {
      const { password_hash: _ph, ...safeExisting } = existing[0] as any;
      return NextResponse.json(safeExisting, { status: 200 });
    }

    const numericPhone = sanitizeNumericPhone(body.phone);
    // NEVER accept role from public request body — always enforce "customer"
    const created: any = await airtableCreate("Users", {
      full_name: fullName,
      email: cleanEmail,
      ...(numericPhone !== undefined ? { phone: numericPhone } : {}),
      role: "customer",
      loyalty_points: 25,
    });

    const { password_hash: _ph, ...safeCreated } = created;
    return NextResponse.json(safeCreated, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error creating user" },
      { status: 500 }
    );
  }
}
