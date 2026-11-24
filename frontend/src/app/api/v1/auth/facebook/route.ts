import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate } from "@/lib/airtable";
import {
  SESSION_COOKIE_NAME,
  escapeFormulaString,
  signSessionToken,
} from "@/lib/serverAuth";
import { getCanonicalCustomer, reconcileCustomerLoyalty } from "@/lib/customerPersistence";

const FB_APP_ID = process.env.FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "";
const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let accessToken = body.access_token;
    const authCode = body.code;
    const redirectUri = body.redirect_uri || "";

    if (!accessToken && !authCode) {
      return NextResponse.json(
        { detail: "Facebook authorization code or access token is required." },
        { status: 400 }
      );
    }

    // 1. If code is provided, exchange for access token with Facebook Graph API
    if (authCode) {
      if (!FB_APP_ID || !FB_APP_SECRET) {
        return NextResponse.json(
          {
            detail:
              "Facebook App credentials (NEXT_PUBLIC_FACEBOOK_APP_ID / FACEBOOK_APP_SECRET) are pending configuration.",
          },
          { status: 400 }
        );
      }

      const candidateUris = [
        redirectUri,
        "https://jhescafe.vercel.app/auth/facebook/callback",
        "http://localhost:3002/auth/facebook/callback",
        "",
      ].filter((u, i, arr) => u !== undefined && arr.indexOf(u) === i);

      let tokenData: any = null;
      let lastErr = "";

      for (const uri of candidateUris) {
        const tokenUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
        tokenUrl.searchParams.set("client_id", FB_APP_ID);
        tokenUrl.searchParams.set("client_secret", FB_APP_SECRET);
        tokenUrl.searchParams.set("code", authCode);
        if (uri) tokenUrl.searchParams.set("redirect_uri", uri);

        try {
          const res = await fetch(tokenUrl.toString());
          if (res.ok) {
            tokenData = await res.json();
            accessToken = tokenData.access_token;
            break;
          } else {
            lastErr = await res.text();
          }
        } catch (e) {
          lastErr = String(e);
        }
      }

      if (!accessToken) {
        return NextResponse.json(
          { detail: `Facebook authorization code exchange failed: ${lastErr}` },
          { status: 400 }
        );
      }
    }

    // 2. Fetch Facebook User Profile using access token
    const profileRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(
        accessToken
      )}`
    );

    if (!profileRes.ok) {
      const errText = await profileRes.text();
      return NextResponse.json(
        { detail: `Failed to fetch Facebook user profile: ${errText}` },
        { status: 401 }
      );
    }

    const fbUser = await profileRes.json();
    const verifiedEmail = fbUser.email ? String(fbUser.email).toLowerCase().trim() : null;
    const verifiedName = fbUser.name || "Facebook Customer";
    const fbId = String(fbUser.id);
    const avatarUrl = fbUser.picture?.data?.url || null;

    // Email fallback: If Facebook account didn't share an email, generate deterministic alias
    const customerEmail = verifiedEmail || `fb_${fbId}@jhescafe.ph`;

    // 3. Resolve canonical customer in Airtable
    const canonical = await getCanonicalCustomer(
      customerEmail,
      verifiedName,
      null,
      "facebook",
      avatarUrl
    );

    const userId = canonical.id;
    const fullName = canonical.full_name || verifiedName;
    const userRole = canonical.role || "customer";
    const reconciledPoints = await reconcileCustomerLoyalty(canonical.id, customerEmail);

    // 4. Issue HMAC-signed session token
    const token = signSessionToken({
      sub: userId,
      email: customerEmail,
      role: userRole,
      name: fullName,
      auth_provider: "facebook",
      avatar_url: avatarUrl,
    });

    const res = NextResponse.json({
      access_token: token,
      token_type: "bearer",
      user: {
        id: userId,
        full_name: fullName,
        email: customerEmail,
        role: userRole,
        loyalty_points: reconciledPoints,
        auth_provider: "facebook",
        avatar_url: avatarUrl,
      },
      message: `Welcome, ${fullName}!`,
    });

    res.cookies.set(SESSION_COOKIE_NAME, token, {
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
