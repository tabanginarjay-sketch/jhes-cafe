import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3005";

function loadEnvConfig() {
  const envPaths = [
    path.resolve("backend/.env"),
    path.resolve("frontend/.env.local"),
  ];
  const cfg = { ...process.env };
  for (const p of envPaths) {
    if (!fs.existsSync(p)) continue;
    const lines = fs.readFileSync(p, "utf-8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!cfg[key]) cfg[key] = val;
    }
  }
  return cfg;
}

const ENV = loadEnvConfig();
const AIRTABLE_PAT = ENV.AIRTABLE_PAT;
const AIRTABLE_BASE_ID = ENV.AIRTABLE_BASE_ID;

async function airtableFetchAll(tableName) {
  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableName}`, {
    headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
  });
  assert.strictEqual(res.ok, true, `Airtable list ${tableName} failed`);
  const data = await res.json();
  return (data.records || []).map((r) => ({ id: r.id, created_at: r.createdTime, ...r.fields }));
}

async function airtableDeleteRecord(tableName, id) {
  if (!id || !id.startsWith("rec")) return;
  await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableName}/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
  }).catch(() => {});
}

async function api(endpoint, options = {}) {
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
  return { status: res.status, ok: res.ok, data, setCookie };
}

function extractCookie(setCookieHeader, name) {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

async function runSuite() {
  console.log(`=== JHE'S CAFE' — 12-POINT PAYMENT MANAGEMENT VERIFICATION SUITE ===`);
  console.log(`Target: ${BASE_URL}\n`);

  const cleanup = {
    Orders: [],
    OrderItems: [],
    Payments: [],
    Users: [],
  };

  try {
    // Admin Sign-in
    const adminLogin = await api("/api/v1/auth/admin", {
      method: "POST",
      body: JSON.stringify({ email: "jhe@jhescafe.com", credential: "BARISTA-01" }),
    });
    assert.strictEqual(adminLogin.status, 200, `Admin sign-in failed: ${JSON.stringify(adminLogin.data)}`);
    const adminCookie = extractCookie(adminLogin.setCookie, "jhes_admin_session");
    assert.ok(adminCookie, "Admin session cookie missing");
    const adminHeaders = { Cookie: `jhes_admin_session=${adminCookie}` };

    // Baseline payment + loyalty counts
    const baselinePayRes = await api("/api/v1/payments?include_meta=true&page_size=100", {
      headers: adminHeaders,
    });
    assert.strictEqual(baselinePayRes.status, 200, `Baseline payments fetch failed: ${JSON.stringify(baselinePayRes.data)}`);
    const baselinePaymentCount = baselinePayRes.data.stats.total_count;
    const baselineCollected = baselinePayRes.data.stats.total_collected;

    // Register a fresh test customer (generates +25 Bean Points signup loyalty tx)
    const testEmail = `test.paymod.${Date.now()}@jhescafe.ph`;
    const regRes = await api("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        full_name: "Payment Module Verifier",
        email: testEmail,
        password: "VerifyPassword123!",
        phone: "09175551234",
      }),
    });
    assert.strictEqual(regRes.status, 201, `Customer registration failed: ${JSON.stringify(regRes.data)}`);
    const custCookie = extractCookie(regRes.setCookie, "jhes_session");
    const custId = regRes.data.user.id;
    cleanup.Users.push(custId);
    const custHeaders = { Cookie: `jhes_session=${custCookie}` };

    // =========================================================================
    // TEST 1: Adding an item to cart creates NO payment record (nor admin order)
    // =========================================================================
    const cartSave = await api("/api/v1/cart", {
      method: "POST",
      headers: custHeaders,
      body: JSON.stringify({
        items: [
          {
            productId: "spanish-latte-dulce",
            slug: "spanish-latte-dulce",
            name: "Spanish Latte Dulce",
            price: 220,
            quantity: 1,
            size: "Grande 16oz",
            temperature: "Iced",
            milk: "Whole Milk",
            sweetness: 50,
          },
        ],
      }),
    });
    assert.strictEqual(cartSave.status, 200, "Cart save failed");

    const payAfterCart = await api("/api/v1/payments?include_meta=true&page_size=100", {
      headers: adminHeaders,
    });
    assert.strictEqual(
      payAfterCart.data.stats.total_count,
      baselinePaymentCount,
      "TEST 1 FAIL: Adding item to cart must NOT create any payment record"
    );
    const adminOrdersAfterCart = await api("/api/v1/orders", { headers: adminHeaders });
    const leakedCartOrders = (adminOrdersAfterCart.data || []).filter(
      (o) =>
        String(o.status || "").toLowerCase() === "cart" ||
        String(o.order_number || "").toUpperCase().startsWith("CART-")
    );
    assert.strictEqual(
      leakedCartOrders.length,
      0,
      "TEST 1 FAIL: Cart drafts must NOT appear in /api/v1/orders"
    );
    // Also verify POST /api/v1/payments rejects cart payload
    const cartPayReject = await api("/api/v1/payments", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        order_id: "recCartDummy",
        order_number: "CART-TEST1234",
        amount: 220,
        provider: "cash",
        status: "cart",
      }),
    });
    assert.strictEqual(cartPayReject.status, 400, "POST /api/v1/payments must reject cart payload");
    console.log("PASS [01/12]: Adding an item to cart creates no payment record and leaks no cart order.");

    // =========================================================================
    // TEST 4: Loyalty signup points appear ONLY in loyalty transactions
    // =========================================================================
    const loyaltyRes = await api("/api/v1/loyalty/transactions", { headers: adminHeaders });
    assert.strictEqual(loyaltyRes.status, 200, "Loyalty transactions endpoint failed");
    const signupTx = (loyaltyRes.data.transactions || []).find(
      (t) => t.customer_id === custId && t.transaction_type === "signup_bonus"
    );
    assert.ok(signupTx, "TEST 4 FAIL: Signup bonus loyalty tx missing from /api/v1/loyalty/transactions");
    assert.strictEqual(signupTx.points, 25);
    assert.strictEqual(signupTx.unit, "Bean Points");
    cleanup.Payments.push(signupTx.id);

    const loyaltyInPayments = (payAfterCart.data.payments || []).filter(
      (p) =>
        String(p.payment_ref || "").startsWith("LTX-") ||
        String(p.provider || "").includes("loyalty") ||
        String(p.order_number || "").startsWith("LOYALTY-")
    );
    assert.strictEqual(
      loyaltyInPayments.length,
      0,
      "TEST 4 FAIL: Loyalty transactions must NEVER appear in /api/v1/payments"
    );
    console.log("PASS [04/12]: Loyalty signup points appear ONLY in loyalty transactions, never in payments.");

    // =========================================================================
    // TEST 2 & TEST 3: Submitting an order creates correct Order + associated Payment
    // =========================================================================
    const gcashOrderNum = `JHE-T1-${Math.floor(10000 + Math.random() * 90000)}`;
    const gcashOrderRes = await api("/api/v1/orders", {
      method: "POST",
      headers: custHeaders,
      body: JSON.stringify({
        order_number: gcashOrderNum,
        idempotency_key: `IDEM-GCASH-${Date.now()}`,
        customer_name: "Payment Module Verifier",
        customer_email: testEmail,
        dining_option: "Takeaway",
        payment_method: "gcash",
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
    assert.strictEqual(gcashOrderRes.status, 201, `GCash order failed: ${JSON.stringify(gcashOrderRes.data)}`);
    const gcashOrderId = gcashOrderRes.data.id;
    const gcashPaymentId = gcashOrderRes.data.payment?.id;
    cleanup.Orders.push(gcashOrderId);
    if (gcashPaymentId) cleanup.Payments.push(gcashPaymentId);
    for (const it of gcashOrderRes.data.items || []) {
      if (it.id) cleanup.OrderItems.push(it.id);
    }

    assert.strictEqual(gcashOrderRes.data.order_number, gcashOrderNum);
    assert.strictEqual(gcashOrderRes.data.status, "pending");
    assert.strictEqual(gcashOrderRes.data.payment_status, "pending");
    assert.ok(gcashPaymentId, "Checkout must create an associated payment record");
    console.log(`PASS [02/12]: Submitting checkout order created Order #${gcashOrderNum} (₱${gcashOrderRes.data.total_amount}).`);

    const payAfterOrder = await api("/api/v1/payments?include_meta=true&page_size=100", {
      headers: adminHeaders,
    });
    const gcashPayRow = payAfterOrder.data.payments.find((p) => p.id === gcashPaymentId);
    assert.ok(gcashPayRow, "TEST 3 FAIL: Associated payment record not found in /api/v1/payments");
    assert.strictEqual(gcashPayRow.order_id, gcashOrderId);
    assert.strictEqual(gcashPayRow.order_number, gcashOrderNum);
    assert.strictEqual(gcashPayRow.provider, "gcash");
    assert.strictEqual(gcashPayRow.status, "pending");
    assert.strictEqual(gcashPayRow.amount, gcashOrderRes.data.total_amount);
    console.log(`PASS [03/12]: Valid checkout created linked pending payment ${gcashPayRow.payment_ref}.`);

    // =========================================================================
    // TEST 5: Earned points appear in loyalty ledger & do NOT increase payment revenue
    // =========================================================================
    const loyaltyAfterOrder = await api("/api/v1/loyalty/transactions", { headers: adminHeaders });
    const earnedTx = (loyaltyAfterOrder.data.transactions || []).find(
      (t) => t.customer_id === custId && t.transaction_type === "order_earned" && t.order_reference === gcashOrderNum
    );
    assert.ok(earnedTx, "TEST 5 FAIL: Order earned loyalty transaction missing from loyalty ledger");
    assert.strictEqual(earnedTx.points, Math.floor(gcashOrderRes.data.total_amount / 50));
    cleanup.Payments.push(earnedTx.id);

    assert.strictEqual(
      payAfterOrder.data.stats.total_collected,
      baselineCollected,
      "TEST 5 FAIL: Earned loyalty points or pending order must NOT increase total collected payment revenue"
    );
    console.log(`PASS [05/12]: Order earned +${earnedTx.points} pts recorded in Loyalty Ledger; PHP revenue unchanged (₱${baselineCollected}).`);

    // =========================================================================
    // TEST 6: Pending GCash payment remains pending until verified
    // =========================================================================
    const genericGcashAttempt = await api(`/api/v1/payments/${gcashPaymentId}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ status: "completed" }),
    });
    assert.strictEqual(
      genericGcashAttempt.status,
      403,
      `TEST 6 FAIL: Generic completion on GCash must be 403, got ${genericGcashAttempt.status}`
    );

    const cashActionOnGcash = await api(`/api/v1/payments/${gcashPaymentId}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ action: "confirm_cash" }),
    });
    assert.strictEqual(cashActionOnGcash.status, 403, "Cashier action must be rejected on GCash");

    const demoNoAck = await api(`/api/v1/payments/${gcashPaymentId}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({
        action: "verify_demo",
        verification_reference: "SIM-9901",
        demo_acknowledgement: false,
      }),
    });
    assert.strictEqual(demoNoAck.status, 400, "Demo verification without acknowledgement must be rejected");

    const gcashStillPending = await api(`/api/v1/payments/${gcashPaymentId}`, {
      headers: adminHeaders,
    });
    assert.strictEqual(gcashStillPending.data.status, "pending", "TEST 6 FAIL: GCash must remain pending");
    console.log("PASS [06/12]: Pending GCash payment rejected generic confirmation and remained pending.");

    // =========================================================================
    // TEST 7: Cash payment can be confirmed by an authorized cashier (with audit trail & order_status separation)
    // =========================================================================
    const cashOrderNum = `JHE-T2-${Math.floor(10000 + Math.random() * 90000)}`;
    const cashOrderRes = await api("/api/v1/orders", {
      method: "POST",
      headers: custHeaders,
      body: JSON.stringify({
        order_number: cashOrderNum,
        idempotency_key: `IDEM-CASH-${Date.now()}`,
        customer_name: "Payment Module Verifier",
        customer_email: testEmail,
        dining_option: "Dine-in",
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
      }),
    });
    assert.strictEqual(cashOrderRes.status, 201);
    const cashOrderId = cashOrderRes.data.id;
    const cashPaymentId = cashOrderRes.data.payment?.id;
    cleanup.Orders.push(cashOrderId);
    if (cashPaymentId) cleanup.Payments.push(cashPaymentId);
    for (const it of cashOrderRes.data.items || []) {
      if (it.id) cleanup.OrderItems.push(it.id);
    }

    const confirmCashRes = await api(`/api/v1/payments/${cashPaymentId}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({
        action: "confirm_cash",
        receipt_reference: "POS-TEST-77",
        note: "Exact cash received at front counter",
      }),
    });
    assert.strictEqual(confirmCashRes.status, 200, `Cash confirmation failed: ${JSON.stringify(confirmCashRes.data)}`);
    assert.strictEqual(confirmCashRes.data.status, "completed");
    assert.strictEqual(confirmCashRes.data.is_simulated, false);
    assert.strictEqual(confirmCashRes.data.verification_mode, "cashier_counter");
    assert.ok(
      confirmCashRes.data.verification_history.some(
        (e) => e.action === "cash_confirmed" && e.by === "Jhe Ramos"
      ),
      "Cashier audit trail must record authorized cashier name"
    );
    // Verify order payment_status synced to paid WITHOUT changing order prep status (still pending)
    const cashOrderCheck = await api(`/api/v1/orders/${cashOrderId}`, { headers: adminHeaders });
    assert.strictEqual(String(cashOrderCheck.data.payment_status).trim(), "paid");
    assert.strictEqual(String(cashOrderCheck.data.status).trim(), "pending");
    console.log("PASS [07/12]: Counter cash payment confirmed by authorized cashier with audit trail & separated order_status.");

    // =========================================================================
    // TEST 8: Failed payments are not counted as revenue (and require reason)
    // =========================================================================
    const failNoReason = await api(`/api/v1/payments/${gcashPaymentId}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ action: "mark_failed" }),
    });
    assert.strictEqual(failNoReason.status, 400, "Marking failed without a reason must return 400");

    const revBeforeFail = (
      await api("/api/v1/payments?include_meta=true&page_size=100", { headers: adminHeaders })
    ).data.stats;

    const markFailedRes = await api(`/api/v1/payments/${gcashPaymentId}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({
        action: "mark_failed",
        reason: "GCash payment session expired before transfer",
      }),
    });
    assert.strictEqual(markFailedRes.status, 200);
    assert.strictEqual(markFailedRes.data.status, "failed");
    assert.ok(
      markFailedRes.data.failure_reason.includes("expired"),
      "Failure reason must be persisted and returned"
    );

    const revAfterFail = (
      await api("/api/v1/payments?include_meta=true&page_size=100", { headers: adminHeaders })
    ).data.stats;
    assert.strictEqual(
      revAfterFail.total_collected,
      revBeforeFail.total_collected,
      "TEST 8 FAIL: Failed payment must NOT be counted as revenue"
    );
    assert.strictEqual(revAfterFail.failed_count, revBeforeFail.failed_count + 1);
    console.log("PASS [08/12]: Failed payment recorded with mandatory reason and excluded from collected revenue.");

    // =========================================================================
    // TEST 9: Payment detail endpoint returns full structured detail view
    // =========================================================================
    const detailRes = await api(`/api/v1/payments/${cashPaymentId}`, { headers: adminHeaders });
    assert.strictEqual(detailRes.status, 200);
    const d = detailRes.data;
    assert.strictEqual(d.id, cashPaymentId);
    assert.ok(d.payment_ref.startsWith("PAY-"));
    assert.strictEqual(d.order_number, cashOrderNum);
    assert.strictEqual(d.customer_name, "Payment Module Verifier");
    assert.strictEqual(d.customer_email, testEmail);
    assert.strictEqual(d.payment_method, "cash");
    assert.strictEqual(d.currency, "PHP");
    assert.strictEqual(d.status, "completed");
    assert.ok(d.provider_transaction_ref.includes("CASH-CONFIRMED-POS-TEST-77"));
    assert.ok(d.created_at);
    assert.ok(d.updated_at);
    assert.ok(Array.isArray(d.verification_history) && d.verification_history.length >= 2);
    console.log("PASS [09/12]: Payment detail view returns all 11 required fields + chronological audit history.");

    // =========================================================================
    // TEST 10: Payment records cannot be arbitrarily modified
    // =========================================================================
    const editAmount = await api(`/api/v1/payments/${cashPaymentId}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ amount: 1 }),
    });
    assert.strictEqual(editAmount.status, 403, "Editing payment amount must return 403");

    const editMethod = await api(`/api/v1/payments/${cashPaymentId}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ provider: "gcash" }),
    });
    assert.strictEqual(editMethod.status, 403, "Editing payment method must return 403");

    const editTxId = await api(`/api/v1/payments/${cashPaymentId}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ transaction_id: "ARBITRARY-OVERRIDE" }),
    });
    assert.strictEqual(editTxId.status, 403, "Editing transaction_id directly must return 403");

    const revertCompleted = await api(`/api/v1/payments/${cashPaymentId}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ status: "pending" }),
    });
    assert.strictEqual(revertCompleted.status, 403, "Reverting completed payment to pending must return 403");

    const mutateFailed = await api(`/api/v1/payments/${gcashPaymentId}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ action: "verify_demo", verification_reference: "SIM-1234", demo_acknowledgement: true }),
    });
    assert.strictEqual(mutateFailed.status, 403, "Mutating terminal failed payment must return 403");

    const mutateLoyalty = await api(`/api/v1/payments/${signupTx.id}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ action: "mark_failed", reason: "Trying to alter loyalty" }),
    });
    assert.strictEqual(mutateLoyalty.status, 403, "Mutating loyalty record via payments route must return 403");
    console.log("PASS [10/12]: Immutable payment guardrails blocked amount, method, tx_id, terminal & loyalty tampering (all 403).");

    // =========================================================================
    // TEST 11: Refund records remain linked to their original payments
    // =========================================================================
    const refundRes = await api(`/api/v1/payments/${cashPaymentId}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({
        action: "refund",
        refund_amount: d.amount,
        reason: "Automated verification refund test",
      }),
    });
    assert.strictEqual(refundRes.status, 200, `Refund failed: ${JSON.stringify(refundRes.data)}`);
    assert.strictEqual(refundRes.data.status, "refunded");
    assert.ok(refundRes.data.refund, "Refund metadata must be attached to original payment");
    assert.ok(refundRes.data.refund.refund_ref.startsWith("REF-2026-"));
    assert.strictEqual(refundRes.data.refund.original_payment_id, cashPaymentId);
    assert.strictEqual(refundRes.data.refund.original_payment_ref, d.payment_ref);
    assert.strictEqual(refundRes.data.refund.amount, d.amount);
    assert.strictEqual(refundRes.data.refund.reason, "Automated verification refund test");
    if (refundRes.data.refund.id) cleanup.Payments.push(refundRes.data.refund.id);

    // Confirm refunded payment is now terminal immutable
    const mutateRefunded = await api(`/api/v1/payments/${cashPaymentId}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ action: "refund", reason: "Double refund attempt" }),
    });
    assert.strictEqual(mutateRefunded.status, 403, "Double-refunding already refunded payment must return 403");
    console.log(`PASS [11/12]: Refund ${refundRes.data.refund.refund_ref} created & linked to original payment ${d.payment_ref}; double-refund blocked.`);

    // =========================================================================
    // TEST 12: Admin statistics match underlying Airtable data 100%
    // =========================================================================
    const [apiSnapshot, rawAirtablePayments] = await Promise.all([
      api("/api/v1/payments?include_meta=true&page_size=100", { headers: adminHeaders }),
      airtableFetchAll("Payments"),
    ]);

    // Track cash order earned loyalty tx for clean teardown too
    const loyaltyCheck = await api("/api/v1/loyalty/transactions", { headers: adminHeaders });
    for (const lt of loyaltyCheck.data.transactions || []) {
      if (lt.customer_id === custId && !cleanup.Payments.includes(lt.id)) {
        cleanup.Payments.push(lt.id);
      }
    }

    const isLoyalty = (r) =>
      String(r.provider || "").toLowerCase() === "loyalty_bean_points" ||
      String(r.payment_ref || "").toUpperCase().startsWith("LTX-") ||
      String(r.order_number || "").toUpperCase().startsWith("LOYALTY-");
    const isRefund = (r) =>
      String(r.payment_ref || "").toUpperCase().startsWith("REF-") ||
      String(r.provider || "").toLowerCase().endsWith("_refund") ||
      String(r.transaction_id || "").startsWith("REFUND-OF:");
    const isCart = (r) =>
      String(r.status || "").toLowerCase().trim() === "cart" ||
      String(r.order_number || "").toUpperCase().startsWith("CART-");

    const genuinePayments = rawAirtablePayments.filter((r) => !isLoyalty(r) && !isRefund(r) && !isCart(r));
    const refundRows = rawAirtablePayments.filter((r) => isRefund(r));

    const expectedCompleted = genuinePayments.filter((r) =>
      ["completed", "paid"].includes(String(r.status || "").toLowerCase().trim())
    );
    const expectedPending = genuinePayments.filter(
      (r) => String(r.status || "pending").toLowerCase().trim() === "pending"
    );
    const expectedFailed = genuinePayments.filter(
      (r) => String(r.status || "").toLowerCase().trim() === "failed"
    );
    const expectedRefunded = genuinePayments.filter(
      (r) => String(r.status || "").toLowerCase().trim() === "refunded"
    );

    const sum = (arr) => Math.round(arr.reduce((acc, x) => acc + (Number(x.amount) || 0), 0) * 100) / 100;
    const stats = apiSnapshot.data.stats;

    assert.strictEqual(stats.total_count, genuinePayments.length, "total_count mismatch with Airtable");
    assert.strictEqual(stats.completed_count, expectedCompleted.length, "completed_count mismatch with Airtable");
    assert.strictEqual(stats.total_collected, sum(expectedCompleted), "total_collected mismatch with Airtable");
    assert.strictEqual(stats.pending_count, expectedPending.length, "pending_count mismatch with Airtable");
    assert.strictEqual(stats.pending_amount, sum(expectedPending), "pending_amount mismatch with Airtable");
    assert.strictEqual(stats.failed_count, expectedFailed.length, "failed_count mismatch with Airtable");
    assert.strictEqual(stats.refunded_count, expectedRefunded.length, "refunded_count mismatch with Airtable");
    assert.ok(refundRows.length >= 1, "Linked refund record must exist in Airtable Payments");
    console.log(
      `PASS [12/12]: Admin KPIs match Airtable 100% (Total=${stats.total_count}, Collected=₱${stats.total_collected}, Pending=₱${stats.pending_amount} [${stats.pending_count}], Failed=${stats.failed_count}, Refunded=₱${stats.refunded_amount} [${stats.refunded_count}]).`
    );

    console.log("\n==============================================================");
    console.log("ALL 12 PAYMENT MODULE VERIFICATION TESTS PASSED! (12/12)");
    console.log("==============================================================");
  } finally {
    // Clean up ONLY temporary records created by this test run (preserve all existing data untouched)
    console.log("\n[Cleanup] Removing temporary test records created by this verification run...");
    for (const id of cleanup.OrderItems) await airtableDeleteRecord("OrderItems", id);
    for (const id of cleanup.Payments) await airtableDeleteRecord("Payments", id);
    for (const id of cleanup.Orders) await airtableDeleteRecord("Orders", id);
    for (const id of cleanup.Users) await airtableDeleteRecord("Users", id);
    console.log("[Cleanup] Complete. Existing Airtable data preserved intact.");
  }
}

runSuite().catch((err) => {
  console.error("\nTEST SUITE FAILED:", err);
  process.exit(1);
});
