/**
 * Shared server-side in-memory password verifier map for serverless runtime fallback
 * when Airtable Users table does not yet expose a `password_hash` text column.
 * Never accepts unverified passwords.
 */
const globalForCreds = globalThis as unknown as {
  __jhesPasswordStore?: Map<string, string>;
};

export const serverPasswordStore: Map<string, string> =
  globalForCreds.__jhesPasswordStore || (globalForCreds.__jhesPasswordStore = new Map<string, string>());
