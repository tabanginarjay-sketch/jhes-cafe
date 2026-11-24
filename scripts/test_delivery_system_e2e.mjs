import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = (process.env.BASE_URL || "https://jhescafe.vercel.app").replace(/\/$/, "");

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

async function airtableListRaw(tableName, formula) {
  const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`);
  if (formula) url.searchParams.set("filterByFormula", formula);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.records) ? data.records : [];
}

async function airtableGetRaw(tableName, id) {
  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}/${id}`,
    { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } }
  );
  if (!res.ok) return null;
  return await res.json();
}

async function airtableDelete(tableName, id) {
  if (!id || !String(id).startsWith("rec")) return;
  await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}/${id}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
    }
  ).catch(() => {});
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
  const text = await res.text();
  let data = null;
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

const DELIVERY_SYSTEM_PROVIDERS = new Set([
  "delivery_zone",
  "delivery_dispatch",
  "customer_address",
  "customer_notification",
  "driver_profile",
]);

async function runDeliveryE2E() {
  console.log("=== JHE'S CAFE' — 17-SCENARIO COMPLETE DELIVERY SYSTEM E2E SUITE ===");
  console.log(`Target: ${BASE_URL}\n`);

  const stamp = Date.now();
  const cleanup = {
    Orders: new Set(),
    OrderItems: new Set(),
    Payments: new Set(),
    Staff: new Set(),
    Users: new Set(),
  };

  const emailA = `dlv.cust.a.${stamp}@jhescafe.ph`;
  const emailB = `dlv.cust.b.${stamp}@jhescafe.ph`;
  const password = "DeliveryTest123!";
  const testCity = `TestCity-${stamp}`;
  const testBarangay = `TestBrgy-${stamp}`;
  const testDriver1Email = `driver1.${stamp}@jhescafe.ph`;
  const testDriver2Email = `driver2.${stamp}@jhescafe.ph`;
  const testDriver1Code = `DRV-E2E-1-${String(stamp).slice(-4)}`;
  const testDriver2Code = `DRV-E2E-2-${String(stamp).slice(-4)}`;

  try {
    // Baseline check on existing real customer record (must never be modified)
    const baselineRealCustomer = await airtableGetRaw("Users", "recd00pXJ56DNI3Lx");
    const baselinePoints = baselineRealCustomer?.fields?.loyalty_points;

    // Fetch live menu products
    const prodRes = await api("/api/v1/catalog/products");
    assert.strictEqual(prodRes.status, 200, "Catalog products must load");
    assert.ok(Array.isArray(prodRes.data) && prodRes.data.length > 0, "At least one product must exist");
    const sampleProduct =
      prodRes.data.find((p) => Number(p.price) >= 120 && p.is_available !== false) || prodRes.data[0];
    const unitPrice = Number(sampleProduct.price);
    assert.ok(unitPrice > 0, "Sample product must have positive price");

    // Admin login
    const adminLogin = await api("/api/v1/auth/admin", {
      method: "POST",
      body: JSON.stringify({ email: "jhe@jhescafe.com", passcode: "BARISTA-01" }),
    });
    assert.strictEqual(adminLogin.status, 200, `Admin login failed: ${JSON.stringify(adminLogin.data)}`);
    const adminCookie = `jhes_admin_session=${extractCookie(adminLogin.setCookie, "jhes_admin_session")}`;

    // Register Customer A & Customer B
    const [regA, regB] = await Promise.all([
      api("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: "Delivery Customer Alpha",
          email: emailA,
          password,
          phone: "09171234567",
        }),
      }),
      api("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: "Delivery Customer Beta",
          email: emailB,
          password,
          phone: "09179876543",
        }),
      }),
    ]);
    assert.strictEqual(regA.status, 201, `Customer A registration failed: ${JSON.stringify(regA.data)}`);
    assert.strictEqual(regB.status, 201, `Customer B registration failed: ${JSON.stringify(regB.data)}`);
    cleanup.Users.add(regA.data.user.id);
    cleanup.Users.add(regB.data.user.id);
    const custCookieA = `jhes_session=${extractCookie(regA.setCookie, "jhes_session")}`;
    const custCookieB = `jhes_session=${extractCookie(regB.setCookie, "jhes_session")}`;

    // -------------------------------------------------------------------------
    // TEST 1: Customer selects Dine-in and places order
    // -------------------------------------------------------------------------
    const dineInOrderRes = await api("/api/v1/orders", {
      method: "POST",
      headers: { Cookie: custCookieA },
      body: JSON.stringify({
        customer_name: "Delivery Customer Alpha",
        customer_phone: "09171234567",
        dining_option: "Dine-in",
        table_number: "Table 04 (Window)",
        payment_method: "cash",
        special_notes: "Less ice please",
        items: [
          {
            product_id: sampleProduct.id,
            product_name: sampleProduct.name,
            quantity: 1,
            unit_price: unitPrice,
            customization: "16oz · Iced · Whole Milk",
          },
        ],
      }),
    });
    assert.strictEqual(dineInOrderRes.status, 201, `Dine-in order failed: ${JSON.stringify(dineInOrderRes.data)}`);
    assert.strictEqual(dineInOrderRes.data.dining_option, "Dine-in");
    assert.strictEqual(dineInOrderRes.data.payment_status, "pending");
    assert.strictEqual(Number(dineInOrderRes.data.delivery_fee || 0), 0);
    cleanup.Orders.add(dineInOrderRes.data.id);
    console.log(`PASS [01/17]: Dine-in order placed (${dineInOrderRes.data.order_number}).`);

    // -------------------------------------------------------------------------
    // TEST 2: Customer selects Takeaway with pickup time preference and places order
    // -------------------------------------------------------------------------
    const takeawayOrderRes = await api("/api/v1/orders", {
      method: "POST",
      headers: { Cookie: custCookieA },
      body: JSON.stringify({
        customer_name: "Delivery Customer Alpha",
        customer_phone: "09171234567",
        dining_option: "Takeaway",
        pickup_time_preference: "In 20 minutes",
        payment_method: "gcash",
        items: [
          {
            product_id: sampleProduct.id,
            product_name: sampleProduct.name,
            quantity: 1,
            unit_price: unitPrice,
          },
        ],
      }),
    });
    assert.strictEqual(takeawayOrderRes.status, 201, `Takeaway order failed: ${JSON.stringify(takeawayOrderRes.data)}`);
    assert.strictEqual(takeawayOrderRes.data.dining_option, "Takeaway");
    assert.strictEqual(takeawayOrderRes.data.payment_status, "pending", "Online GCash order must NOT auto-mark paid");
    assert.ok(
      String(takeawayOrderRes.data.special_notes || "").includes("In 20 minutes"),
      "Takeaway pickup time preference must persist"
    );
    cleanup.Orders.add(takeawayOrderRes.data.id);
    console.log(`PASS [02/17]: Takeaway order with pickup time preference placed (${takeawayOrderRes.data.order_number}).`);

    // -------------------------------------------------------------------------
    // TEST 3: Admin configures active Delivery Zone & rejects unsupported delivery address
    // -------------------------------------------------------------------------
    const createZoneRes = await api("/api/v1/delivery/zones", {
      method: "POST",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        city: testCity,
        barangay: testBarangay,
        area_label: `${testBarangay} Commercial Strip`,
        delivery_fee: 65,
        min_order_amount: unitPrice * 2,
        estimated_minutes: "30–40 mins",
        is_active: true,
      }),
    });
    assert.strictEqual(createZoneRes.status, 201, `Zone creation failed: ${JSON.stringify(createZoneRes.data)}`);
    const testZone = createZoneRes.data;
    cleanup.Payments.add(testZone.id);

    const publicZonesRes = await api("/api/v1/delivery/zones");
    assert.strictEqual(publicZonesRes.status, 200);
    assert.ok(
      publicZonesRes.data.zones.some((z) => z.id === testZone.id && z.delivery_fee === 65),
      "Active zone must be returned by GET /api/v1/delivery/zones"
    );

    const unsupportedAddrRes = await api("/api/v1/orders", {
      method: "POST",
      headers: { Cookie: custCookieA },
      body: JSON.stringify({
        customer_name: "Delivery Customer Alpha",
        dining_option: "Delivery",
        payment_method: "cod",
        delivery_address: {
          recipient_name: "Delivery Customer Alpha",
          contact_number: "09171234567",
          house_number: "99B",
          street: "Unserviceable Blvd",
          barangay: "Unconfigured Barangay",
          city: "Faraway City",
        },
        items: [{ product_id: sampleProduct.id, product_name: sampleProduct.name, quantity: 2, unit_price: unitPrice }],
      }),
    });
    assert.strictEqual(unsupportedAddrRes.status, 400, "Unsupported delivery zone MUST be rejected with 400");

    // Also verify minimum order amount validation
    const belowMinRes = await api("/api/v1/orders", {
      method: "POST",
      headers: { Cookie: custCookieA },
      body: JSON.stringify({
        customer_name: "Delivery Customer Alpha",
        dining_option: "Delivery",
        payment_method: "cod",
        delivery_address: {
          recipient_name: "Delivery Customer Alpha",
          contact_number: "09171234567",
          house_number: "12A",
          street: "Aguinaldo Hwy",
          barangay: testBarangay,
          city: testCity,
        },
        items: [{ product_id: sampleProduct.id, product_name: sampleProduct.name, quantity: 1, unit_price: unitPrice }],
      }),
    });
    assert.strictEqual(belowMinRes.status, 400, "Delivery order below zone minimum MUST be rejected with 400");
    console.log("PASS [03/17]: Admin configured delivery zone; unsupported address & below-minimum orders strictly rejected (400).");

    // -------------------------------------------------------------------------
    // TEST 4 & 5: Valid Delivery Address + Backend Fee/Total Calculation + COD Order + Saved Address
    // -------------------------------------------------------------------------
    const expectedSubtotal = Math.round(unitPrice * 2 * 100) / 100;
    const expectedFee = 65;
    const expectedTotal = Math.round((expectedSubtotal + expectedFee) * 100) / 100;

    const codOrderRes = await api("/api/v1/orders", {
      method: "POST",
      headers: { Cookie: custCookieA },
      body: JSON.stringify({
        customer_name: "Delivery Customer Alpha",
        customer_phone: "09171234567",
        dining_option: "Delivery",
        payment_method: "cod",
        // Deliberately tamper frontend totals/fees to verify backend ignores them
        total_amount: 1,
        delivery_fee: 0,
        delivery_address: {
          recipient_name: "Delivery Customer Alpha",
          contact_number: "09171234567",
          house_number: "Unit 88",
          street: "Pinewood Drive",
          barangay: testBarangay,
          city: testCity,
          landmark: "Across Coffee Roastery Gate",
          delivery_instructions: "Call on arrival; gate code 4421",
          schedule_type: "scheduled",
          scheduled_window: "Today 3:00 PM – 4:00 PM",
          save_address: true,
          address_label: "Studio Office",
        },
        items: [
          {
            product_id: sampleProduct.id,
            product_name: sampleProduct.name,
            quantity: 2,
            unit_price: 1, // tampered unit price — backend must recompute from Airtable catalog!
            customization: "16oz · Hot",
          },
        ],
      }),
    });
    assert.strictEqual(codOrderRes.status, 201, `COD delivery order failed: ${JSON.stringify(codOrderRes.data)}`);
    const codOrder = codOrderRes.data;
    cleanup.Orders.add(codOrder.id);
    assert.strictEqual(codOrder.dining_option, "Delivery");
    assert.strictEqual(codOrder.payment_method, "cod");
    assert.strictEqual(codOrder.payment_status, "cod_pending", "COD order must start in cod_pending");
    assert.strictEqual(Number(codOrder.delivery_fee), expectedFee, "Backend must apply configured zone fee");
    assert.strictEqual(Number(codOrder.total_amount), expectedTotal, "Backend must compute Subtotal + Fee - Discount");
    assert.ok(codOrder.delivery?.id, "Delivery order must create linked DeliveryRecord");
    assert.strictEqual(codOrder.delivery.delivery_status, "PENDING_ASSIGNMENT");
    assert.strictEqual(String(codOrder.delivery.confirmation_code || "").length, 6, "6-char handoff code required");
    const codDeliveryId = codOrder.delivery.id;
    const handoffCode = codOrder.delivery.confirmation_code;
    cleanup.Payments.add(codDeliveryId);

    // Verify address was saved to customer's saved addresses
    const savedAddrsRes = await api("/api/v1/addresses", { headers: { Cookie: custCookieA } });
    assert.strictEqual(savedAddrsRes.status, 200);
    assert.ok(
      savedAddrsRes.data.addresses.some((a) => a.city === testCity && a.barangay === testBarangay && a.label === "Studio Office"),
      "Saved delivery address must persist for customer"
    );
    for (const a of savedAddrsRes.data.addresses) cleanup.Payments.add(a.id);

    console.log(
      `PASS [04/17]: Valid delivery address validated; backend enforced ₱${expectedSubtotal} + ₱${expectedFee} = ₱${expectedTotal} (ignored tampered frontend total) & saved address.`
    );
    console.log(
      `PASS [05/17]: COD delivery order created (${codOrder.order_number}, payment_status=cod_pending, delivery_status=PENDING_ASSIGNMENT, code=${handoffCode}).`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Admin views delivery order in Delivery Management & registers Driver 1 + Driver 2
    // -------------------------------------------------------------------------
    const adminDeliveriesRes = await api("/api/v1/deliveries", { headers: { Cookie: adminCookie } });
    assert.strictEqual(adminDeliveriesRes.status, 200);
    assert.ok(
      adminDeliveriesRes.data.deliveries.some((d) => d.id === codDeliveryId),
      "Admin Delivery Management must list the new delivery order"
    );

    const [drv1Res, drv2Res] = await Promise.all([
      api("/api/v1/drivers", {
        method: "POST",
        headers: { Cookie: adminCookie },
        body: JSON.stringify({
          full_name: "Rider Marco Santos",
          email: testDriver1Email,
          phone: "09181112222",
          staff_id: testDriver1Code,
          vehicle_type: "Motorcycle",
          plate_number: "ABC-1234",
        }),
      }),
      api("/api/v1/drivers", {
        method: "POST",
        headers: { Cookie: adminCookie },
        body: JSON.stringify({
          full_name: "Rider Carlo Reyes",
          email: testDriver2Email,
          phone: "09183334444",
          staff_id: testDriver2Code,
          vehicle_type: "E-Bike",
          plate_number: "XYZ-9876",
        }),
      }),
    ]);
    assert.strictEqual(drv1Res.status, 201, `Driver 1 creation failed: ${JSON.stringify(drv1Res.data)}`);
    assert.strictEqual(drv2Res.status, 201, `Driver 2 creation failed: ${JSON.stringify(drv2Res.data)}`);
    const driver1 = drv1Res.data;
    const driver2 = drv2Res.data;
    cleanup.Staff.add(driver1.id);
    cleanup.Staff.add(driver2.id);
    console.log(`PASS [06/17]: Admin viewed delivery dispatch list & registered Driver 1 (${driver1.staff_id}) and Driver 2 (${driver2.staff_id}).`);

    // -------------------------------------------------------------------------
    // TEST 7: Admin assigns Driver 1 & updates ETA
    // -------------------------------------------------------------------------
    const assignRes = await api(`/api/v1/deliveries/${codDeliveryId}`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        action: "assign_driver",
        driver_id: driver1.id,
        estimated_delivery_time: "25–35 mins",
      }),
    });
    assert.strictEqual(assignRes.status, 200, `Driver assignment failed: ${JSON.stringify(assignRes.data)}`);
    assert.strictEqual(assignRes.data.delivery_status, "DRIVER_ASSIGNED");
    assert.strictEqual(assignRes.data.driver_id, driver1.id);
    assert.strictEqual(assignRes.data.driver_name, "Rider Marco Santos");
    assert.strictEqual(assignRes.data.estimated_delivery_time, "25–35 mins");

    const etaRes = await api(`/api/v1/deliveries/${codDeliveryId}`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        action: "update_eta",
        estimated_delivery_time: "20–30 mins",
      }),
    });
    assert.strictEqual(etaRes.status, 200);
    assert.strictEqual(etaRes.data.estimated_delivery_time, "20–30 mins");
    console.log("PASS [07/17]: Admin assigned Driver 1 (status -> DRIVER_ASSIGNED) & updated ETA (20–30 mins).");

    // -------------------------------------------------------------------------
    // TEST 8: Driver 1 logs in and sees ONLY assigned delivery (confirmation_code masked)
    // -------------------------------------------------------------------------
    const drv1Login = await api("/api/v1/auth/driver", {
      method: "POST",
      body: JSON.stringify({ email: testDriver1Email, credential: testDriver1Code }),
    });
    assert.strictEqual(drv1Login.status, 200, `Driver 1 login failed: ${JSON.stringify(drv1Login.data)}`);
    const drv1Cookie = `jhes_driver_session=${extractCookie(drv1Login.setCookie, "jhes_driver_session")}`;

    const drv1List = await api("/api/v1/driver/deliveries", { headers: { Cookie: drv1Cookie } });
    assert.strictEqual(drv1List.status, 200);
    assert.strictEqual(drv1List.data.deliveries.length, 1, "Driver 1 must see ONLY their 1 assigned delivery");
    assert.strictEqual(drv1List.data.deliveries[0].id, codDeliveryId);
    assert.strictEqual(
      drv1List.data.deliveries[0].confirmation_code,
      undefined,
      "Driver API must mask the customer's 6-char handoff confirmation_code"
    );
    console.log("PASS [08/17]: Driver 1 authenticated & sees ONLY their assigned delivery with confirmation code masked.");

    // -------------------------------------------------------------------------
    // TEST 9: Driver 2 isolation (cannot view or modify Driver 1's delivery) & Driver cannot settle payment
    // -------------------------------------------------------------------------
    const drv2Login = await api("/api/v1/auth/driver", {
      method: "POST",
      body: JSON.stringify({ email: testDriver2Email, credential: testDriver2Code }),
    });
    assert.strictEqual(drv2Login.status, 200, `Driver 2 login failed: ${JSON.stringify(drv2Login.data)}`);
    const drv2Cookie = `jhes_driver_session=${extractCookie(drv2Login.setCookie, "jhes_driver_session")}`;

    const drv2List = await api("/api/v1/driver/deliveries", { headers: { Cookie: drv2Cookie } });
    assert.strictEqual(drv2List.status, 200);
    assert.strictEqual(drv2List.data.deliveries.length, 0, "Driver 2 must see 0 unassigned deliveries");

    const drv2Peek = await api(`/api/v1/deliveries/${codDeliveryId}`, { headers: { Cookie: drv2Cookie } });
    assert.strictEqual(drv2Peek.status, 403, "Driver 2 must get 403 viewing Driver 1's delivery");

    const drv2Tamper = await api(`/api/v1/driver/deliveries/${codDeliveryId}`, {
      method: "PATCH",
      headers: { Cookie: drv2Cookie },
      body: JSON.stringify({ action: "acknowledge" }),
    });
    assert.strictEqual(drv2Tamper.status, 403, "Driver 2 must get 403 modifying Driver 1's delivery");

    // Driver 1 must NOT be allowed to modify payment status or call admin payment confirmation
    const drv1PayBlock1 = await api(`/api/v1/driver/deliveries/${codDeliveryId}`, {
      method: "PATCH",
      headers: { Cookie: drv1Cookie },
      body: JSON.stringify({ action: "confirm_cod", payment_status: "paid" }),
    });
    assert.strictEqual(drv1PayBlock1.status, 403, "Driver must be blocked from settling payments via driver route");

    // Find linked COD payment record
    const payListRes = await api("/api/v1/payments?include_meta=true&page_size=100", {
      headers: { Cookie: adminCookie },
    });
    assert.strictEqual(payListRes.status, 200);
    const linkedCodPayment = payListRes.data.payments.find(
      (p) => p.order_number === codOrder.order_number && p.provider === "cod"
    );
    assert.ok(linkedCodPayment, "Linked COD payment record must exist in Payments ledger");
    assert.strictEqual(linkedCodPayment.status, "cod_pending");
    cleanup.Payments.add(linkedCodPayment.id);

    const drv1PayBlock2 = await api(`/api/v1/payments/${linkedCodPayment.id}`, {
      method: "PATCH",
      headers: { Cookie: drv1Cookie },
      body: JSON.stringify({ action: "confirm_cod" }),
    });
    assert.strictEqual(drv1PayBlock2.status, 401, "Driver session must NOT have admin payment verification access");
    console.log("PASS [09/17]: RBAC & isolation enforced — Driver 2 blocked (403) & Drivers blocked from payment settlement.");

    // -------------------------------------------------------------------------
    // TEST 10: Driver lifecycle transitions (invalid jump rejected, valid transitions succeed)
    // -------------------------------------------------------------------------
    const invalidJump = await api(`/api/v1/driver/deliveries/${codDeliveryId}`, {
      method: "PATCH",
      headers: { Cookie: drv1Cookie },
      body: JSON.stringify({
        action: "update_status",
        delivery_status: "DELIVERED",
        confirmation_code: handoffCode,
      }),
    });
    assert.strictEqual(invalidJump.status, 400, "Invalid jump DRIVER_ASSIGNED -> DELIVERED must be rejected (400)");

    const ackRes = await api(`/api/v1/driver/deliveries/${codDeliveryId}`, {
      method: "PATCH",
      headers: { Cookie: drv1Cookie },
      body: JSON.stringify({ action: "acknowledge" }),
    });
    assert.strictEqual(ackRes.status, 200);
    assert.ok(ackRes.data.driver_acknowledged_at, "Driver acknowledgment timestamp must persist");

    const pickedRes = await api(`/api/v1/driver/deliveries/${codDeliveryId}`, {
      method: "PATCH",
      headers: { Cookie: drv1Cookie },
      body: JSON.stringify({ action: "update_status", delivery_status: "PICKED_UP" }),
    });
    assert.strictEqual(pickedRes.status, 200);
    assert.strictEqual(pickedRes.data.delivery_status, "PICKED_UP");

    const outRes = await api(`/api/v1/driver/deliveries/${codDeliveryId}`, {
      method: "PATCH",
      headers: { Cookie: drv1Cookie },
      body: JSON.stringify({ action: "update_status", delivery_status: "OUT_FOR_DELIVERY" }),
    });
    assert.strictEqual(outRes.status, 200);
    assert.strictEqual(outRes.data.delivery_status, "OUT_FOR_DELIVERY");
    console.log("PASS [10/17]: Invalid transition rejected (400); Driver 1 completed Acknowledge -> PICKED_UP -> OUT_FOR_DELIVERY.");

    // -------------------------------------------------------------------------
    // TEST 11: Customer tracks delivery status & persisted notifications in My Orders
    // -------------------------------------------------------------------------
    const [custOrdersRes, custNotifsRes] = await Promise.all([
      api("/api/v1/orders?include_items=true", { headers: { Cookie: custCookieA } }),
      api("/api/v1/notifications", { headers: { Cookie: custCookieA } }),
    ]);
    assert.strictEqual(custOrdersRes.status, 200);
    const trackedOrder = custOrdersRes.data.find((o) => o.id === codOrder.id);
    assert.ok(trackedOrder?.delivery, "Customer order must include enriched delivery tracking");
    assert.strictEqual(trackedOrder.delivery.delivery_status, "OUT_FOR_DELIVERY");
    assert.strictEqual(trackedOrder.delivery.driver_name, "Rider Marco Santos");
    assert.strictEqual(trackedOrder.delivery.driver_phone, "09181112222");
    assert.strictEqual(trackedOrder.delivery.confirmation_code, handoffCode);
    assert.strictEqual(trackedOrder.payment_status, "cod_pending");

    assert.strictEqual(custNotifsRes.status, 200);
    const eventTypes = new Set(custNotifsRes.data.notifications.map((n) => n.event_type));
    assert.ok(eventTypes.has("DRIVER_ASSIGNED"), "Customer must receive DRIVER_ASSIGNED notification");
    assert.ok(eventTypes.has("PICKED_UP"), "Customer must receive PICKED_UP notification");
    assert.ok(eventTypes.has("OUT_FOR_DELIVERY"), "Customer must receive OUT_FOR_DELIVERY notification");
    console.log("PASS [11/17]: Customer My Orders tracking displays OUT_FOR_DELIVERY, driver contact, ETA, handoff code, and persisted notifications.");

    // -------------------------------------------------------------------------
    // TEST 12: Restricted delivery messaging & issue reporting (Customer A, Driver 1, Admin allowed; Customer B & Driver 2 blocked)
    // -------------------------------------------------------------------------
    const custMsg = await api(`/api/v1/deliveries/${codDeliveryId}/messages`, {
      method: "POST",
      headers: { Cookie: custCookieA },
      body: JSON.stringify({ kind: "message", text: "Please knock on the wooden gate." }),
    });
    assert.strictEqual(custMsg.status, 201);

    const drvMsg = await api(`/api/v1/deliveries/${codDeliveryId}/messages`, {
      method: "POST",
      headers: { Cookie: drv1Cookie },
      body: JSON.stringify({ kind: "message", text: "Arriving in 3 minutes!" }),
    });
    assert.strictEqual(drvMsg.status, 201);

    const custBBlock = await api(`/api/v1/deliveries/${codDeliveryId}/messages`, {
      method: "POST",
      headers: { Cookie: custCookieB },
      body: JSON.stringify({ kind: "message", text: "Unauthorized snooping" }),
    });
    assert.strictEqual(custBBlock.status, 403, "Another customer must get 403 messaging this delivery");

    const drv2MsgBlock = await api(`/api/v1/deliveries/${codDeliveryId}/messages`, {
      method: "POST",
      headers: { Cookie: drv2Cookie },
      body: JSON.stringify({ kind: "message", text: "Unauthorized driver msg" }),
    });
    assert.strictEqual(drv2MsgBlock.status, 403, "Unassigned driver must get 403 messaging this delivery");
    console.log("PASS [12/17]: Restricted delivery messaging verified (Customer A & Driver 1 succeeded; Customer B & Driver 2 blocked 403).");

    // -------------------------------------------------------------------------
    // TEST 13: Premature COD confirmation guard (before DELIVERED -> 409)
    // -------------------------------------------------------------------------
    const earlyCodConfirm = await api(`/api/v1/payments/${linkedCodPayment.id}`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({ action: "confirm_cod", receipt_reference: "EARLY-TEST" }),
    });
    assert.strictEqual(
      earlyCodConfirm.status,
      409,
      `Admin confirming COD before DELIVERED must be rejected 409 (got ${earlyCodConfirm.status})`
    );
    console.log("PASS [13/17]: Premature COD confirmation before delivery completion strictly rejected (409).");

    // -------------------------------------------------------------------------
    // TEST 14: Driver marks DELIVERED with valid confirmation code & cash collected; COD remains cod_pending
    // -------------------------------------------------------------------------
    const wrongCodeRes = await api(`/api/v1/driver/deliveries/${codDeliveryId}`, {
      method: "PATCH",
      headers: { Cookie: drv1Cookie },
      body: JSON.stringify({
        action: "update_status",
        delivery_status: "DELIVERED",
        confirmation_code: "000000",
        cash_collected_amount: expectedTotal,
      }),
    });
    assert.strictEqual(wrongCodeRes.status, 400, "Wrong 6-char handoff code must be rejected (400)");

    const deliveredRes = await api(`/api/v1/driver/deliveries/${codDeliveryId}`, {
      method: "PATCH",
      headers: { Cookie: drv1Cookie },
      body: JSON.stringify({
        action: "update_status",
        delivery_status: "DELIVERED",
        confirmation_code: handoffCode,
        proof_note: "Handed directly to recipient at Unit 88 gate.",
        cash_collected_amount: expectedTotal,
      }),
    });
    assert.strictEqual(deliveredRes.status, 200, `Driver DELIVERED update failed: ${JSON.stringify(deliveredRes.data)}`);
    assert.strictEqual(deliveredRes.data.delivery_status, "DELIVERED");
    assert.strictEqual(Number(deliveredRes.data.cash_collected_amount), expectedTotal);
    assert.ok(deliveredRes.data.delivered_at);

    // Verify COD payment is STILL cod_pending (separated from delivery completion!)
    const payAfterDelivery = await api(`/api/v1/payments/${linkedCodPayment.id}`, {
      headers: { Cookie: adminCookie },
    });
    assert.strictEqual(payAfterDelivery.status, 200);
    assert.strictEqual(
      payAfterDelivery.data.status,
      "cod_pending",
      "COD payment MUST remain cod_pending after driver marks DELIVERED until admin confirms settlement"
    );
    console.log(`PASS [14/17]: Driver marked DELIVERED (verified code ${handoffCode}, cash collected ₱${expectedTotal}); COD payment stayed cod_pending.`);

    // -------------------------------------------------------------------------
    // TEST 15: Authorized Admin separately confirms COD remittance -> PAID/completed + notification
    // -------------------------------------------------------------------------
    const confirmCodRes = await api(`/api/v1/payments/${linkedCodPayment.id}`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        action: "confirm_cod",
        receipt_reference: `REMIT-${String(stamp).slice(-5)}`,
        note: "Cash remitted by Rider Marco Santos at counter.",
      }),
    });
    assert.strictEqual(confirmCodRes.status, 200, `Admin COD confirmation failed: ${JSON.stringify(confirmCodRes.data)}`);
    assert.strictEqual(confirmCodRes.data.status, "completed");
    assert.strictEqual(confirmCodRes.data.verification_mode, "cod_confirmed");

    // Verify Customer A sees order payment_status = paid & receives COD_PAID notification
    const [ordersAfterCod, notifsAfterCod] = await Promise.all([
      api("/api/v1/orders?include_items=true", { headers: { Cookie: custCookieA } }),
      api("/api/v1/notifications", { headers: { Cookie: custCookieA } }),
    ]);
    const settledOrder = ordersAfterCod.data.find((o) => o.id === codOrder.id);
    assert.strictEqual(settledOrder.payment_status, "paid", "Order payment_status must sync to paid after admin COD confirmation");
    assert.strictEqual(settledOrder.delivery.delivery_status, "DELIVERED");
    assert.ok(
      notifsAfterCod.data.notifications.some((n) => n.event_type === "COD_PAID"),
      "Customer must receive COD_PAID notification"
    );
    console.log("PASS [15/17]: Authorized admin confirmed COD remittance -> payment settled PAID & customer notified (COD_PAID).");

    // -------------------------------------------------------------------------
    // TEST 16: Failed Delivery exception workflow + Completed Order History check
    // -------------------------------------------------------------------------
    const failTestOrderRes = await api("/api/v1/orders", {
      method: "POST",
      headers: { Cookie: custCookieA },
      body: JSON.stringify({
        customer_name: "Delivery Customer Alpha",
        dining_option: "Delivery",
        payment_method: "gcash",
        delivery_address: {
          recipient_name: "Delivery Customer Alpha",
          contact_number: "09171234567",
          house_number: "Unit 88",
          street: "Pinewood Drive",
          barangay: testBarangay,
          city: testCity,
        },
        items: [{ product_id: sampleProduct.id, product_name: sampleProduct.name, quantity: 2, unit_price: unitPrice }],
      }),
    });
    assert.strictEqual(failTestOrderRes.status, 201);
    cleanup.Orders.add(failTestOrderRes.data.id);
    const failDeliveryId = failTestOrderRes.data.delivery.id;
    cleanup.Payments.add(failDeliveryId);

    // Assign to Driver 2, pick up, out for delivery, then report FAILED_DELIVERY
    const a2 = await api(`/api/v1/deliveries/${failDeliveryId}`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({ action: "assign_driver", driver_id: driver2.id }),
    });
    assert.strictEqual(a2.status, 200);
    await api(`/api/v1/driver/deliveries/${failDeliveryId}`, {
      method: "PATCH",
      headers: { Cookie: drv2Cookie },
      body: JSON.stringify({ action: "update_status", delivery_status: "PICKED_UP" }),
    });
    await api(`/api/v1/driver/deliveries/${failDeliveryId}`, {
      method: "PATCH",
      headers: { Cookie: drv2Cookie },
      body: JSON.stringify({ action: "update_status", delivery_status: "OUT_FOR_DELIVERY" }),
    });
    const failedRes = await api(`/api/v1/driver/deliveries/${failDeliveryId}`, {
      method: "PATCH",
      headers: { Cookie: drv2Cookie },
      body: JSON.stringify({
        action: "update_status",
        delivery_status: "FAILED_DELIVERY",
        reason: "Recipient unreachable after 3 phone attempts",
      }),
    });
    assert.strictEqual(failedRes.status, 200);
    assert.strictEqual(failedRes.data.delivery_status, "FAILED_DELIVERY");
    assert.strictEqual(failedRes.data.failed_attempts, 1);

    // Verify Customer A's completed order history contains all 4 orders cleanly & Customer B sees 0
    const [custAFinalOrders, custBFinalOrders] = await Promise.all([
      api("/api/v1/orders?include_items=true", { headers: { Cookie: custCookieA } }),
      api("/api/v1/orders?include_items=true", { headers: { Cookie: custCookieB } }),
    ]);
    assert.strictEqual(custAFinalOrders.data.length, 4, "Customer A must see all 4 of their orders");
    assert.strictEqual(custBFinalOrders.data.length, 0, "Customer B must see 0 of Customer A's orders");
    console.log("PASS [16/17]: Driver FAILED_DELIVERY exception workflow & Customer order history isolation verified.");

    // -------------------------------------------------------------------------
    // TEST 17: Payments & Loyalty isolation, Live UI routes smoke check, & Real Customer integrity
    // -------------------------------------------------------------------------
    const [finalPaymentsRes, loyaltyRes, checkoutPage, adminDelivPage, driverPage, myOrdersPage] =
      await Promise.all([
        api("/api/v1/payments?include_meta=true&page_size=100", { headers: { Cookie: adminCookie } }),
        api("/api/v1/loyalty/transactions", { headers: { Cookie: adminCookie } }),
        api("/checkout", { headers: { Cookie: custCookieA } }),
        api("/admin/deliveries", { headers: { Cookie: adminCookie } }),
        api("/driver", { headers: { Cookie: drv1Cookie } }),
        api("/my-orders", { headers: { Cookie: custCookieA } }),
      ]);

    assert.strictEqual(finalPaymentsRes.status, 200);
    const leakedInPayments = finalPaymentsRes.data.payments.filter((p) =>
      DELIVERY_SYSTEM_PROVIDERS.has(String(p.provider || "").toLowerCase())
    );
    assert.strictEqual(leakedInPayments.length, 0, "ZERO delivery system envelopes may leak into /api/v1/payments");

    assert.strictEqual(loyaltyRes.status, 200);
    const loyaltyArr = Array.isArray(loyaltyRes.data)
      ? loyaltyRes.data
      : Array.isArray(loyaltyRes.data?.transactions)
        ? loyaltyRes.data.transactions
        : [];
    const leakedInLoyalty = loyaltyArr.filter((t) =>
      DELIVERY_SYSTEM_PROVIDERS.has(String(t.provider || "").toLowerCase())
    );
    assert.strictEqual(leakedInLoyalty.length, 0, "ZERO delivery system envelopes may leak into Loyalty transactions");

    assert.strictEqual(checkoutPage.status, 200, "/checkout must return 200");
    assert.strictEqual(adminDelivPage.status, 200, "/admin/deliveries must return 200");
    assert.strictEqual(driverPage.status, 200, "/driver must return 200");
    assert.strictEqual(myOrdersPage.status, 200, "/my-orders must return 200");

    // Verify existing real customer record was NEVER altered
    const afterRealCustomer = await airtableGetRaw("Users", "recd00pXJ56DNI3Lx");
    assert.strictEqual(
      afterRealCustomer?.fields?.loyalty_points,
      baselinePoints,
      "Existing real customer Bean Points must remain completely untouched"
    );

    console.log(
      `PASS [17/17]: Zero leaks in Payments & Loyalty, all 4 UI routes return HTTP 200, real customer record intact (${baselinePoints} pts).`
    );
    console.log("\nALL 17/17 DELIVERY SYSTEM E2E SCENARIOS PASSED LIVE!");
  } finally {
    console.log("\nCleaning up temporary test records from Airtable...");
    // Sweep linked OrderItems, Order Payments, Notifications, Driver Profiles, Addresses, Deliveries
    try {
      const orderIds = Array.from(cleanup.Orders);
      const userIds = Array.from(cleanup.Users);
      const staffIds = Array.from(cleanup.Staff);

      const allOrderItems = await airtableListRaw("OrderItems");
      for (const item of allOrderItems) {
        if (orderIds.includes(String(item.fields?.order_id || ""))) {
          cleanup.OrderItems.add(item.id);
        }
      }

      const allPayments = await airtableListRaw("Payments");
      for (const p of allPayments) {
        const f = p.fields || {};
        const blob = `${f.order_id || ""} ${f.order_number || ""} ${f.transaction_id || ""} ${f.payment_ref || ""}`;
        if (
          orderIds.some((oid) => blob.includes(oid)) ||
          userIds.some((uid) => blob.includes(uid)) ||
          staffIds.some((sid) => blob.includes(sid)) ||
          blob.includes(emailA) ||
          blob.includes(emailB) ||
          blob.includes(testCity) ||
          blob.includes(testBarangay)
        ) {
          cleanup.Payments.add(p.id);
        }
      }
    } catch {
      // Best-effort sweep
    }

    for (const id of cleanup.OrderItems) await airtableDelete("OrderItems", id);
    for (const id of cleanup.Payments) await airtableDelete("Payments", id);
    for (const id of cleanup.Orders) await airtableDelete("Orders", id);
    for (const id of cleanup.Staff) await airtableDelete("Staff", id);
    for (const id of cleanup.Users) await airtableDelete("Users", id);

    console.log(
      `Cleanup complete (deleted: ${cleanup.Orders.size} Orders, ${cleanup.OrderItems.size} OrderItems, ${cleanup.Payments.size} Payments/System records, ${cleanup.Staff.size} Staff drivers, ${cleanup.Users.size} Users).`
    );
  }
}

runDeliveryE2E().catch((err) => {
  console.error("\nDELIVERY E2E FAILED:", err);
  process.exit(1);
});
