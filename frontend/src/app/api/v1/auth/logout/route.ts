import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/serverAuth";

export async function POST() {
  const res = NextResponse.json(
    { status: "ok", message: "Successfully signed out." },
    { headers: { "Cache-Control": "private, no-store, must-revalidate" } }
  );
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  res.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}
