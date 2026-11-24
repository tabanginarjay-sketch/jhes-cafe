import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableUpdate } from "@/lib/airtable";
import {
  SESSION_COOKIE_NAME,
  escapeFormulaString,
  getAuthenticatedUser,
  hashPassword,
  sanitizeNumericPhone,
  signSessionToken,
  verifyPassword,
} from "@/lib/serverAuth";
import { getPersistentPasswordHash, savePersistentPasswordHash } from "@/lib/passwordStore";
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

    // Reconcile live loyalty balance from authoritative transaction ledger using canonical customer ID
    const reconciledPoints = await reconcileCustomerLoyalty(canonical.id, session.email);

    // Determine whether this account has an email+password hash configured
    const cleanEmail = canonical.email.toLowerCase().trim();
    let userRecordHash: string | null = null;
    try {
      const safeEmail = escapeFormulaString(cleanEmail);
      const matches = await airtableList("Users", `LOWER({email}) = '${safeEmail}'`, true);
      const target = matches.find((m: any) => m.id === canonical.id) || matches[0];
      if (target && (target as any).password_hash) {
        userRecordHash = String((target as any).password_hash);
      }
    } catch {
      // Ignore lookup error
    }
    const existingHash = await getPersistentPasswordHash(canonical.id, cleanEmail, userRecordHash);
    const hasPassword = Boolean(existingHash);

    return NextResponse.json(
      {
        id: canonical.id,
        full_name: canonical.full_name,
        email: canonical.email,
        phone: canonical.phone ?? null,
        role: canonical.role || session.role || "customer",
        loyalty_points: reconciledPoints,
        auth_provider: session.auth_provider || canonical.auth_provider || "email",
        has_password: hasPassword,
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

/**
 * PATCH /api/v1/auth/me
 * Allows an authenticated customer to update ONLY their own profile details
 * (full_name, phone) or set/change their password. Strictly rejects role/email/loyalty tampering.
 */
export async function PATCH(req: NextRequest) {
  const session = getAuthenticatedUser(req);
  if (!session) {
    return NextResponse.json(
      { detail: "Authentication required to update profile." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const body = await req.json();

    // Block privilege or balance tampering
    if (body.role !== undefined || body.loyalty_points !== undefined || body.email !== undefined) {
      return NextResponse.json(
        { detail: "Email, account role, and loyalty balance cannot be modified directly." },
        { status: 403 }
      );
    }

    const canonical = await getCanonicalCustomer(
      session.email,
      session.name,
      null,
      session.auth_provider || "email",
      session.avatar_url
    );

    const fieldsToUpdate: Record<string, unknown> = {};
    let nextFullName = canonical.full_name;
    let nextPhone = canonical.phone ?? null;

    if (body.full_name !== undefined) {
      const cleanName = String(body.full_name).trim();
      if (cleanName.length < 2 || cleanName.length > 80) {
        return NextResponse.json(
          { detail: "Full name must be between 2 and 80 characters." },
          { status: 400 }
        );
      }
      fieldsToUpdate.full_name = cleanName;
      nextFullName = cleanName;
    }

    if (body.phone !== undefined) {
      const rawPhone = String(body.phone || "").trim();
      if (rawPhone === "") {
        nextPhone = null;
      } else {
        const sanitized = sanitizeNumericPhone(rawPhone);
        if (sanitized === undefined) {
          return NextResponse.json(
            { detail: "Please enter a valid mobile number (at least 7 digits)." },
            { status: 400 }
          );
        }
        fieldsToUpdate.phone = sanitized;
        nextPhone = sanitized;
      }
    }

    // Optional Password Management
    let passwordUpdated = false;
    if (body.new_password !== undefined && String(body.new_password).length > 0) {
      const newPassword = String(body.new_password);
      if (newPassword.length < 6) {
        return NextResponse.json(
          { detail: "New password must be at least 6 characters long." },
          { status: 400 }
        );
      }

      const cleanEmail = canonical.email.toLowerCase().trim();
      const safeEmail = escapeFormulaString(cleanEmail);
      const matches = await airtableList("Users", `LOWER({email}) = '${safeEmail}'`, true).catch(() => []);
      const targetUser: any = matches.find((m: any) => m.id === canonical.id) || matches[0];
      const existingHash = await getPersistentPasswordHash(
        canonical.id,
        cleanEmail,
        targetUser?.password_hash
      );

      if (existingHash) {
        const currentPassword = String(body.current_password || "");
        if (!currentPassword || !verifyPassword(currentPassword, existingHash)) {
          return NextResponse.json(
            { detail: "Current password is incorrect." },
            { status: 400 }
          );
        }
      }

      const newHash = hashPassword(newPassword);
      await savePersistentPasswordHash(canonical.id, cleanEmail, newHash);
      passwordUpdated = true;

      // Best-effort persist to Airtable Users.password_hash if column exists
      try {
        await airtableUpdate("Users", canonical.id, { password_hash: newHash });
      } catch {
        // Ignore if Airtable base lacks optional password_hash column
      }
    }

    if (Object.keys(fieldsToUpdate).length > 0 && canonical.id.startsWith("rec")) {
      await airtableUpdate("Users", canonical.id, fieldsToUpdate);
    }

    const reconciledPoints = await reconcileCustomerLoyalty(canonical.id, canonical.email);
    const hasPassword =
      passwordUpdated || Boolean(await getPersistentPasswordHash(canonical.id, canonical.email));

    const updatedUser = {
      id: canonical.id,
      full_name: nextFullName,
      email: canonical.email,
      phone: nextPhone,
      role: canonical.role || session.role || "customer",
      loyalty_points: reconciledPoints,
      auth_provider: session.auth_provider || canonical.auth_provider || "email",
      has_password: hasPassword,
      avatar_url: canonical.avatar_url || session.avatar_url || null,
    };

    const refreshedToken = signSessionToken({
      sub: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      name: updatedUser.full_name,
      auth_provider: updatedUser.auth_provider,
      avatar_url: updatedUser.avatar_url,
    });

    const res = NextResponse.json(
      {
        user: updatedUser,
        password_updated: passwordUpdated,
        message: passwordUpdated
          ? "Account profile and password updated successfully."
          : "Profile updated successfully.",
      },
      { headers: { "Cache-Control": "no-store" } }
    );

    res.cookies.set(SESSION_COOKIE_NAME, refreshedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return res;
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to update account profile" },
      { status: 500 }
    );
  }
}
