import { NextRequest, NextResponse } from "next/server";
import { airtableList } from "@/lib/airtable";

const BACKEND_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000/api/v1";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Try forwarding to FastAPI backend if available
    try {
      const backendRes = await fetch(`${BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(3000),
      });

      if (backendRes.ok) {
        const data = await backendRes.json();
        const response = NextResponse.json(data);
        const setCookieHeader = backendRes.headers.get("set-cookie");
        if (setCookieHeader) {
          response.headers.set("set-cookie", setCookieHeader);
        }
        return response;
      } else if (backendRes.status === 401 || backendRes.status === 400) {
        const errJson = await backendRes.json().catch(() => ({}));
        return NextResponse.json(errJson, { status: backendRes.status });
      }
    } catch {
      // Fall through to Next.js serverless handler
    }

    // 2. Next.js Serverless fallback
    const { email, password } = body;
    if (!email) {
      return NextResponse.json(
        { detail: "Email address is required." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const existing = await airtableList("Users", `LOWER({email}) = '${cleanEmail}'`, true).catch(() => []);
    if (existing.length === 0) {
      return NextResponse.json(
        { detail: "Invalid email or password." },
        { status: 401 }
      );
    }

    const user = existing[0];
    const token = `jhes_jwt_${Buffer.from(JSON.stringify({ sub: user.id, email: cleanEmail, role: user.role || "customer", name: user.full_name })).toString("base64url")}`;

    const res = NextResponse.json({
      access_token: token,
      token_type: "bearer",
      user,
      message: "Sign in successful.",
    });

    res.cookies.set("jhes_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return res;
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
