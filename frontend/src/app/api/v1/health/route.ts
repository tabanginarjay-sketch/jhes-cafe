import { NextResponse } from "next/server";
import { airtableCheckHealth } from "@/lib/airtable";

export async function GET() {
  const dbHealth = await airtableCheckHealth();
  const rssBytes = typeof process.memoryUsage === "function" ? process.memoryUsage().rss : 0;
  const memoryRssMb = Math.round((rssBytes / (1024 * 1024)) * 10) / 10;
  const uptimeSeconds = typeof process.uptime === "function" ? Math.round(process.uptime()) : 0;

  return NextResponse.json(
    {
      status: dbHealth.status === "connected" ? "ok" : "degraded",
      service: "Jhe's Cafe' API",
      version: "1.0.0",
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "production",
      timestamp: new Date().toISOString(),
      database: {
        status: dbHealth.status,
        detail: dbHealth.detail,
        latency_ms: dbHealth.latency_ms,
      },
      system: {
        uptime_seconds: uptimeSeconds,
        memory_rss_mb: memoryRssMb,
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "production",
      },
      cache: {
        active_items: 0,
        hits: 0,
        misses: 0,
        total_queries: 0,
        hit_ratio_percent: 0,
        status: "direct_airtable_live",
      },
      rate_limiter: {
        active_tracked_ips: 0,
        total_throttled_requests: 0,
        status: "edge_protected",
      },
    },
    {
      headers: {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Cache-Control": "no-store",
      },
    }
  );
}
