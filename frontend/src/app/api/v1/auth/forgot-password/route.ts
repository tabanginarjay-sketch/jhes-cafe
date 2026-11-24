import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    return NextResponse.json({
      status: "demo_notice",
      email_sent: false,
      message:
        "Portfolio demo notice: Outbound password-reset emails are not configured on this showcase deployment. Signed-in members can manage their password in My Account -> Account Security, or sign in using Google / Facebook.",
      email: email ? String(email).trim().toLowerCase() : undefined,
    });
  } catch {
    return NextResponse.json({ detail: "Error processing request" }, { status: 400 });
  }
}
