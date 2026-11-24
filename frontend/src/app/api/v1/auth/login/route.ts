import { NextRequest, NextResponse } from "next/server";
import { airtableList } from "@/lib/airtable";
import {
  SESSION_COOKIE_NAME,
  escapeFormulaString,
  signSessionToken,
  verifyPassword,
} from "@/lib/serverAuth";
import { serverPasswordStore } from "@/lib/passwordStore";
import { reconcileCustomerLoyalty } from "@/lib/customerPersistence";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Forward to FastAPI only if explicitly configured with non-local URL in production
    const isProduction = process.env.NODE_ENV === "production";
    const explicitBackendUrl = process.env.FASTAPI_URL;
    const shouldForward = Boolean(
      explicitBackendUrl &&
        (!isProduction || (!explicitBackendUrl.includes("127.0.0.1") && !explicitBackendUrl.includes("localhost")))
    );

    if (shouldForward) {
      try {
        const backendRes = await fetch(`${explicitBackendUrl}/auth/login`, {
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
    }

    // 2. Next.js Serverless verified email + password authentication
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { detail: "Both email address and password are required." },
        { status: 400 }
      );
    }

    const safeEmail = escapeFormulaString(email);
    const existing = await airtableList("Users", `LOWER({email}) = '${safeEmail}'`, true).catch(() => []);
    if (existing.length === 0) {
      return NextResponse.json(
        { detail: "Invalid email or password." },
        { status: 401 }
      );
    }

    const user: any = existing[0];
    const storedHash: string | undefined =
      user.password_hash || serverPasswordStore.get(email);

    // NEVER authenticate without verifying a real stored password hash
    if (!storedHash || !verifyPassword(password, storedHash)) {
      return NextResponse.json(
        {
          detail: storedHash
            ? "Invalid email or password."
            : "Password login is not enabled for this account (try signing in with Google or Facebook, or register a new email account).",
        },
        { status: 401 }
      );
    }

    const reconciledPoints = await reconcileCustomerLoyalty(user.id, email);

    const safeUser = {
      id: user.id,
      full_name: user.full_name || "Customer",
      email,
      phone: user.phone ?? null,
      role: user.role || "customer",
      loyalty_points: reconciledPoints,
      auth_provider: "email",
    };

    const token = signSessionToken({
      sub: safeUser.id,
      email: safeUser.email,
      role: safeUser.role,
      name: safeUser.full_name,
      auth_provider: "email",
    });

    const res = NextResponse.json({
      access_token: token,
      token_type: "bearer",
      user: safeUser,
      message: "Sign in successful.",
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
