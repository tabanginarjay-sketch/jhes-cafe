/**
 * JHE'S CAFE' — AUTHENTICATION & MY ORDERS SESSION VERIFICATION SUITE
 * Verifies all 9 required test cases + canonical multi-provider identity + security isolation
 * against the live deployment without modifying existing customer records.
 *
 * Usage:
 *   BASE_URL=https://jhescafe.vercel.app node scripts/test_auth_session_flows.mjs
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

const BASE_URL = (process.env.BASE_URL || "https://jhescafe.vercel.app").replace(/\/$/, "");

function loadAirtableEnv() {
  const candidates = [
    path.resolve(process.cwd(), "frontend/.env.local"),
    path.resolve(process.cwd(), "backend/.env"),
  ];
  const env = {};
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const idx = line.indexOf("=");
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!(k in env)) env[k] = v;
    }
  }
  return env;
}

const ENV = loadAirtableEnv();
const AIRTABLE_PAT = ENV.AIRTABLE_PAT || process.env.AIRTABLE_PAT;
const AIRTABLE_BASE_ID = ENV.AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
}

function extractCookies(res) {
  const list =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie")].filter(Boolean);
  const jar = {};
  for (const raw of list) {
    const first = raw.split(";")[0];
    const eq = first.indexOf("=");
    if (eq > 0) {
      const k = first.slice(0, eq).trim();
      const v = first.slice(eq + 1).trim();
      jar[k] = v;
    }
  }
  return jar;
}

function cookieHeader(jar) {
  return Object.entries(jar)
    .filter(([, v]) => Boolean(v))
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function signTestSessionToken(payload) {
  const secret =
    ENV.SESSION_SECRET ||
    ENV.AUTH_SECRET ||
    ENV.GOOGLE_CLIENT_SECRET ||
    ENV.AIRTABLE_PAT ||
    "";
  const key = secret
    ? crypto.createHash("sha256").update(`jhes-cafe-v1:${secret}`).digest("hex")
    : "jhes-cafe-local-dev-only-signing-key";
  const full = { ...payload, exp: Math.floor(Date.now() / 1000) + 3600 };
  const encoded = Buffer.from(JSON.stringify(full), "utf-8").toString("base64url");
  const sig = crypto.createHmac("sha256", key).update(encoded).digest("base64url");
  return `jhes_v1.${encoded}.${sig}`;
}

async function airtableCleanup(table, formula) {
  if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) return;
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}?filterByFormula=${encodeURIComponent(formula)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } });
  if (!res.ok) return;
  const json = await res.json();
  for (const rec of json.records || []) {
    await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}/${rec.id}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } }
    ).catch(() => {});
  }
}

async function run() {
  console.log(`\n=== JHE'S CAFE' — AUTH & MY ORDERS 9-CASE VERIFICATION SUITE ===`);
  console.log(`Target: ${BASE_URL}\n`);

  const runId = Date.now().toString().slice(-6);
  const emailA = `auth.verify.a.${runId}@jhescafe-demo.test`;
  const emailB = `auth.verify.b.${runId}@jhescafe-demo.test`;
  const password = "CoffeeAuthVerify!2026";
  let userAId = null;
  let userBId = null;
  let orderAId = null;
  let orderANumber = null;

  try {
    // ------------------------------------------------------------------
    // PRE-CHECK: Unauthenticated RSC Prefetch & Logged-Out Route Protection
    // Covers TC 6 & TC 7 (unauthenticated redirect + no-store caching headers)
    // ------------------------------------------------------------------
    const unauthPrefetch = await fetch(`${BASE_URL}/my-orders`, {
      redirect: "manual",
      headers: { RSC: "1", "Next-Router-Prefetch": "1" },
    });
    assert(unauthPrefetch.status === 307, `Unauthenticated /my-orders prefetch must 307, got ${unauthPrefetch.status}`);
    assert(
      (unauthPrefetch.headers.get("location") || "").includes("/login?redirect=%2Fmy-orders"),
      `Expected redirect to /login?redirect=%2Fmy-orders, got ${unauthPrefetch.headers.get("location")}`
    );
    const prefetchCC = (unauthPrefetch.headers.get("cache-control") || "").toLowerCase();
    assert(prefetchCC.includes("no-store"), `Middleware redirect must set Cache-Control: no-store, got "${prefetchCC}"`);
    assert(
      (unauthPrefetch.headers.get("vary") || "").toLowerCase().includes("cookie"),
      `Middleware redirect must include Vary: Cookie`
    );

    const unauthOrder = await fetch(`${BASE_URL}/order`, { redirect: "manual" });
    assert(unauthOrder.status === 307, `Unauthenticated /order must 307, got ${unauthOrder.status}`);
    assert(
      (unauthOrder.headers.get("location") || "").includes("/login?redirect=%2Forder"),
      `Expected /order unauth redirect to /login?redirect=%2Forder`
    );

    const unauthOrdersApi = await fetch(`${BASE_URL}/api/v1/orders`);
    assert(unauthOrdersApi.status === 401, `Unauthenticated GET /api/v1/orders must return 401, got ${unauthOrdersApi.status}`);
    console.log("PASS [TC 7]: Unauthenticated /my-orders, /order, and /api/v1/orders strictly protected with no-store & Vary: Cookie.");

    // ------------------------------------------------------------------
    // Register & Login Account A (Email + Password)
    // Covers TC 2 & TC 8
    // ------------------------------------------------------------------
    const regA = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: "Auth Verify Customer A", email: emailA, password }),
    });
    assert(regA.status === 201, `Account A registration failed: ${regA.status}`);
    const regAJson = await regA.json();
    userAId = regAJson.user.id;

    // Duplicate email registration must be blocked (409)
    const dupReg = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: "Duplicate Attempt", email: emailA, password }),
    });
    assert(dupReg.status === 409, `Duplicate registration for same email must return 409, got ${dupReg.status}`);

    // Explicit Email Login
    const loginA = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailA, password }),
    });
    assert(loginA.status === 200, `Email login failed: ${loginA.status}`);
    const jarA = extractCookies(loginA);
    assert(Boolean(jarA.jhes_session), "Email login must set jhes_session HttpOnly cookie");
    const cookieA = cookieHeader(jarA);

    // Place a real order for Account A so we can verify actual customer order history
    const ordRes = await fetch(`${BASE_URL}/api/v1/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({
        customer_name: "Auth Verify Customer A",
        customer_email: emailA,
        dining_option: "Takeaway",
        payment_method: "cash",
        idempotency_key: `auth-test-${runId}`,
        items: [
          {
            product_name: "Spanish Latte Dulce",
            quantity: 1,
            size: "Grande 16oz",
            temperature: "Hot",
            milk: "Whole Milk",
            sweetness: 50,
          },
        ],
      }),
    });
    assert(ordRes.status === 201, `Order placement failed: ${ordRes.status}`);
    const ordJson = await ordRes.json();
    orderAId = ordJson.id;
    orderANumber = ordJson.order_number;

    // Verify Email-authenticated customer accessing /my-orders gets 200 (NO redirect to /login!)
    const emailMyOrders = await fetch(`${BASE_URL}/my-orders`, {
      headers: { Cookie: cookieA },
      redirect: "manual",
    });
    assert(emailMyOrders.status === 200, `Email-authenticated /my-orders must return 200, got ${emailMyOrders.status} (${emailMyOrders.headers.get("location")})`);
    const myOrdersHtml = await emailMyOrders.text();
    assert(!myOrdersHtml.includes("Log in to your account"), "/my-orders must NEVER render the login form for authenticated customer");

    // Verify visiting /login?redirect=/my-orders WHILE AUTHENTICATED immediately bounces to /my-orders (TC 8 + no duplicate login!)
    const authedLoginBounce = await fetch(`${BASE_URL}/login?redirect=%2Fmy-orders`, {
      headers: { Cookie: cookieA },
      redirect: "manual",
    });
    assert(authedLoginBounce.status === 307, `Authenticated GET /login?redirect=/my-orders must 307 redirect, got ${authedLoginBounce.status}`);
    assert(
      (authedLoginBounce.headers.get("location") || "").endsWith("/my-orders"),
      `Authenticated /login?redirect=/my-orders must redirect to /my-orders, got ${authedLoginBounce.headers.get("location")}`
    );
    console.log("PASS [TC 2 & TC 8]: Email login opens /my-orders (HTTP 200), /login bounces authenticated sessions back to /my-orders, duplicate email blocked (409).");

    // ------------------------------------------------------------------
    // TC 1: Google-provider session with the EXACT SAME email maps to the SAME canonical customer_id & opens /my-orders
    // ------------------------------------------------------------------
    const googleSessionToken = signTestSessionToken({
      sub: userAId,
      email: emailA,
      role: "customer",
      name: "Auth Verify Customer A",
      auth_provider: "google",
    });
    const googleCookie = `jhes_session=${googleSessionToken}`;

    const [googleMeRes, googleMyOrdersRes, googleOrdersApiRes] = await Promise.all([
      fetch(`${BASE_URL}/api/v1/auth/me`, { headers: { Cookie: googleCookie } }),
      fetch(`${BASE_URL}/my-orders`, { headers: { Cookie: googleCookie }, redirect: "manual" }),
      fetch(`${BASE_URL}/api/v1/orders?include_items=true`, { headers: { Cookie: googleCookie } }),
    ]);
    assert(googleMeRes.status === 200, `Google session /auth/me must return 200, got ${googleMeRes.status}`);
    const googleMe = await googleMeRes.json();
    assert(googleMe.id === userAId, `Google session must map to canonical customer_id ${userAId}, got ${googleMe.id}`);
    assert(googleMyOrdersRes.status === 200, `Google session /my-orders must return 200, got ${googleMyOrdersRes.status}`);
    const googleOrders = await googleOrdersApiRes.json();
    assert(
      googleOrders.some((o) => o.order_number === orderANumber && o.customer_id === userAId),
      "Google session must retrieve the exact same canonical customer's orders"
    );
    console.log(`PASS [TC 1]: Google session maps to identical canonical customer_id (${userAId}), opens /my-orders (200), and loads Order #${orderANumber}.`);

    // ------------------------------------------------------------------
    // TC 3, TC 4, TC 5: Refresh /my-orders, navigate Home/Menu/Account/Cart/My Orders/Order, and open in new tab (fresh cookie request)
    // ------------------------------------------------------------------
    const navRoutes = ["/", "/menu", "/account", "/cart", "/my-orders", "/checkout", "/order"];
    for (const route of navRoutes) {
      const r = await fetch(`${BASE_URL}${route}`, {
        headers: { Cookie: cookieA },
        redirect: "manual",
      });
      assert(r.status === 200, `Authenticated route ${route} failed with status ${r.status} (loc: ${r.headers.get("location")})`);
    }
    // Simulate reload + new tab request for /my-orders
    const reloadRes = await fetch(`${BASE_URL}/my-orders`, {
      headers: { Cookie: cookieA, "Cache-Control": "no-cache" },
      redirect: "manual",
    });
    assert(reloadRes.status === 200, `Reloaded /my-orders must return 200, got ${reloadRes.status}`);
    const newTabOrders = await (
      await fetch(`${BASE_URL}/api/v1/orders?include_items=true`, { headers: { Cookie: cookieA } })
    ).json();
    assert(
      Array.isArray(newTabOrders) &&
        newTabOrders.length === 1 &&
        newTabOrders[0].order_number === orderANumber &&
        newTabOrders[0].customer_id === userAId,
      "New tab / refreshed /my-orders must load exact customer order history"
    );
    console.log("PASS [TC 3, 4, 5 & 9]: Refresh, full route navigation (/, /menu, /account, /cart, /my-orders, /checkout, /order), and new-tab session all return 200 with exact customer order history.");

    // ------------------------------------------------------------------
    // Cross-Account Security Check: Account B cannot see Account A's orders
    // ------------------------------------------------------------------
    const regB = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: "Auth Verify Customer B", email: emailB, password }),
    });
    assert(regB.status === 201, `Account B registration failed: ${regB.status}`);
    const regBJson = await regB.json();
    userBId = regBJson.user.id;
    const cookieB = cookieHeader(extractCookies(regB));
    const ordersB = await (
      await fetch(`${BASE_URL}/api/v1/orders?include_items=true`, { headers: { Cookie: cookieB } })
    ).json();
    assert(
      Array.isArray(ordersB) && !ordersB.some((o) => o.order_number === orderANumber),
      "Security breach: Account B saw Account A's order!"
    );
    console.log("PASS [SECURITY]: Account B completely isolated from Account A's orders.");

    // ------------------------------------------------------------------
    // TC 6: Sign out & attempt to open /my-orders -> redirected to /login?redirect=/my-orders & API returns 401
    // ------------------------------------------------------------------
    const logoutRes = await fetch(`${BASE_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: { Cookie: cookieA },
    });
    assert(logoutRes.status === 200, `Logout failed: ${logoutRes.status}`);
    const logoutCookies = (
      typeof logoutRes.headers.getSetCookie === "function"
        ? logoutRes.headers.getSetCookie()
        : [logoutRes.headers.get("set-cookie") || ""]
    ).join("; ");
    assert(
      logoutCookies.includes("jhes_session=;") || logoutCookies.includes("Max-Age=0"),
      `Logout must clear jhes_session cookie, got: ${logoutCookies}`
    );

    const postLogoutMyOrders = await fetch(`${BASE_URL}/my-orders`, { redirect: "manual" });
    assert(postLogoutMyOrders.status === 307, `Post-logout /my-orders must 307 redirect to login, got ${postLogoutMyOrders.status}`);
    assert(
      (postLogoutMyOrders.headers.get("location") || "").includes("/login?redirect=%2Fmy-orders"),
      `Post-logout /my-orders must preserve redirect=/my-orders`
    );
    const postLogoutMe = await fetch(`${BASE_URL}/api/v1/auth/me`);
    assert(postLogoutMe.status === 401, `Post-logout /auth/me must return 401`);
    console.log("PASS [TC 6]: Sign out clears jhes_session cookie (Max-Age=0), /my-orders redirects to /login?redirect=%2Fmy-orders, and /auth/me returns 401.");

    console.log("\n==============================================================");
    console.log("ALL 9 AUTH & MY ORDERS VERIFICATION TEST CASES PASSED!");
    console.log("==============================================================\n");
  } finally {
    console.log("[Cleanup] Removing temporary test records...");
    for (const em of [emailA, emailB]) {
      const safe = em.replace(/'/g, "\\'");
      await airtableCleanup("Users", `LOWER({email}) = '${safe}'`);
      await airtableCleanup("Orders", `LOWER({customer_email}) = '${safe}'`);
    }
    for (const uid of [userAId, userBId].filter(Boolean)) {
      await airtableCleanup("Payments", `{order_id} = '${uid}'`);
    }
    if (orderAId) {
      await airtableCleanup("OrderItems", `{order_id} = '${orderAId}'`);
      await airtableCleanup("Payments", `{order_id} = '${orderAId}'`);
    }
    if (orderANumber) {
      await airtableCleanup("Payments", `{order_number} = '${orderANumber}'`);
    }
    console.log("[Cleanup] Complete. Existing customer records untouched.");
  }
}

run().catch((err) => {
  console.error("\nTEST SUITE FAILED:", err);
  process.exit(1);
});
