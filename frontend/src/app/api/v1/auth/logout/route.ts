import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ status: "ok", message: "Successfully signed out." });
  res.cookies.delete("jhes_session");
  return res;
}
