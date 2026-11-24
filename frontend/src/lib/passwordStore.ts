import { airtableCreate, airtableList, airtableUpdate } from "@/lib/airtable";
import { escapeFormulaString } from "@/lib/serverAuth";

/**
 * Durable server-side salted password hash store backed by Airtable with warm-instance caching.
 * Stores ONLY salted scrypt hashes — never plaintext passwords — and is strictly filtered out
 * of all Payments, Loyalty, and Customer API responses.
 */
const globalForCreds = globalThis as unknown as {
  __jhesPasswordStore?: Map<string, string>;
};

export const serverPasswordStore: Map<string, string> =
  globalForCreds.__jhesPasswordStore || (globalForCreds.__jhesPasswordStore = new Map<string, string>());

export async function savePersistentPasswordHash(
  customerId: string,
  email: string,
  hash: string
): Promise<void> {
  const cleanEmail = email.toLowerCase().trim();
  serverPasswordStore.set(cleanEmail, hash);

  if (!customerId || !customerId.startsWith("rec")) return;

  const safeId = escapeFormulaString(customerId);
  const credRef = `AUTH-CRED-${customerId}`;

  try {
    const existing = await airtableList(
      "Payments",
      `AND({provider} = 'auth_credential', {order_id} = '${safeId}')`,
      true
    );

    if (existing.length > 0) {
      await airtableUpdate("Payments", existing[0].id, {
        transaction_id: hash,
      });
    } else {
      await airtableCreate("Payments", {
        payment_ref: credRef,
        order_id: customerId,
        order_number: "AUTH-CREDENTIAL",
        amount: 0,
        provider: "auth_credential",
        status: "completed",
        transaction_id: hash,
      });
    }
  } catch (err) {
    console.warn("Persistent credential store warning:", err);
  }
}

export async function getPersistentPasswordHash(
  customerId: string,
  email: string,
  userRecordHash?: string | null
): Promise<string | null> {
  if (userRecordHash && String(userRecordHash).trim().length > 0) {
    return String(userRecordHash).trim();
  }

  const cleanEmail = email.toLowerCase().trim();
  const cached = serverPasswordStore.get(cleanEmail);
  if (cached) return cached;

  if (!customerId || !customerId.startsWith("rec")) return null;

  const safeId = escapeFormulaString(customerId);
  try {
    const matches = await airtableList(
      "Payments",
      `AND({provider} = 'auth_credential', {order_id} = '${safeId}')`,
      true
    );
    if (matches.length > 0) {
      const hash = String((matches[0] as any).transaction_id || "").trim();
      if (hash) {
        serverPasswordStore.set(cleanEmail, hash);
        return hash;
      }
    }
  } catch {
    // Non-blocking fallback
  }

  return null;
}
