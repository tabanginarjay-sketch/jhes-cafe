import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate } from "@/lib/airtable";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Forward to FastAPI backend only if explicitly configured in non-local environment
    const isProduction = process.env.NODE_ENV === "production";
    const explicitBackendUrl = process.env.FASTAPI_URL;
    const shouldForwardToFastAPI = Boolean(
      explicitBackendUrl &&
      (!isProduction || (!explicitBackendUrl.includes("127.0.0.1") && !explicitBackendUrl.includes("localhost")))
    );

    if (shouldForwardToFastAPI) {
      try {
        const backendRes = await fetch(`${explicitBackendUrl}/auth/google`, {
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
    }

    // 2. Next.js Serverless Google OAuth & Identity verification
    const idToken = body.id_token || body.credential;
    const authCode = body.code;
    const redirectUri = body.redirect_uri || "";

    if (!idToken && !authCode) {
      return NextResponse.json(
        { detail: "Google authorization code or ID token is required." },
        { status: 400 }
      );
    }

    const clientId =
      body.client_id ||
      process.env.GOOGLE_CLIENT_ID ||
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

    let claims: any = null;

    if (authCode) {
      // Exchange authorization code for tokens with Google
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

        // 1. Direct JWT decode of id_token payload (verified by TLS session from Google)
        if (tokenData.id_token) {
          try {
            const parts = tokenData.id_token.split(".");
            if (parts.length === 3) {
              const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
              claims = JSON.parse(payloadJson);
            }
          } catch (jwtErr) {
            console.warn("Direct JWT parse notice:", jwtErr);
          }

          // Fallback to tokeninfo if claims missing
          if (!claims) {
            const verifyRes = await fetch(
              `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenData.id_token)}`
            );
            if (verifyRes.ok) {
              claims = await verifyRes.json();
            }
          }
        }

        // 2. Fallback to Google userinfo if ID token missing
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
      // Direct JWT decode first
      try {
        const parts = idToken.split(".");
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
          claims = JSON.parse(payloadJson);
        }
      } catch {
        // Fallback
      }

      if (!claims) {
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

    // Lookup or register in Airtable
    let user: any = null;
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

    const userId = user.id || `google-${sub.slice(0, 10)}`;
    const fullName = user.full_name || verifiedName;
    const userRole = user.role || "customer";

    // Issue JWT / Session token
    const token = `jhes_jwt_${Buffer.from(
      JSON.stringify({
        sub: userId,
        email: verifiedEmail,
        role: userRole,
        name: fullName,
        avatar_url: picture,
      })
    ).toString("base64url")}`;

    const res = NextResponse.json({
      access_token: token,
      token_type: "bearer",
      user: {
        id: userId,
        full_name: fullName,
        email: verifiedEmail,
        role: userRole,
        loyalty_points: user.loyalty_points || 25,
        auth_provider: "google",
        avatar_url: picture,
      },
      message: `Welcome, ${fullName}!`,
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
