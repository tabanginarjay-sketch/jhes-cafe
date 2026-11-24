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
    // Deduplicate customer directory by normalized email (preferring canonical record with loyalty points) without deleting Airtable records
    const byEmail = new Map<string, any>();
    const noEmailRows: any[] = [];

    for (const raw of records) {
      const { password_hash: _ph, ...rest } = raw as any;
      const emailKey = String(rest.email || "").toLowerCase().trim();
      if (!emailKey) {
        noEmailRows.push(rest);
        continue;
      }
      const existing = byEmail.get(emailKey);
      if (!existing) {
        byEmail.set(emailKey, rest);
      } else {
        const prevPts = Number(existing.loyalty_points ?? -1);
        const nextPts = Number(rest.loyalty_points ?? -1);
        const preferNext =
          nextPts > prevPts ||
          (nextPts === prevPts &&
            String(rest.created_at || "").localeCompare(String(existing.created_at || "")) < 0);
        if (preferNext) {
          byEmail.set(emailKey, rest);
        }
      }
    }

    const safeRecords = [...Array.from(byEmail.values()), ...noEmailRows];
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
 * POST /api/v1/users — Administrator only (customer self-signup uses /api/v1/auth/register or OAuth).
 */
export async function POST(req: NextRequest) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { detail: "Administrator authentication required. Customers should sign up via /api/v1/auth/register." },
      { status: 401 }
    );
  }
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
