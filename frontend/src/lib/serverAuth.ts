import crypto from "crypto";
import { NextRequest } from "next/server";

export interface SessionPayload {
  sub: string;
  email: string;
  role: string;
  name: string;
  auth_provider?: string;
  avatar_url?: string | null;
  exp: number;
}

export interface AdminSessionPayload {
  sub: string;
  email: string;
  role: "admin" | "manager";
  name: string;
  exp: number;
}

export const SESSION_COOKIE_NAME = "jhes_session";
export const ADMIN_COOKIE_NAME = "jhes_admin_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60;

function getSigningSecret(): string {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.AIRTABLE_PAT ||
    "";
  if (secret) {
    return crypto.createHash("sha256").update(`jhes-cafe-v1:${secret}`).digest("hex");
  }
  return "jhes-cafe-local-dev-only-signing-key";
}

function hmacSign(data: string): string {
  return crypto.createHmac("sha256", getSigningSecret()).update(data).digest("base64url");
}

export function signSessionToken(
  payload: Omit<SessionPayload, "exp">,
  ttlSeconds: number = SESSION_TTL_SECONDS
): string {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), "utf-8").toString("base64url");
  const sig = hmacSign(encoded);
  return `jhes_v1.${encoded}.${sig}`;
}

export function verifySessionToken(token?: string | null): SessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "jhes_v1") {
    return null;
  }
  const [, encoded, sig] = parts;
  const expectedSig = hmacSign(encoded);
  try {
    const sigBuf = Buffer.from(sig, "utf-8");
    const expBuf = Buffer.from(expectedSig, "utf-8");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const decoded = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8")) as SessionPayload;
    if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function signAdminToken(payload: Omit<AdminSessionPayload, "exp">): string {
  const fullPayload: AdminSessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), "utf-8").toString("base64url");
  const sig = hmacSign(`admin:${encoded}`);
  return `jhes_adm_v1.${encoded}.${sig}`;
}

export function verifyAdminToken(token?: string | null): AdminSessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "jhes_adm_v1") {
    return null;
  }
  const [, encoded, sig] = parts;
  const expectedSig = hmacSign(`admin:${encoded}`);
  try {
    const sigBuf = Buffer.from(sig, "utf-8");
    const expBuf = Buffer.from(expectedSig, "utf-8");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const decoded = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8")) as AdminSessionPayload;
    if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    if (decoded.role !== "admin" && decoded.role !== "manager") {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function getAuthenticatedUser(req: NextRequest): SessionPayload | null {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(bearer) || verifySessionToken(cookieToken);
}

export function getAuthenticatedAdmin(req: NextRequest): AdminSessionPayload | null {
  const adminCookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const verifiedAdmin = verifyAdminToken(adminCookie);
  if (verifiedAdmin) return verifiedAdmin;

  // Also allow authenticated user session if their verified role is admin/manager
  const user = getAuthenticatedUser(req);
  if (user && (user.role === "admin" || user.role === "manager")) {
    return {
      sub: user.sub,
      email: user.email,
      role: user.role,
      name: user.name,
      exp: user.exp,
    };
  }
  return null;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash?: string | null): boolean {
  if (!storedHash || !password) return false;
  if (!storedHash.startsWith("scrypt$")) return false;
  const parts = storedHash.split("$");
  if (parts.length !== 3) return false;
  const [, salt, expectedHex] = parts;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, "hex");
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/**
 * Sanitizes phone numbers for Airtable's numeric phone columns (`Users.phone`, `Orders.customer_phone`).
 * Returns a positive integer if digits exist, otherwise undefined so Airtable never rejects with HTTP 422.
 */
export function sanitizeNumericPhone(phone?: string | number | null): number | undefined {
  if (phone === null || phone === undefined) return undefined;
  const digits = String(phone).replace(/\D/g, "");
  if (!digits || digits.length < 7) return undefined;
  const num = Number(digits);
  return Number.isSafeInteger(num) ? num : undefined;
}

/**
 * Escapes single quotes for safe Airtable filterByFormula string interpolation.
 */
export function escapeFormulaString(value: string): string {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
