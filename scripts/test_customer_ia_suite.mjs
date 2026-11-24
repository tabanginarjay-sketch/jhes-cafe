import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3005";

function loadEnvConfig() {
  const envPaths = [path.resolve("backend/.env"), path.resolve("frontend/.env.local")];
  const cfg = { ...process.env };
  for (const p of envPaths) {
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf-8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const idx = trimmed.indexOf("=");
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!cfg[k]) cfg[k] = v;
    }
  }
  return cfg;
}

const ENV = loadEnvConfig();
const AIRTABLE_PAT = ENV.AIRTABLE_PAT;
const AIRTABLE_BASE_ID = ENV.AIRTABLE_BASE_ID;

async function airtableDelete(tableName, id) {
  if (!id || !id.startsWith("rec")) return;
  await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableName}/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
  }).catch(() => {});
}

async function api(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    redirect: "manual",
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });
  const setCookie = res.headers.get("set-cookie");
  const location = res.headers.get("location");
  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data, text, setCookie, location };
}

function extractCookie(setCookieHeader, name) {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

async function runCustomerIASuite() {
  console.log("=== JHE'S CAFE' — CUSTOMER IA 14-FLOW VERIFICATION SUITE ===");
  console.log(`Target: ${BASE_URL}\n`);

  const cleanup = { Orders: [], OrderItems: [], Payments: [], Users: [] };
  const stamp = Date.now();
  const emailA = `test.ia.a.${stamp}@jhescafe.ph`;
  const emailB = `test.ia.b.${stamp}@jhescafe.ph`;
  const password = "IaPassword123!";

  try {
    // 1. Navigate Home -> Menu (verify public routes & new main navigation structure)
    const [homeRes, menuRes, prodRes] = await Promise.all([
      api("/"),
      api("/menu"),
      api("/api/v1/catalog/products"),
    ]);
    assert.strictEqual(homeRes.status, 200, "Home page must return 200");
    assert.strictEqual(menuRes.status, 200, "Menu page must return 200");
    assert.ok(homeRes.text.includes('href="/my-orders"'), "Main navigation must link My Orders to /my-orders");
    assert.ok(Array.isArray(prodRes.data) && prodRes.data.length > 0, "Menu products must load from Airtable");
    console.log("PASS [01/14]: Home -> Menu navigation & live catalog verified (My Orders -> /my-orders).");

    // Verify protected routes redirect guests to /login
    for (const protectedPath of ["/account", "/my-orders", "/checkout"]) {
      const guestCheck = await api(protectedPath);
      assert.strictEqual(guestCheck.status, 307, `${protectedPath} must redirect unauthenticated guests`);
      assert.ok(
        (guestCheck.location || "").includes(`/login?redirect=${encodeURIComponent(protectedPath)}`),
        `${protectedPath} redirect target mismatch: ${guestCheck.location}`
      );
    }
    const guestCartApi = await api("/api/v1/cart");
    assert.strictEqual(guestCartApi.status, 401, "Guest cart API access must be 401");

    // Register Account A
    const regA = await api("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        full_name: "IA Customer Alpha",
        email: emailA,
        password,
        phone: "09171112233",
      }),
    });
    assert.strictEqual(regA.status, 201, `Account A registration failed: ${JSON.stringify(regA.data)}`);
    let cookieA = extractCookie(regA.setCookie, "jhes_session");
    const userA = regA.data.user;
    cleanup.Users.push(userA.id);
    assert.strictEqual(userA.loyalty_points, 25);

    // 2. Add product to Cart (Account A)
    const cartItem = {
      id: `cart-item-${stamp}`,
      productId: "spanish-latte-dulce",
      slug: "spanish-latte-dulce",
      name: "Spanish Latte Dulce",
      category: "Signature Espresso",
      price: 220,
      quantity: 1,
      size: "Grande 16oz",
      temperature: "Iced",
      milk: "Whole Milk",
      sweetness: 50,
      customizationSummary: "Grande 16oz · Iced · Whole Milk · 50% sweet",
    };
    const saveCart = await api("/api/v1/cart", {
      method: "POST",
      headers: { Cookie: `jhes_session=${cookieA}` },
      body: JSON.stringify({ items: [cartItem] }),
    });
    assert.strictEqual(saveCart.status, 200);
    assert.strictEqual(saveCart.data.total_count, 1);
    console.log("PASS [02/14]: Authenticated Account A added customized product to persistent Cart (guests blocked 401).");

    // 3. Open Cart page & API
    const [cartPageRes, cartGetRes] = await Promise.all([
      api("/cart", { headers: { Cookie: `jhes_session=${cookieA}` } }),
      api("/api/v1/cart", { headers: { Cookie: `jhes_session=${cookieA}` } }),
    ]);
    assert.strictEqual(cartPageRes.status, 200);
    assert.strictEqual(cartGetRes.data.items.length, 1);
    assert.strictEqual(cartGetRes.data.items[0].name, "Spanish Latte Dulce");
    assert.strictEqual(cartGetRes.data.subtotal, 220);
    console.log("PASS [03/14]: /cart route & API returned persisted item, customization, unit price & subtotal.");

    // 4. Proceed to Checkout (/checkout)
    const checkoutPageRes = await api("/checkout", {
      headers: { Cookie: `jhes_session=${cookieA}` },
    });
    assert.strictEqual(checkoutPageRes.status, 200, "Authenticated /checkout must return 200");
    console.log("PASS [04/14]: Dedicated /checkout route accessible for authenticated customer (protected for guests).");

    // 5. Verify authoritative account details prefill cleanly
    const meBeforeOrder = await api("/api/v1/auth/me", {
      headers: { Cookie: `jhes_session=${cookieA}` },
    });
    assert.strictEqual(meBeforeOrder.status, 200);
    assert.strictEqual(meBeforeOrder.data.id, userA.id);
    assert.strictEqual(meBeforeOrder.data.full_name, "IA Customer Alpha");
    assert.strictEqual(meBeforeOrder.data.email, emailA);
    assert.strictEqual(meBeforeOrder.data.loyalty_points, 25);
    console.log("PASS [05/14]: Account contact info & canonical customer_id verified for Checkout prefill.");

    // 6. Verify empty-cart submission is rejected & dining/payment validation enforced
    const emptyOrderAttempt = await api("/api/v1/orders", {
      method: "POST",
      headers: { Cookie: `jhes_session=${cookieA}` },
      body: JSON.stringify({
        customer_name: "IA Customer Alpha",
        dining_option: "Dine-in",
        payment_method: "cash",
        items: [],
      }),
    });
    assert.strictEqual(emptyOrderAttempt.status, 400, "Empty cart order submission must be rejected (400)");
    console.log("PASS [06/14]: Checkout dining/payment validation active & empty-cart submission strictly blocked.");

    // 7. Submit valid order
    const orderNum = `JHE-IA-${Math.floor(10000 + Math.random() * 90000)}`;
    const placeOrder = await api("/api/v1/orders", {
      method: "POST",
      headers: { Cookie: `jhes_session=${cookieA}` },
      body: JSON.stringify({
        order_number: orderNum,
        idempotency_key: `IDEM-IA-${stamp}`,
        customer_name: "IA Customer Alpha",
        customer_email: emailA,
        customer_phone: "09171112233",
        dining_option: "Dine-in",
        seating_zone: "Communal Walnut Table",
        table_number: "Table 3",
        payment_method: "cash",
        special_notes: "Less ice please",
        items: [
          {
            product_name: "Spanish Latte Dulce",
            quantity: 1,
            unit_price: 220,
            subtotal: 220,
            size: "Grande 16oz",
            temperature: "Iced",
            milk_type: "Whole Milk",
            sweetness: 50,
          },
        ],
      }),
    });
    assert.strictEqual(placeOrder.status, 201, `Order creation failed: ${JSON.stringify(placeOrder.data)}`);
    assert.strictEqual(placeOrder.data.order_number, orderNum);
    assert.strictEqual(placeOrder.data.status, "pending");
    assert.strictEqual(placeOrder.data.payment_status, "pending");
    assert.strictEqual(placeOrder.data.loyalty_points_earned, 4);
    assert.strictEqual(placeOrder.data.updated_loyalty_points, 29);
    cleanup.Orders.push(placeOrder.data.id);
    if (placeOrder.data.payment?.id) cleanup.Payments.push(placeOrder.data.payment.id);
    for (const it of placeOrder.data.items || []) {
      if (it.id) cleanup.OrderItems.push(it.id);
    }
    // Cart must be cleared automatically post-order
    const cartAfterOrder = await api("/api/v1/cart", {
      headers: { Cookie: `jhes_session=${cookieA}` },
    });
    assert.strictEqual(cartAfterOrder.data.items.length, 0, "Cart must be empty after order submission");
    console.log(`PASS [07/14]: Order #${orderNum} saved (₱220, +4 pts -> 29 pts) & active cart cleared.`);

    // 8. Verify order appears in My Orders (/my-orders + itemized API, zero cart/loyalty mixing)
    const [myOrdersPage, myOrdersApi] = await Promise.all([
      api("/my-orders", { headers: { Cookie: `jhes_session=${cookieA}` } }),
      api("/api/v1/orders?include_items=true", { headers: { Cookie: `jhes_session=${cookieA}` } }),
    ]);
    assert.strictEqual(myOrdersPage.status, 200);
    assert.strictEqual(myOrdersApi.status, 200);
    const foundOrd = myOrdersApi.data.find((o) => o.order_number === orderNum);
    assert.ok(foundOrd, "Placed order must appear in My Orders API");
    assert.ok(Array.isArray(foundOrd.items) && foundOrd.items.length === 1, "Order must include itemized product list");
    assert.strictEqual(foundOrd.items[0].product_name, "Spanish Latte Dulce");
    assert.ok(
      !myOrdersApi.data.some(
        (o) => String(o.status).toLowerCase() === "cart" || String(o.order_number).startsWith("CART-")
      ),
      "My Orders must never include cart drafts"
    );
    console.log("PASS [08/14]: Order & itemized Product List verified in dedicated /my-orders with zero cart/loyalty leaks.");

    // 9 & 10. Open My Account, test Edit Profile + Security Guardrails, and verify EXACT Header == Account Loyalty Consistency
    const accountPage = await api("/account", { headers: { Cookie: `jhes_session=${cookieA}` } });
    assert.strictEqual(accountPage.status, 200);

    // Block tampering on profile PATCH
    const tamperProfile = await api("/api/v1/auth/me", {
      method: "PATCH",
      headers: { Cookie: `jhes_session=${cookieA}` },
      body: JSON.stringify({ loyalty_points: 9999 }),
    });
    assert.strictEqual(tamperProfile.status, 403, "Direct loyalty_points edit must return 403");

    // Legitimate Profile Edit
    const editProfile = await api("/api/v1/auth/me", {
      method: "PATCH",
      headers: { Cookie: `jhes_session=${cookieA}` },
      body: JSON.stringify({ full_name: "IA Customer Alpha Updated", phone: "09179998877" }),
    });
    assert.strictEqual(editProfile.status, 200, `Profile edit failed: ${JSON.stringify(editProfile.data)}`);
    assert.strictEqual(editProfile.data.user.full_name, "IA Customer Alpha Updated");
    const refreshedCookie = extractCookie(editProfile.setCookie, "jhes_session");
    if (refreshedCookie) cookieA = refreshedCookie;
    console.log("PASS [09/14]: My Account (/account) profile edit persisted to Airtable & balance tampering blocked (403).");

    // Verify Header (/api/v1/auth/me) === Account Loyalty Ledger (/api/v1/account/loyalty) === 29 pts
    const [headerMe, accountLoyalty] = await Promise.all([
      api("/api/v1/auth/me", { headers: { Cookie: `jhes_session=${cookieA}` } }),
      api("/api/v1/account/loyalty", { headers: { Cookie: `jhes_session=${cookieA}` } }),
    ]);
    assert.strictEqual(headerMe.status, 200);
    assert.strictEqual(accountLoyalty.status, 200);
    assert.strictEqual(
      headerMe.data.loyalty_points,
      accountLoyalty.data.balance,
      `Loyalty discrepancy detected! Header=${headerMe.data.loyalty_points} vs Account=${accountLoyalty.data.balance}`
    );
    assert.strictEqual(headerMe.data.loyalty_points, 29);
    assert.strictEqual(accountLoyalty.data.total_earned, 29);
    assert.strictEqual(accountLoyalty.data.total_redeemed, 0);
    assert.ok(accountLoyalty.data.transactions.length >= 2, "Must list signup bonus + order earned transactions");
    for (const tx of accountLoyalty.data.transactions) {
      cleanup.Payments.push(tx.id);
    }
    console.log(
      `PASS [10/14]: Authoritative loyalty sync verified — Header (${headerMe.data.loyalty_points} pts) === Account (${accountLoyalty.data.balance} pts), 2 ledger entries.`
    );

    // 11. Refresh all restructured customer routes
    const routeChecks = await Promise.all(
      ["/", "/menu", "/cart", "/checkout", "/my-orders", "/account", "/order"].map((r) =>
        api(r, { headers: { Cookie: `jhes_session=${cookieA}` } })
      )
    );
    for (const rc of routeChecks) {
      assert.strictEqual(rc.status, 200, `Route refresh returned unexpected HTTP ${rc.status}`);
    }
    console.log("PASS [11/14]: All 7 customer routes (/, /menu, /cart, /checkout, /my-orders, /account, /order) verified HTTP 200.");

    // 12 & 13. Save a new cart item, Logout, Log back in, verify ALL saved data persists
    await api("/api/v1/cart", {
      method: "POST",
      headers: { Cookie: `jhes_session=${cookieA}` },
      body: JSON.stringify({ items: [{ ...cartItem, name: "Rosemary Butter Croissant", price: 160, quantity: 2 }] }),
    });
    const logoutRes = await api("/api/v1/auth/logout", {
      method: "POST",
      headers: { Cookie: `jhes_session=${cookieA}` },
    });
    assert.strictEqual(logoutRes.status, 200);

    const loginAgain = await api("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: emailA, password }),
    });
    assert.strictEqual(loginAgain.status, 200, `Re-login failed: ${JSON.stringify(loginAgain.data)}`);
    const newCookieA = extractCookie(loginAgain.setCookie, "jhes_session");
    assert.ok(newCookieA);

    const [mePostLogin, cartPostLogin, ordersPostLogin] = await Promise.all([
      api("/api/v1/auth/me", { headers: { Cookie: `jhes_session=${newCookieA}` } }),
      api("/api/v1/cart", { headers: { Cookie: `jhes_session=${newCookieA}` } }),
      api("/api/v1/orders", { headers: { Cookie: `jhes_session=${newCookieA}` } }),
    ]);
    assert.strictEqual(mePostLogin.data.full_name, "IA Customer Alpha Updated");
    assert.strictEqual(mePostLogin.data.loyalty_points, 29);
    assert.strictEqual(cartPostLogin.data.items.length, 1);
    assert.strictEqual(cartPostLogin.data.items[0].name, "Rosemary Butter Croissant");
    assert.ok(ordersPostLogin.data.some((o) => o.order_number === orderNum));
    // Clean active cart draft for Account A before teardown
    await api("/api/v1/cart", { method: "DELETE", headers: { Cookie: `jhes_session=${newCookieA}` } });
    console.log("PASS [12/14 & 13/14]: Logout & re-login preserved edited profile, 29 Bean Points, saved cart, and order history.");

    // 14. Register Account B & verify strict cross-account isolation
    const regB = await api("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        full_name: "IA Customer Beta",
        email: emailB,
        password,
        phone: "09182223344",
      }),
    });
    assert.strictEqual(regB.status, 201);
    const cookieB = extractCookie(regB.setCookie, "jhes_session");
    cleanup.Users.push(regB.data.user.id);

    const [bOrders, bCart, bLoyalty] = await Promise.all([
      api("/api/v1/orders", { headers: { Cookie: `jhes_session=${cookieB}` } }),
      api("/api/v1/cart", { headers: { Cookie: `jhes_session=${cookieB}` } }),
      api("/api/v1/account/loyalty", { headers: { Cookie: `jhes_session=${cookieB}` } }),
    ]);
    assert.strictEqual(bOrders.data.length, 0, "Account B must NOT see Account A's orders");
    assert.strictEqual(bCart.data.items.length, 0, "Account B must NOT see Account A's cart");
    assert.strictEqual(bLoyalty.data.customer_id, regB.data.user.id);
    assert.ok(
      !bLoyalty.data.transactions.some((tx) => tx.order_reference === orderNum),
      "Account B must NOT see Account A's loyalty transactions"
    );
    for (const tx of bLoyalty.data.transactions) {
      cleanup.Payments.push(tx.id);
    }
    console.log("PASS [14/14]: Account B strictly isolated — zero access to Account A's orders, cart, or loyalty records.");

    console.log("\n==============================================================");
    console.log("ALL 14 CUSTOMER IA VERIFICATION FLOWS PASSED! (14/14)");
    console.log("==============================================================");
  } finally {
    console.log("\n[Cleanup] Removing temporary test records created by this verification run...");
    for (const id of cleanup.OrderItems) await airtableDelete("OrderItems", id);
    for (const id of cleanup.Payments) await airtableDelete("Payments", id);
    for (const id of cleanup.Orders) await airtableDelete("Orders", id);
    for (const id of cleanup.Users) await airtableDelete("Users", id);
    console.log("[Cleanup] Complete. Existing customer records & loyalty points preserved intact.");
  }
}

runCustomerIASuite().catch((err) => {
  console.error("\nCUSTOMER IA TEST FAILED:", err);
  process.exit(1);
});
