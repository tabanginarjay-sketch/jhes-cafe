import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/serverAuth";
import { getCanonicalCustomer, reconcileCustomerLoyalty } from "@/lib/customerPersistence";

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

    // Retrieve canonical customer record to guarantee permanent ID and prevent duplicate email fragmentation
    const canonical = await getCanonicalCustomer(
      session.email,
      session.name,
      null,
      session.auth_provider || "email",
      session.avatar_url
    );

    // Reconcile live loyalty balance from transaction ledger
    const reconciledPoints = await reconcileCustomerLoyalty(canonical.id, session.email);

    return NextResponse.json(
      {
        id: canonical.id,
        full_name: canonical.full_name,
        email: canonical.email,
        phone: canonical.phone ?? null,
        role: canonical.role || session.role || "customer",
        loyalty_points: reconciledPoints,
        auth_provider: canonical.auth_provider || session.auth_provider || "email",
        avatar_url: canonical.avatar_url || session.avatar_url || null,
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
