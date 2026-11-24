import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/serverAuth";

export async function POST() {
  const res = NextResponse.json({ status: "ok", message: "Successfully signed out." });
  res.cookies.delete(SESSION_COOKIE_NAME);
  res.cookies.delete(ADMIN_COOKIE_NAME);
  return res;
}
