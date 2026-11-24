import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate } from "@/lib/airtable";
import {
  SESSION_COOKIE_NAME,
  escapeFormulaString,
  hashPassword,
  sanitizeNumericPhone,
  signSessionToken,
} from "@/lib/serverAuth";
import { serverPasswordStore } from "@/lib/passwordStore";

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
        const backendRes = await fetch(`${explicitBackendUrl}/auth/register`, {
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
        } else if (backendRes.status === 409 || backendRes.status === 400) {
          const errorData = await backendRes.json().catch(() => ({}));
          return NextResponse.json(errorData, { status: backendRes.status });
        }
      } catch {
        // Fall through to Next.js serverless handler
      }
    }

    // 2. Next.js Serverless registration
    const fullName = String(body.full_name || "").trim();
    const cleanEmail = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");
    const numericPhone = sanitizeNumericPhone(body.phone);

    if (!cleanEmail || !cleanEmail.includes("@") || !fullName || !password) {
      return NextResponse.json(
        { detail: "Valid full name, email address, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { detail: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const safeEmail = escapeFormulaString(cleanEmail);
    const existing = await airtableList("Users", `LOWER({email}) = '${safeEmail}'`, true).catch(() => []);
    if (existing.length > 0) {
      return NextResponse.json(
        { detail: "An account with this email address already exists. Please log in." },
        { status: 409 }
      );
    }

    const hashed = hashPassword(password);
    serverPasswordStore.set(cleanEmail, hashed);

    // Strictly enforce role = "customer" — NEVER allow admin creation via public registration
    const coreFields: Record<string, unknown> = {
      full_name: fullName,
      email: cleanEmail,
      role: "customer",
      loyalty_points: 25,
      ...(numericPhone !== undefined ? { phone: numericPhone } : {}),
    };

    let airtableUser: any = null;
    try {
      // Try storing password_hash if Airtable base owner has added the column
      airtableUser = await airtableCreate("Users", {
        ...coreFields,
        password_hash: hashed,
      });
    } catch {
      // Fallback cleanly to the verified 5 Airtable Users columns
      airtableUser = await airtableCreate("Users", coreFields);
    }

    const user = {
      id: airtableUser.id,
      full_name: fullName,
      email: cleanEmail,
      phone: airtableUser.phone ?? numericPhone ?? null,
      role: "customer",
      loyalty_points: Number(airtableUser.loyalty_points) || 25,
      auth_provider: "email",
    };

    const token = signSessionToken({
      sub: user.id,
      email: user.email,
      role: "customer",
      name: user.full_name,
      auth_provider: "email",
    });

    const res = NextResponse.json(
      {
        access_token: token,
        token_type: "bearer",
        user,
        message: "Registration successful! Welcome to Jhe's Cafe'.",
      },
      { status: 201 }
    );

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
