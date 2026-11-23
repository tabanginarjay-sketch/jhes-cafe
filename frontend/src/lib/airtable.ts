/**
 * Next.js server-side Airtable client.
 * Allows Vercel serverless deployment to communicate directly with Airtable cloud base.
 */

const AIRTABLE_PAT = process.env.AIRTABLE_PAT || "";
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "";

const AIRTABLE_API_URL = "https://api.airtable.com/v0";

const HEADERS = {
  Authorization: `Bearer ${AIRTABLE_PAT}`,
  "Content-Type": "application/json",
  Accept: "application/json",
};

export async function airtableList(tableName: string, filterByFormula?: string, noCache = false) {
  let url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${tableName}`;
  if (filterByFormula) {
    url += `?filterByFormula=${encodeURIComponent(filterByFormula)}`;
  }
  const fetchOptions: RequestInit = {
    headers: HEADERS,
    ...(noCache ? { cache: "no-store" } : { next: { revalidate: 30 } }),
  };
  const res = await fetch(url, fetchOptions);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Airtable error (${res.status}): ${errorText}`);
  }
  const data = await res.json();
  return (data.records || []).map((r: { id: string; fields: Record<string, unknown>; createdTime?: string }) => ({
    id: r.id,
    ...r.fields,
    created_at: r.createdTime,
  }));
}

export async function airtableGet(tableName: string, recordId: string) {
  const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${tableName}/${recordId}`;
  const res = await fetch(url, {
    headers: HEADERS,
    cache: "no-store",
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Airtable fetch record error (${res.status}): ${errorText}`);
  }
  const data = await res.json();
  return {
    id: data.id,
    ...data.fields,
    created_at: data.createdTime,
  };
}

export async function airtableCreate(tableName: string, fields: Record<string, unknown>) {
  const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${tableName}`;
  const res = await fetch(url, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ fields, typecast: true }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Airtable create error (${res.status}): ${errorText}`);
  }
  const data = await res.json();
  return {
    id: data.id,
    ...data.fields,
    created_at: data.createdTime,
  };
}

export async function airtableUpdate(tableName: string, recordId: string, fields: Record<string, unknown>) {
  const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${tableName}/${recordId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify({ fields, typecast: true }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Airtable update error (${res.status}): ${errorText}`);
  }
  const data = await res.json();
  return {
    id: data.id,
    ...data.fields,
    created_at: data.createdTime,
  };
}

export async function airtableDelete(tableName: string, recordId: string) {
  const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${tableName}/${recordId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: HEADERS,
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Airtable delete error (${res.status}): ${errorText}`);
  }
  return await res.json();
}

export async function airtableCheckHealth() {
  const start = Date.now();
  try {
    const records = await airtableList("tblcQD4QoANpq0ytK");
    const latency = Date.now() - start;
    return {
      status: "connected",
      detail: `Connected to Airtable base '${AIRTABLE_BASE_ID}'.`,
      latency_ms: latency,
      records_count: records.length,
    };
  } catch (err) {
    return {
      status: "unavailable",
      detail: err instanceof Error ? err.message : "Error connecting to Airtable",
      latency_ms: Date.now() - start,
    };
  }
}
