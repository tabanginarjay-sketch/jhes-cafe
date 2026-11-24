import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { airtableList } from "@/lib/airtable";
import {
  DRIVER_COOKIE_NAME,
  escapeFormulaString,
  getAuthenticatedDriver,
  signDriverToken,
} from "@/lib/serverAuth";
import { listDrivers } from "@/lib/deliveryStore";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * GET /api/v1/auth/driver
 * Verifies the active driver session strictly from the HttpOnly jhes_driver_session cookie.
 */
export async function GET(req: NextRequest) {
  const driverSession = getAuthenticatedDriver(req);
  if (!driverSession) {
    return NextResponse.json(
      { authenticated: false, detail: "Driver authentication required." },
      { status: 401, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const allDrivers = await listDrivers().catch(() => []);
  const profile = allDrivers.find((d) => d.id === driverSession.sub);

  if (profile && !profile.is_active) {
    const res = NextResponse.json(
      { authenticated: false, detail: "Driver account is currently inactive." },
      { status: 403, headers: { "Cache-Control": "private, no-store" } }
    );
    res.cookies.set(DRIVER_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return res;
  }

  return NextResponse.json(
    {
      authenticated: true,
      driver: profile || {
        id: driverSession.sub,
        staff_id: driverSession.staff_id,
        full_name: driverSession.name,
        email: driverSession.email,
        phone: driverSession.phone || "",
        role: "driver",
        availability_status: "available",
        is_active: true,
      },
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

/**
 * POST /api/v1/auth/driver
 * Authenticates an active delivery driver registered in Airtable Staff (role = "driver")
 * using their email and staff_id credential. Issues an isolated HttpOnly jhes_driver_session cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").toLowerCase().trim();
    const credential = String(body.credential || body.staff_id || body.passcode || "").trim();

    if (!email || !credential) {
      return NextResponse.json(
        { detail: "Driver email and Driver ID credential are required." },
        { status: 400 }
      );
    }

    const safeEmail = escapeFormulaString(email);
    const matches = await airtableList("Staff", `LOWER({email}) = '${safeEmail}'`, true).catch(() => []);
    const driverStaff: any = matches.find(
      (s: any) =>
        Boolean(s.is_active) && String(s.role || "").toLowerCase().trim() === "driver"
    );

    if (!driverStaff) {
      return NextResponse.json(
        {
          detail:
            "Invalid driver credentials. Only active delivery drivers registered in Staff may access the Driver Portal.",
        },
        { status: 401 }
      );
    }

    const expectedStaffId = String(driverStaff.staff_id || "").trim();
    if (!expectedStaffId || !safeCompare(credential, expectedStaffId)) {
      return NextResponse.json(
        { detail: "Invalid driver email or Driver ID credential." },
        { status: 401 }
      );
    }

    const allDrivers = await listDrivers().catch(() => []);
    const profile = allDrivers.find((d) => d.id === String(driverStaff.id));

    const token = signDriverToken({
      sub: String(driverStaff.id),
      staff_id: expectedStaffId,
      email,
      name: String(driverStaff.full_name || "Delivery Driver"),
      role: "driver",
      phone: profile?.phone || "",
    });

    const res = NextResponse.json(
      {
        authenticated: true,
        driver: profile || {
          id: String(driverStaff.id),
          staff_id: expectedStaffId,
          full_name: String(driverStaff.full_name || "Delivery Driver"),
          email,
          phone: "",
          vehicle_type: "Motorcycle",
          plate_number: "",
          shift: String(driverStaff.shift || "Day Shift"),
          is_active: true,
          availability_status: "available",
        },
        message: `Signed in as driver ${driverStaff.full_name}.`,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );

    res.cookies.set(DRIVER_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 12 * 60 * 60,
      path: "/",
    });

    return res;
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Driver authentication failed." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json(
    { authenticated: false, message: "Driver session signed out." },
    { headers: { "Cache-Control": "private, no-store" } }
  );
  res.cookies.set(DRIVER_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}
