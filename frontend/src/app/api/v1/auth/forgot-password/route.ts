import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    return NextResponse.json({
      status: "ok",
      message: "If this email is registered, you will receive password reset instructions.",
      email: email ? String(email).trim().toLowerCase() : undefined,
    });
  } catch (err) {
    return NextResponse.json({ detail: "Error processing request" }, { status: 400 });
  }
}
