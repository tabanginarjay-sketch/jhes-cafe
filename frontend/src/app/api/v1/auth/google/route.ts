import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate } from "@/lib/airtable";

const BACKEND_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000/api/v1";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Try forwarding to FastAPI backend if available
    try {
      const backendRes = await fetch(`${BACKEND_URL}/auth/google`, {
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
      }
    } catch {
      // Fall through to Next.js serverless handler
    }

    // 2. Next.js Serverless Google verification fallback
    const idToken = body.id_token || body.credential;
    if (!idToken) {
      return NextResponse.json(
        { detail: "Google ID token is required." },
        { status: 400 }
      );
    }

    // Verify token with Google's official endpoint
    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );

    if (!googleRes.ok) {
      return NextResponse.json(
        { detail: "Invalid or expired Google identity token." },
        { status: 401 }
      );
    }

    const claims = await googleRes.json();
    const verifiedEmail = String(claims.email || "").toLowerCase().trim();
    const verifiedName = claims.name || claims.given_name || "Valued Customer";
    const sub = String(claims.sub || "");
    const picture = claims.picture || null;

    if (!verifiedEmail) {
      return NextResponse.json(
        { detail: "Google account missing verified email." },
        { status: 400 }
      );
    }

    // Lookup in Airtable
    let user = null;
    try {
      const existing = await airtableList("Users", `LOWER({email}) = '${verifiedEmail}'`, true);
      if (existing.length > 0) {
        user = existing[0];
      } else {
        user = await airtableCreate("Users", {
          full_name: verifiedName,
          email: verifiedEmail,
          role: "customer",
          loyalty_points: 25,
          auth_provider: "google",
          provider_sub_id: sub,
          avatar_url: picture,
          is_active: true,
        });
      }
    } catch (dbErr) {
      user = {
        id: `google-${sub.slice(0, 10)}`,
        full_name: verifiedName,
        email: verifiedEmail,
        role: "customer",
        loyalty_points: 25,
        auth_provider: "google",
        avatar_url: picture,
      };
    }

    // Issue JWT or Session token
    const token = `jhes_jwt_${Buffer.from(JSON.stringify({ sub: user.id, email: verifiedEmail, role: user.role || "customer", name: user.full_name })).toString("base64url")}`;

    const res = NextResponse.json({
      access_token: token,
      token_type: "bearer",
      user,
      message: `Welcome, ${user.full_name}!`,
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
