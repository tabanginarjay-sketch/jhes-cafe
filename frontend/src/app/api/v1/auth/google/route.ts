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

    // 2. Next.js Serverless Google OAuth & Identity verification fallback
    const idToken = body.id_token || body.credential;
    const authCode = body.code;
    const redirectUri = body.redirect_uri || "";

    if (!idToken && !authCode) {
      return NextResponse.json(
        { detail: "Google authorization code or ID token is required." },
        { status: 400 }
      );
    }

    const clientId = body.client_id || process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

    let claims: any = null;

    if (authCode) {
      // Exchange authorization code for tokens
      try {
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code: authCode,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }),
        });

        if (!tokenRes.ok) {
          const errText = await tokenRes.text();
          console.error("Google token exchange error:", errText);
          return NextResponse.json(
            { detail: `Google authorization code exchange failed: ${errText}` },
            { status: 400 }
          );
        }

        const tokenData = await tokenRes.json();
        if (tokenData.id_token) {
          const verifyRes = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenData.id_token)}`
          );
          if (verifyRes.ok) {
            claims = await verifyRes.json();
          }
        }

        if (!claims && tokenData.access_token) {
          const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          });
          if (userinfoRes.ok) {
            claims = await userinfoRes.json();
          }
        }
      } catch (exchangeErr) {
        return NextResponse.json(
          { detail: `Failed to exchange Google authorization code: ${exchangeErr}` },
          { status: 500 }
        );
      }
    } else if (idToken) {
      // Verify ID token with Google's official endpoint
      const googleRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
      );

      if (!googleRes.ok) {
        return NextResponse.json(
          { detail: "Invalid or expired Google identity token." },
          { status: 401 }
        );
      }

      claims = await googleRes.json();
    }

    if (!claims) {
      return NextResponse.json(
        { detail: "Could not verify Google identity." },
        { status: 401 }
      );
    }
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
        try {
          user = await airtableCreate("Users", {
            full_name: verifiedName,
            email: verifiedEmail,
          });
        } catch {
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
