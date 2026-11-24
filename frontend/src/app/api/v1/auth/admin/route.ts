import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { airtableList } from "@/lib/airtable";
import {
  ADMIN_COOKIE_NAME,
  escapeFormulaString,
  getAuthenticatedAdmin,
  getAuthenticatedUser,
  signAdminToken,
  verifyPassword,
} from "@/lib/serverAuth";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * GET /api/v1/auth/admin
 * Verifies current admin session (either jhes_admin_session cookie or verified admin/manager user session).
 */
export async function GET(req: NextRequest) {
  const existingAdmin = getAuthenticatedAdmin(req);
  if (existingAdmin) {
    return NextResponse.json(
      {
        authenticated: true,
        admin: {
          id: existingAdmin.sub,
          email: existingAdmin.email,
          name: existingAdmin.name,
          role: existingAdmin.role,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  // Check if the logged-in customer session belongs to an active manager/admin in Airtable Staff or Users
  const user = getAuthenticatedUser(req);
  if (user?.email) {
    try {
      const safeEmail = escapeFormulaString(user.email.toLowerCase().trim());
      const staffMatches = await airtableList("Staff", `LOWER({email}) = '${safeEmail}'`, true);
      const activeManager = staffMatches.find(
        (s: any) =>
          Boolean(s.is_active) &&
          ["admin", "manager"].includes(String(s.role || "").toLowerCase().trim())
      );

      if (activeManager) {
        const adminPayload = {
          sub: String(activeManager.id),
          email: String(activeManager.email).toLowerCase().trim(),
          name: String(activeManager.full_name || user.name || "Store Manager"),
          role: (String(activeManager.role).toLowerCase() === "admin" ? "admin" : "manager") as
            | "admin"
            | "manager",
        };
        const token = signAdminToken(adminPayload);
        const res = NextResponse.json({ authenticated: true, admin: adminPayload });
        res.cookies.set(ADMIN_COOKIE_NAME, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 12 * 60 * 60,
          path: "/",
        });
        return res;
      }
    } catch {
      // Fall through to 401
    }
  }

  return NextResponse.json(
    { authenticated: false, detail: "Administrator authentication required." },
    { status: 401, headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * POST /api/v1/auth/admin
 * Authenticates an administrator strictly server-side using:
 * 1) Active Staff record in Airtable (role = manager|admin, matching email + staff_id), OR
 * 2) Server-side ADMIN_PASSCODE environment variable (if configured on the server), OR
 * 3) Admin/Manager user in Airtable Users table with verified password_hash.
 * Never grants admin access via hardcoded client passcodes or public registration.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").toLowerCase().trim();
    const credential = String(body.credential || body.passcode || body.password || "").trim();

    if (!email || !credential) {
      return NextResponse.json(
        { detail: "Manager email and staff credential/passcode are required." },
        { status: 400 }
      );
    }

    const safeEmail = escapeFormulaString(email);

    // 1. Check Airtable Staff table for active manager/admin with matching staff_id
    let staffRecord: any = null;
    try {
      const matches = await airtableList("Staff", `LOWER({email}) = '${safeEmail}'`, true);
      staffRecord = matches.find(
        (s: any) =>
          Boolean(s.is_active) &&
          ["admin", "manager"].includes(String(s.role || "").toLowerCase().trim())
      );
    } catch (err) {
      console.error("Staff verification lookup error:", err);
    }

    let verified = false;
    let adminName = "Store Manager";
    let adminRole: "admin" | "manager" = "manager";
    let adminSub = "admin";

    if (staffRecord) {
      adminName = String(staffRecord.full_name || "Store Manager");
      adminRole = String(staffRecord.role).toLowerCase() === "admin" ? "admin" : "manager";
      adminSub = String(staffRecord.id);

      const expectedStaffId = String(staffRecord.staff_id || "").trim();
      if (expectedStaffId && safeCompare(credential, expectedStaffId)) {
        verified = true;
      }
    }

    // 2. Check optional server-configured ADMIN_PASSCODE env var (requires valid staff manager email)
    const serverPasscode = process.env.ADMIN_PASSCODE?.trim();
    if (!verified && serverPasscode && staffRecord && safeCompare(credential, serverPasscode)) {
      verified = true;
    }

    // 3. Check Airtable Users table for role=admin/manager with verified password_hash
    if (!verified) {
      try {
        const userMatches = await airtableList("Users", `LOWER({email}) = '${safeEmail}'`, true);
        const adminUser = userMatches.find((u: any) =>
          ["admin", "manager"].includes(String(u.role || "").toLowerCase().trim())
        );
        if (adminUser && adminUser.password_hash && verifyPassword(credential, String(adminUser.password_hash))) {
          verified = true;
          adminName = String(adminUser.full_name || "Administrator");
          adminRole = String(adminUser.role).toLowerCase() === "admin" ? "admin" : "manager";
          adminSub = String(adminUser.id);
        }
      } catch {
        // Ignore
      }
    }

    if (!verified) {
      return NextResponse.json(
        {
          detail:
            "Invalid administrator credentials. Only active managers/administrators listed in Airtable Staff or Users may sign in.",
        },
        { status: 401 }
      );
    }

    const token = signAdminToken({
      sub: adminSub,
      email,
      name: adminName,
      role: adminRole,
    });

    const res = NextResponse.json({
      authenticated: true,
      admin: {
        id: adminSub,
        email,
        name: adminName,
        role: adminRole,
      },
      message: `Authenticated as ${adminName}.`,
    });

    res.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 12 * 60 * 60,
      path: "/",
    });

    return res;
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Admin authentication failed." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/auth/admin
 * Ends the administrator session and clears the HttpOnly cookie.
 */
export async function DELETE() {
  const res = NextResponse.json({ authenticated: false, message: "Admin session locked." });
  res.cookies.delete(ADMIN_COOKIE_NAME);
  return res;
}
