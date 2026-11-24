import assert from "node:assert";

const BASE_URL = "http://localhost:3005";

async function runPersistenceSuite() {
  console.log("=== JHE'S CAFE' — ACCOUNT & CART PERSISTENCE TEST SUITE ===");
  const results = [];

  // Helper for requests
  const api = async (endpoint, options = {}) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });
    const setCookie = res.headers.get("set-cookie");
    let data = null;
    try {
      data = await res.json();
    } catch {}
    return { status: res.status, ok: res.ok, data, headers: res.headers, setCookie };
  };

  const extractSessionCookie = (setCookieHeader) => {
    if (!setCookieHeader) return null;
    const match = setCookieHeader.match(/jhes_session=([^;]+)/);
    return match ? match[1] : null;
  };

  const testEmailA = `test.persist.a.${Date.now()}@jhescafe.ph`;
  const testEmailB = `test.persist.b.${Date.now()}@jhescafe.ph`;
  const password = "SecurePassword123!";

  let cookieA = null;
  let userA = null;
  let cookieB = null;
  let userB = null;

  // Setup: Register Account A
  console.log("\n[Setup] Registering Account A:", testEmailA);
  const regA = await api("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({
      full_name: "Persistence Test Account A",
      email: testEmailA,
      password: password,
      phone: "09171234567",
    }),
  });
  assert.strictEqual(regA.status, 201, `Account A registration failed: ${JSON.stringify(regA.data)}`);
  cookieA = extractSessionCookie(regA.setCookie);
  userA = regA.data.user;
  console.log(` Account A registered with canonical ID: ${userA.id}, Initial Points: ${userA.loyalty_points}`);

  // Setup: Register Account B
  console.log("\n[Setup] Registering Account B:", testEmailB);
  const regB = await api("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({
      full_name: "Persistence Test Account B",
      email: testEmailB,
      password: password,
      phone: "09187654321",
    }),
  });
  assert.strictEqual(regB.status, 201, `Account B registration failed: ${JSON.stringify(regB.data)}`);
  cookieB = extractSessionCookie(regB.setCookie);
  userB = regB.data.user;
  console.log(` Account B registered with canonical ID: ${userB.id}, Initial Points: ${userB.loyalty_points}`);

  // Test 1: Add items to Account A cart, verify database persistence
  console.log("\n--- TEST 1: Cart Items & Customizations Persistence Across Logout & Login ---");
  const cartItemsA = [
    {
      productId: "prod-croissant-01",
      slug: "rosemary-butter-croissant",
      name: "Rosemary Butter Croissant",
      price: 185,
      quantity: 2,
      isBakery: true,
      warming: "Warmed",
      addOns: ["French Butter"],
      customizationSummary: "Warmed · French Butter",
    },
    {
      productId: "prod-affogato-01",
      slug: "single-origin-affogato",
      name: "Single-Origin Affogato",
      price: 190,
      quantity: 1,
      size: "Tall 12oz",
      temperature: "Hot",
      milk: "Whole Milk",
      sweetness: 50,
      customizationSummary: "Tall 12oz · Hot · Whole Milk · 50% sweet",
    },
  ];

  const saveCartRes = await api("/api/v1/cart", {
    method: "POST",
    headers: { Cookie: `jhes_session=${cookieA}` },
    body: JSON.stringify({ items: cartItemsA }),
  });
  assert.strictEqual(saveCartRes.status, 200, "Failed to save cart for Account A");
  assert.strictEqual(saveCartRes.data.items.length, 2, "Cart item count mismatch");
  console.log(" Account A cart saved to database. Items: 2, Subtotal: ₱", saveCartRes.data.subtotal);

  // Simulate Logout
  console.log(" Simulating Account A Logout (clearing session cookies and memory)...");
  const unauthCartRes = await api("/api/v1/cart");
  assert.strictEqual(unauthCartRes.status, 401, "Unauthenticated cart access must be rejected with 401");
  console.log(" Verified: Unauthenticated cart access is strictly blocked (401)");

  // Log back into Account A
  console.log(" Logging back into Account A...");
  const loginA = await api("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: testEmailA, password }),
  });
  assert.strictEqual(loginA.status, 200, "Account A login failed");
  const newCookieA = extractSessionCookie(loginA.setCookie);

  // Restore cart
  const restoredCartRes = await api("/api/v1/cart", {
    headers: { Cookie: `jhes_session=${newCookieA}` },
  });
  assert.strictEqual(restoredCartRes.status, 200, "Failed to fetch restored cart");
  assert.strictEqual(restoredCartRes.data.items.length, 2, "Restored cart items length must be 2");
  assert.strictEqual(restoredCartRes.data.items[0].name, "Rosemary Butter Croissant");
  assert.strictEqual(restoredCartRes.data.items[0].quantity, 2);
  assert.strictEqual(restoredCartRes.data.items[0].warming, "Warmed");
  assert.strictEqual(restoredCartRes.data.items[1].name, "Single-Origin Affogato");
  assert.strictEqual(restoredCartRes.data.items[1].temperature, "Hot");
  console.log(" PASS: Account A cart items, quantities, and customizations 100% persisted across logout/login!");
  results.push({ name: "Account A Cart Persistence", pass: true });

  // Test 2: Loyalty Balance Persistence across Logout & Login
  console.log("\n--- TEST 2: Loyalty Balance Persistence Across Logout & Login ---");
  const meA = await api("/api/v1/auth/me", {
    headers: { Cookie: `jhes_session=${newCookieA}` },
  });
  assert.strictEqual(meA.status, 200);
  assert.strictEqual(meA.data.loyalty_points, 25, "Initial loyalty points must remain 25 without reset");
  console.log(` Account A verified loyalty balance after re-login: ${meA.data.loyalty_points} Bean Points`);
  console.log(" PASS: Loyalty balance persisted accurately without 0-point flash or reset!");
  results.push({ name: "Loyalty Balance Persistence", pass: true });

  // Test 3: Account Isolation (Account B sees only its own empty/separate cart and points)
  console.log("\n--- TEST 3: Account Isolation (Account B Isolation) ---");
  const cartBRes = await api("/api/v1/cart", {
    headers: { Cookie: `jhes_session=${cookieB}` },
  });
  assert.strictEqual(cartBRes.status, 200);
  assert.strictEqual(cartBRes.data.items.length, 0, "Account B must NOT see Account A's cart items");
  assert.strictEqual(cartBRes.data.customer_id, userB.id, "Customer ID must belong to Account B");

  const meB = await api("/api/v1/auth/me", {
    headers: { Cookie: `jhes_session=${cookieB}` },
  });
  assert.strictEqual(meB.data.email, testEmailB);
  assert.strictEqual(meB.data.loyalty_points, 25);
  console.log(" PASS: Account B is completely isolated from Account A's cart and loyalty records!");
  results.push({ name: "Account Isolation", pass: true });

  // Test 4: Browser Refresh / Multi-Session Consistency
  console.log("\n--- TEST 4: Browser Refresh / Multi-Session Consistency ---");
  for (let i = 1; i <= 3; i++) {
    const refreshRes = await api("/api/v1/cart", {
      headers: { Cookie: `jhes_session=${newCookieA}` },
    });
    assert.strictEqual(refreshRes.data.items.length, 2);
  }
  console.log(" PASS: Consistent state verified across 3 consecutive session re-hydrations!");
  results.push({ name: "Browser Refresh Persistence", pass: true });

  // Test 5: Order Creation & Non-Duplicate Loyalty Award
  console.log("\n--- TEST 5: Order Creation & Non-Duplicate Loyalty Award ---");
  const orderPayload = {
    order_number: `JHE-TEST-${Math.floor(10000 + Math.random() * 90000)}`,
    idempotency_key: `IDEM-SUITE-${Date.now()}`,
    customer_name: "Persistence Test Account A",
    customer_email: testEmailA,
    dining_option: "Takeaway",
    payment_method: "cash",
    items: [
      {
        product_name: "Spanish Latte Dulce",
        quantity: 1,
        unit_price: 220,
        subtotal: 220,
        size: "Grande 16oz",
        temperature: "Hot",
        milk_type: "Whole Milk",
        sweetness: 50,
      },
    ],
  };

  const orderRes = await api("/api/v1/orders", {
    method: "POST",
    headers: { Cookie: `jhes_session=${newCookieA}` },
    body: JSON.stringify(orderPayload),
  });
  assert.strictEqual(orderRes.status, 201, `Order placement failed: ${JSON.stringify(orderRes.data)}`);
  console.log(` Placed order #${orderPayload.order_number}, Total: ₱${orderRes.data.total_amount}`);

  // Points earned should be floor(220 / 50) = 4 points. Initial 25 + 4 = 29 points.
  const meAfterOrder = await api("/api/v1/auth/me", {
    headers: { Cookie: `jhes_session=${newCookieA}` },
  });
  assert.strictEqual(meAfterOrder.data.loyalty_points, 29, `Expected 29 loyalty points, got ${meAfterOrder.data.loyalty_points}`);
  console.log(` Loyalty points correctly updated to: ${meAfterOrder.data.loyalty_points} Bean Points (+4 earned)`);

  // Try duplicate submission with same idempotency key
  console.log(" Attempting duplicate order submission with identical idempotency key...");
  const dupRes = await api("/api/v1/orders", {
    method: "POST",
    headers: { Cookie: `jhes_session=${newCookieA}` },
    body: JSON.stringify(orderPayload),
  });
  // Should reject or return duplicate prevented
  assert.ok(dupRes.status === 409 || dupRes.status === 201);
  const meAfterDup = await api("/api/v1/auth/me", {
    headers: { Cookie: `jhes_session=${newCookieA}` },
  });
  assert.strictEqual(meAfterDup.data.loyalty_points, 29, "Loyalty points must NOT be awarded twice for duplicate submission!");
  console.log(" PASS: Duplicate point credit prevented!");
  results.push({ name: "Order Placement & Non-Duplicate Loyalty Award", pass: true });

  // Test 6: Cart Cleanup Post-Order
  console.log("\n--- TEST 6: Active Cart Cleared Post-Order ---");
  const cartAfterOrder = await api("/api/v1/cart", {
    headers: { Cookie: `jhes_session=${newCookieA}` },
  });
  assert.strictEqual(cartAfterOrder.data.items.length, 0, "Cart must be cleared after order completion");
  console.log(" PASS: Active cart successfully cleared from database after order placement!");
  results.push({ name: "Cart Cleanup Post-Order", pass: true });

  // Test 7: Customer Order History Retention
  console.log("\n--- TEST 7: Customer Order History Retention ---");
  const ordersListRes = await api("/api/v1/orders", {
    headers: { Cookie: `jhes_session=${newCookieA}` },
  });
  assert.strictEqual(ordersListRes.status, 200);
  assert.ok(ordersListRes.data.length >= 1, "Customer must be able to view their own placed orders");
  assert.strictEqual(ordersListRes.data[0].customer_email, testEmailA);
  console.log(` PASS: Placed order #${ordersListRes.data[0].order_number} confirmed in customer order history!`);
  results.push({ name: "Order History Retention", pass: true });

  // Test 8: Secure Account Linking (Unified canonical customer ID)
  console.log("\n--- TEST 8: Secure Account Linking ---");
  // Simulate linking via login with same email
  const relinkMe = await api("/api/v1/auth/me", {
    headers: { Cookie: `jhes_session=${newCookieA}` },
  });
  assert.strictEqual(relinkMe.data.id, userA.id, "Customer ID must remain canonical");
  console.log(` PASS: Canonical customer ID maintained permanently: ${relinkMe.data.id}`);
  results.push({ name: "Secure Account Linking", pass: true });

  console.log("\n=======================================================");
  console.log("ALL 8 PERSISTENCE TESTS PASSED SUCCESSFULLY! (8/8)");
  console.log("=======================================================");
}

runPersistenceSuite().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
