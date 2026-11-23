import { NextRequest, NextResponse } from "next/server";
import { airtableList } from "@/lib/airtable";

const BACKEND_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000/api/v1";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieSession = req.cookies.get("jhes_session")?.value;

    // 1. Try forwarding to FastAPI backend
    try {
      const backendRes = await fetch(`${BACKEND_URL}/auth/me`, {
        headers: {
          ...(authHeader ? { authorization: authHeader } : {}),
          ...(cookieSession ? { cookie: `jhes_session=${cookieSession}` } : {}),
        },
        signal: AbortSignal.timeout(2000),
      });

      if (backendRes.ok) {
        return NextResponse.json(await backendRes.json());
      }
    } catch {
      // Fall through
    }

    // 2. Next.js serverless session check
    const token = (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null) || cookieSession;
    if (!token) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }

    if (token.startsWith("jhes_jwt_")) {
      const b64 = token.replace("jhes_jwt_", "");
      const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf-8"));
      return NextResponse.json({
        id: payload.sub,
        full_name: payload.name || "Customer",
        email: payload.email,
        role: payload.role || "customer",
        loyalty_points: 25,
        auth_provider: "email",
      });
    }

    return NextResponse.json({ detail: "Invalid session token" }, { status: 401 });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
