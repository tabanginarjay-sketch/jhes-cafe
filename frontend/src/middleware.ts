import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "jhes_session";

function base64UrlToBytes(b64url: string): Uint8Array {
  const padded = b64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (b64url.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getSigningSecretEdge(): Promise<string> {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.AIRTABLE_PAT ||
    "";
  if (secret) {
    const data = new TextEncoder().encode(`jhes-cafe-v1:${secret}`);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return bytesToHex(new Uint8Array(digest));
  }
  return "jhes-cafe-local-dev-only-signing-key";
}

async function verifySessionTokenEdge(token?: string | null): Promise<boolean> {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "jhes_v1") return false;

  const [, encoded, sig] = parts;
  try {
    const signingSecret = await getSigningSecretEdge();
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(signingSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded));
    const expectedSig = bytesToBase64Url(new Uint8Array(mac));
    if (sig.length !== expectedSig.length) return false;

    let diff = 0;
    for (let i = 0; i < sig.length; i++) {
      diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }
    if (diff !== 0) return false;

    const jsonStr = new TextDecoder().decode(base64UrlToBytes(encoded));
    const payload = JSON.parse(jsonStr) as { exp?: number; sub?: string };
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return false;
    }
    return Boolean(payload.sub);
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isValid = await verifySessionTokenEdge(sessionCookie);

  if (!isValid) {
    const loginUrl = new URL("/login", req.url);
    const returnTo = `${pathname}${search}`;
    loginUrl.searchParams.set("redirect", returnTo);
    const res = NextResponse.redirect(loginUrl);
    if (sessionCookie) {
      res.cookies.delete(SESSION_COOKIE_NAME);
    }
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/order/:path*"],
};
