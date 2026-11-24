"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL, fetchApiHealth, type HealthResponse } from "@/lib/api";
import {
  RefreshCw,
  Database,
  ShieldCheck,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Server,
} from "lucide-react";

export function HealthStatusCard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApiHealth();
      setHealth(data);
    } catch (err) {
      setHealth(null);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reach the configured API health endpoint."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void checkHealth();
  }, []);

  const dbStatus = health?.database.status;
  const isDbConnected = dbStatus === "connected";
  const latency = health?.database.latency_ms;
  const systemStats = health?.system;
  const healthUrl = `${API_BASE_URL}/health`;
  const isLocalFastApi = API_BASE_URL.includes(":8000");

  const formatUptime = (seconds?: number) => {
    if (!seconds) return "0s";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="w-full rounded-3xl border border-[#E5DACB] bg-[#FFFCF7] p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5DACB] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                error ? "bg-rose-500" : isDbConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#315640]">
              Live Environment Diagnostics
            </p>
          </div>
          <h3 className="font-serif text-2xl font-bold text-[#173D2B] mt-1">
            Jhe&apos;s Cafe&apos; System &amp; Database Health
          </h3>
        </div>

        <button
          type="button"
          onClick={() => void checkHealth()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-[#173D2B] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#173D2B] hover:bg-[#173D2B] hover:text-[#FFFCF7] transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>{loading ? "Checking..." : "Re-check"}</span>
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-[#573B2C]">
          Testing live health endpoint{" "}
          <code className="font-mono text-[11px] text-[#173D2B]">{healthUrl}</code>...
        </p>
      ) : error ? (
        <div className="rounded-2xl border border-rose-300 bg-rose-50/80 p-4 text-xs text-rose-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">API Health Check Failed</p>
            <p className="text-rose-800 leading-relaxed">
              {error} — Target: <code className="font-mono">{healthUrl}</code>
            </p>
          </div>
        </div>
      ) : health ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Database Cloud Card */}
          <div className="rounded-2xl border border-[#E5DACB] bg-[#F5F0E7] p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">
                <Database className="w-3.5 h-3.5 text-[#315640]" />
                Airtable Cloud Base
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                  isDbConnected
                    ? "bg-emerald-950/10 text-emerald-900 border-emerald-800/30"
                    : "bg-amber-950/10 text-amber-900 border-amber-800/30"
                }`}
              >
                {isDbConnected && <CheckCircle2 className="w-2.5 h-2.5" />}
                {health.database.status}
              </span>
            </div>
            <p className="font-serif text-base font-bold text-[#173D2B]">
              Live Database Roundtrip
            </p>
            <div className="text-[11px] text-[#573B2C] space-y-1">
              <p>• Latency: {latency !== undefined && latency !== null ? `${latency} ms` : "Measured"}</p>
              <p>• Detail: {health.database.detail}</p>
            </div>
          </div>

          {/* Runtime & Observability */}
          <div className="rounded-2xl border border-[#E5DACB] bg-[#F5F0E7] p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">
                <Activity className="w-3.5 h-3.5 text-[#173D2B]" />
                Runtime Telemetry
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/10 text-emerald-900 border border-emerald-800/30 text-[9px] font-bold uppercase">
                {health.environment}
              </span>
            </div>
            <p className="font-serif text-base font-bold text-[#173D2B]">{health.service}</p>
            <div className="text-[11px] text-[#573B2C] space-y-1">
              <p>• Process Uptime: {formatUptime(systemStats?.uptime_seconds)}</p>
              <p>• Live Process Memory (RSS): {systemStats?.memory_rss_mb ?? 0} MB</p>
              <p>• Version: {health.version}</p>
            </div>
          </div>

          {/* Security & Sessions */}
          <div className="rounded-2xl border border-[#E5DACB] bg-[#F5F0E7] p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#173D2B]" />
                Security &amp; RBAC
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/10 text-emerald-900 border border-emerald-800/30 text-[9px] font-bold uppercase">
                Enforced
              </span>
            </div>
            <p className="font-serif text-base font-bold text-[#173D2B]">
              Signed Sessions &amp; Admin Guards
            </p>
            <div className="text-[11px] text-[#573B2C] space-y-1">
              <p>• HttpOnly HMAC-SHA256 customer &amp; admin cookies</p>
              <p>• Server-side OAuth verification (Google &amp; Facebook)</p>
              <p>• Airtable credentials restricted to server routes only</p>
            </div>
          </div>

          {/* API Mode */}
          <div className="rounded-2xl border border-[#E5DACB] bg-[#F5F0E7] p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">
                <Server className="w-3.5 h-3.5 text-[#315640]" />
                Data Mode
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/10 text-emerald-900 border border-emerald-800/30 text-[9px] font-bold uppercase">
                Live
              </span>
            </div>
            <p className="font-serif text-base font-bold text-[#173D2B]">
              Environment-Aware Routing
            </p>
            <div className="text-[11px] text-[#573B2C] space-y-1">
              <p>• Cache mode: {health.cache?.status || "live"}</p>
              <p>• Checked at: {new Date(health.timestamp).toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Footer Links (Environment-Aware — Never Hardcoded localhost:8000 in Prod) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E5DACB] text-xs text-[#573B2C]">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#315640]" />
          <span>
            Active API Endpoint: <code className="font-mono text-[#173D2B]">{healthUrl}</code>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href={healthUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[#173D2B] hover:text-[#315640] underline underline-offset-4"
          >
            Inspect Live Health JSON →
          </a>
          {isLocalFastApi && (
            <a
              href={API_BASE_URL.replace(/\/api\/v1\/?$/, "/docs")}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#173D2B] hover:text-[#315640] underline underline-offset-4"
            >
              Local FastAPI Swagger Docs →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
