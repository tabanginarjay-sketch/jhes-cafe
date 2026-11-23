import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    status: "prepared",
    message: "Facebook Login endpoint is prepared. Pending Facebook App Client ID configuration.",
    phase: 2,
  });
}
