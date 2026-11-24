import { NextRequest, NextResponse } from "next/server";
import { airtableList } from "@/lib/airtable";
import { escapeFormulaString, getAuthenticatedUser } from "@/lib/serverAuth";

export async function GET(req: NextRequest) {
  try {
    // 1. Forward to FastAPI only if explicitly configured with non-local URL in production
    const isProduction = process.env.NODE_ENV === "production";
    const explicitBackendUrl = process.env.FASTAPI_URL;
    const shouldForward = Boolean(
      explicitBackendUrl &&
        (!isProduction || (!explicitBackendUrl.includes("127.0.0.1") && !explicitBackendUrl.includes("localhost")))
    );

    if (shouldForward) {
      try {
        const authHeader = req.headers.get("authorization");
        const cookieSession = req.cookies.get("jhes_session")?.value;
        const backendRes = await fetch(`${explicitBackendUrl}/auth/me`, {
          headers: {
            ...(authHeader ? { authorization: authHeader } : {}),
            ...(cookieSession ? { cookie: `jhes_session=${cookieSession}` } : {}),
          },
          signal: AbortSignal.timeout(2000),
        });

        if (backendRes.ok) {
          return NextResponse.json(await backendRes.json(), {
            headers: { "Cache-Control": "no-store" },
          });
        }
      } catch {
        // Fall through
      }
    }

    // 2. Strictly verify HMAC-signed session token (rejects any forged/unsigned cookies)
    const session = getAuthenticatedUser(req);
    if (!session) {
      return NextResponse.json(
        { detail: "Not authenticated" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Refresh live loyalty points and profile details from Airtable
    let loyaltyPoints = 25;
    let role = session.role || "customer";
    let fullName = session.name || "Customer";
    let phone: string | number | null = null;

    try {
      const safeEmail = escapeFormulaString(session.email.toLowerCase().trim());
      const matches = await airtableList("Users", `LOWER({email}) = '${safeEmail}'`, true);
      if (matches.length > 0) {
        const live: any = matches[0];
        loyaltyPoints = Number(live.loyalty_points) || 0;
        role = String(live.role || role);
        fullName = String(live.full_name || fullName);
        phone = live.phone ?? null;
      }
    } catch {
      // Keep verified session claims if Airtable temporarily unreachable
    }

    return NextResponse.json(
      {
        id: session.sub,
        full_name: fullName,
        email: session.email,
        phone,
        role,
        loyalty_points: loyaltyPoints,
        auth_provider: session.auth_provider || "email",
        avatar_url: session.avatar_url || null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
