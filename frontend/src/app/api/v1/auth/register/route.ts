import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate } from "@/lib/airtable";

const BACKEND_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000/api/v1";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Try forwarding to FastAPI backend if available
    try {
      const backendRes = await fetch(`${BACKEND_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(3000),
      });

      if (backendRes.ok) {
        const data = await backendRes.json();
        const response = NextResponse.json(data, { status: 201 });
        const setCookieHeader = backendRes.headers.get("set-cookie");
        if (setCookieHeader) {
          response.headers.set("set-cookie", setCookieHeader);
        }
        return response;
      } else if (backendRes.status === 409) {
        const errorData = await backendRes.json().catch(() => ({}));
        return NextResponse.json(errorData, { status: 409 });
      }
    } catch {
      // Fall through to Next.js serverless handler
    }

    // 2. Next.js Serverless fallback
    const { full_name, email, password, phone } = body;
    if (!email || !full_name || !password) {
      return NextResponse.json(
        { detail: "Full name, email, and password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const existing = await airtableList("Users", `LOWER({email}) = '${cleanEmail}'`, true).catch(() => []);
    if (existing.length > 0) {
      return NextResponse.json(
        { detail: "An account with this email address already exists. Please log in." },
        { status: 409 }
      );
    }

    // Never grant admin privileges through public registration
    let airtableUser: any = null;
    try {
      airtableUser = await airtableCreate("Users", {
        full_name: full_name.trim(),
        email: cleanEmail,
        ...(phone ? { phone: String(phone).trim() } : {}),
      });
    } catch (airtableErr) {
      console.warn("Airtable create note:", airtableErr);
    }

    const user = {
      id: airtableUser?.id || `cust-${Date.now()}`,
      full_name: full_name.trim(),
      email: cleanEmail,
      phone: phone || null,
      role: "customer",
      loyalty_points: 25,
      auth_provider: "email",
    };

    const token = `jhes_jwt_${Buffer.from(JSON.stringify({ sub: user.id, email: cleanEmail, role: "customer", name: user.full_name })).toString("base64url")}`;

    const res = NextResponse.json(
      {
        access_token: token,
        token_type: "bearer",
        user,
        message: "Registration successful! Welcome to Jhe's Cafe'.",
      },
      { status: 201 }
    );

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
