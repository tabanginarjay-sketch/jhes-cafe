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
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const idx = t.indexOf("=");
      const k = t.slice(0, idx).trim();
      const v = t.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!cfg[k]) cfg[k] = v;
    }
  }
  return cfg;
}

const ENV = loadEnvConfig();
const AIRTABLE_PAT = ENV.AIRTABLE_PAT;
const AIRTABLE_BASE_ID = ENV.AIRTABLE_BASE_ID;

async function airtableListRaw(table) {
  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`, {
    headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.records) ? data.records : [];
}

async function airtableGetRaw(table, id) {
  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}/${id}`, {
    headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
  });
  return res.ok ? await res.json() : null;
}

async function airtableDelete(table, id) {
  if (!id || !String(id).startsWith("rec")) return;
  await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}/${id}`, {
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
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data, text, setCookie };
}

function extractCookie(hdr, name) {
  if (!hdr) return null;
  const m = hdr.match(new RegExp(`${name}=([^;]+)`));
  return m ? m[1] : null;
}

async function runAuditVerification() {
  console.log("=== JHE'S CAFE' — LIVE AUDIT CORRECTION VERIFICATION SUITE ===");
  console.log(`Target: ${BASE_URL}\n`);

  const stamp = Date.now();
  const cleanup = { Orders: new Set(), OrderItems: new Set(), Payments: new Set(), Users: new Set() };
  const testEmail = `audit.verify.${stamp}@jhescafe.ph`;

  try {
    // Baseline real customer check (must remain untouched)
    const baseline = await airtableGetRaw("Users", "recd00pXJ56DNI3Lx");
    const baselinePoints = baseline?.fields?.loyalty_points;

    // 1. Phase 1 Content Checks: Ticker, Our Story self-link removed, Our Cafe English notice
    const [homeRes, storyRes, cafeRes] = await Promise.all([
      api("/"),
      api("/our-story"),
      api("/our-cafe"),
    ]);
    assert.strictEqual(homeRes.status, 200);
    assert.ok(
      homeRes.text.includes("Dine-In, Takeaway") && homeRes.text.includes("Delivery"),
      "Homepage ticker must reflect Dine-In, Takeaway & Delivery"
    );
    assert.ok(
      !homeRes.text.includes("real-time kitchen tracking"),
      "Stale 'real-time kitchen tracking' announcement must be removed"
    );
    assert.strictEqual(storyRes.status, 200);
    assert.ok(
      !storyRes.text.includes("Read Our Full Story"),
      "/our-story must not show self-referential 'Read Our Full Story' link"
    );
    assert.strictEqual(cafeRes.status, 200);
    assert.ok(
      !cafeRes.text.includes("Bago makapag-book"),
      "/our-cafe must not contain mixed Tagalog notice"
    );
    console.log("PASS [1/7]: Phase 1 content fixes verified (ticker, /our-story self-link removed, /our-cafe English copy).");

    // 2. Phase 3 Security: Unauthenticated POST /reservations & POST /users rejected (401), GET /reservations masks PII
    const [unauthResPost, unauthUsersPost, guestResGet, forgotRes] = await Promise.all([
      api("/api/v1/reservations", {
        method: "POST",
        body: JSON.stringify({
          date: "2027-01-15",
          time_slot: "10:30 AM – Mid-Morning Sun",
          zone: "Communal Walnut Table",
          guests: 2,
          customer_name: "Spoofed Guest",
          customer_email: "spoof@example.com",
        }),
      }),
      api("/api/v1/users", {
        method: "POST",
        body: JSON.stringify({ full_name: "Unauth User", email: `unauth.${stamp}@example.com` }),
      }),
      api("/api/v1/reservations"),
      api("/api/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "member@example.com" }),
      }),
    ]);
    assert.strictEqual(unauthResPost.status, 401, "Unauthenticated POST /reservations must return 401");
    assert.strictEqual(unauthUsersPost.status, 401, "Unauthenticated POST /users must return 401");
    assert.strictEqual(guestResGet.status, 200);
    if (Array.isArray(guestResGet.data)) {
      for (const r of guestResGet.data) {
        assert.strictEqual(r.customer_email, undefined, "Public GET /reservations must never expose customer_email");
        assert.strictEqual(r.customer_phone, undefined, "Public GET /reservations must never expose customer_phone");
      }
    }
    assert.strictEqual(forgotRes.status, 200);
    assert.strictEqual(forgotRes.data.email_sent, false, "Forgot-password must honestly report email_sent: false");
    console.log("PASS [2/7]: Reservations auth (401) & PII masking, POST /users admin gate (401), and honest forgot-password verified.");

    // 3. Register temp customer & verify Phase 2 Doughnut dark-cacao-dip (+₱25) exact backend pricing parity
    const reg = await api("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        full_name: "Audit Parity Tester",
        email: testEmail,
        password: "AuditPassword123!",
        phone: "09175551212",
      }),
    });
    assert.strictEqual(reg.status, 201, `Register failed: ${JSON.stringify(reg.data)}`);
    cleanup.Users.add(reg.data.user.id);
    const custCookie = `jhes_session=${extractCookie(reg.setCookie, "jhes_session")}`;

    const prods = (await api("/api/v1/catalog/products")).data;
    const glazedDoughnut = prods.find((p) => p.slug === "glazed-heritage-doughnut");
    const croissant = prods.find((p) => p.slug === "rosemary-butter-croissant");
    const affogato = prods.find((p) => p.slug === "single-origin-affogato-al-caffe");
    assert.ok(glazedDoughnut && croissant && affogato, "Canonical test products must exist");

    // Order: Glazed Doughnut (140 + 25 dark-cacao-dip = 165) + Rosemary Croissant (160 + 35 cacao-dip = 195) + Affogato (210) = 570
    const expectedTotal = Number(glazedDoughnut.price) + 25 + Number(croissant.price) + 35 + Number(affogato.price);
    const orderRes = await api("/api/v1/orders", {
      method: "POST",
      headers: { Cookie: custCookie },
      body: JSON.stringify({
        customer_name: "Audit Parity Tester",
        dining_option: "Takeaway",
        pickup_time_preference: "ASAP",
        payment_method: "gcash",
        special_notes: "PRIVATE-NOTE-GATE-9999",
        items: [
          {
            product_id: glazedDoughnut.id,
            product_name: glazedDoughnut.name,
            quantity: 1,
            unit_price: glazedDoughnut.price + 25,
            is_bakery: true,
            add_ons: "dark-cacao-dip",
          },
          {
            product_id: croissant.id,
            product_name: croissant.name,
            quantity: 1,
            unit_price: croissant.price + 35,
            is_bakery: true,
            add_ons: "cacao-dip",
          },
          {
            product_id: affogato.id,
            product_name: affogato.name,
            quantity: 1,
            unit_price: affogato.price,
            size: "Venti 20oz", // Must be ignored for Affogato!
            milk: "Barista Oat Milk", // Must be ignored for Affogato!
          },
        ],
      }),
    });
    assert.strictEqual(orderRes.status, 201, `Parity order failed: ${JSON.stringify(orderRes.data)}`);
    cleanup.Orders.add(orderRes.data.id);
    assert.strictEqual(
      Number(orderRes.data.total_amount),
      expectedTotal,
      `Expected exact total ₱${expectedTotal} (165 doughnut + 195 croissant + 210 affogato), got ₱${orderRes.data.total_amount}`
    );
    console.log(`PASS [3/7]: Phase 2 backend pricing parity verified — dark-cacao-dip (+₱25), cacao-dip (+₱35), and Affogato (ignored bogus size/milk) = ₱${expectedTotal}.`);

    // 4. Phase 3 Order Lookup Privacy: Public GET /orders/[order_number] must mask customer_name & special_notes; owner sees full details
    const [publicLookup, ownerLookup] = await Promise.all([
      api(`/api/v1/orders/${encodeURIComponent(orderRes.data.order_number)}`),
      api(`/api/v1/orders/${encodeURIComponent(orderRes.data.order_number)}`, { headers: { Cookie: custCookie } }),
    ]);
    assert.strictEqual(publicLookup.status, 200);
    assert.strictEqual(publicLookup.data.customer_name, "Verified Member", "Public lookup must mask customer_name");
    assert.strictEqual(publicLookup.data.special_notes, undefined, "Public lookup must mask special_notes");
    assert.strictEqual(publicLookup.data.customer_email, undefined, "Public lookup must mask customer_email");
    assert.strictEqual(ownerLookup.status, 200);
    assert.strictEqual(ownerLookup.data.customer_name, "Audit Parity Tester");
    assert.ok(String(ownerLookup.data.special_notes || "").includes("PRIVATE-NOTE-GATE-9999"));
    console.log("PASS [4/7]: GET /api/v1/orders/[id] privacy masking verified for public vs. authenticated owner.");

    // 5. Authenticated Reservation succeeds & binds session email
    const authResPost = await api("/api/v1/reservations", {
      method: "POST",
      headers: { Cookie: custCookie },
      body: JSON.stringify({
        date: "2027-02-20",
        time_slot: "3:30 PM – Afternoon Golden Hour",
        zone: "Sunlit Botanical Lounge",
        guests: 2,
        customer_name: "Spoofed Name",
        customer_email: "someone.else@example.com",
      }),
    });
    assert.strictEqual(authResPost.status, 201, `Authenticated reservation failed: ${JSON.stringify(authResPost.data)}`);
    assert.strictEqual(authResPost.data.customer_email, testEmail, "Reservation email must bind to verified session");
    console.log(`PASS [5/7]: Authenticated reservation succeeded with server-bound session identity (storage: ${authResPost.data.storage_mode}).`);

    // 6. Phase 4 Admin Customers Deduplication: tabanginarjay@gmail.com must appear ONLY ONCE with 9 pts
    const adminLogin = await api("/api/v1/auth/admin", {
      method: "POST",
      body: JSON.stringify({ email: "jhe@jhescafe.com", passcode: "BARISTA-01" }),
    });
    assert.strictEqual(adminLogin.status, 200);
    const adminCookie = `jhes_admin_session=${extractCookie(adminLogin.setCookie, "jhes_admin_session")}`;

    const usersRes = await api("/api/v1/users", { headers: { Cookie: adminCookie } });
    assert.strictEqual(usersRes.status, 200);
    const arjayMatches = usersRes.data.filter(
      (u) => String(u.email || "").toLowerCase().trim() === "tabanginarjay@gmail.com"
    );
    assert.strictEqual(arjayMatches.length, 1, `Expected 1 deduplicated tabanginarjay@gmail.com row, got ${arjayMatches.length}`);
    assert.strictEqual(arjayMatches[0].loyalty_points, baselinePoints, "Canonical customer row must retain authoritative loyalty points");
    console.log(`PASS [6/7]: Admin GET /api/v1/users deduplicated tabanginarjay@gmail.com cleanly (1 row, ${baselinePoints} pts, 0 records deleted).`);

    // 7. Live Admin UI routes smoke check & untouched real customer verification
    const [dashPage, reportsPage, staffPage, trackPage] = await Promise.all([
      api("/admin", { headers: { Cookie: adminCookie } }),
      api("/admin/reports", { headers: { Cookie: adminCookie } }),
      api("/admin/staff", { headers: { Cookie: adminCookie } }),
      api("/track-order"),
    ]);
    assert.strictEqual(dashPage.status, 200);
    assert.strictEqual(reportsPage.status, 200);
    assert.strictEqual(staffPage.status, 200);
    assert.strictEqual(trackPage.status, 200);

    const afterReal = await airtableGetRaw("Users", "recd00pXJ56DNI3Lx");
    assert.strictEqual(afterReal?.fields?.loyalty_points, baselinePoints);
    console.log("PASS [7/7]: Admin Dashboard, Reports, Staff & Track Order routes HTTP 200; real customer record untouched.");
    console.log("\nALL 7/7 LIVE AUDIT CORRECTION CHECKS PASSED!");
  } finally {
    console.log("\nCleaning up temporary verification records...");
    const orderIds = Array.from(cleanup.Orders);
    const userIds = Array.from(cleanup.Users);
    for (const it of await airtableListRaw("OrderItems")) {
      if (orderIds.includes(String(it.fields?.order_id || ""))) cleanup.OrderItems.add(it.id);
    }
    for (const p of await airtableListRaw("Payments")) {
      const f = p.fields || {};
      const blob = `${f.order_id || ""} ${f.order_number || ""} ${f.transaction_id || ""} ${f.payment_ref || ""}`;
      if (orderIds.some((id) => blob.includes(id)) || userIds.some((id) => blob.includes(id)) || blob.includes(testEmail)) {
        cleanup.Payments.add(p.id);
      }
    }
    for (const id of cleanup.OrderItems) await airtableDelete("OrderItems", id);
    for (const id of cleanup.Payments) await airtableDelete("Payments", id);
    for (const id of cleanup.Orders) await airtableDelete("Orders", id);
    for (const id of cleanup.Users) await airtableDelete("Users", id);
    console.log(`Cleanup complete (${cleanup.Orders.size} Orders, ${cleanup.OrderItems.size} OrderItems, ${cleanup.Payments.size} Payments, ${cleanup.Users.size} Users).`);
  }
}

runAuditVerification().catch((err) => {
  console.error("\nAUDIT VERIFICATION FAILED:", err);
  process.exit(1);
});
