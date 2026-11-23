"use client";

import { HealthStatusCard } from "@/components/HealthStatusCard";
import { API_BASE_URL } from "@/lib/api";
import { ShieldCheck, Server, Database, Lock } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#173D2B]">System Architecture &amp; Settings</h1>
        <p className="text-xs text-[#573B2C] mt-1">
          Production telemetry, 5-pillar architecture diagnostics, and configured environment variables.
        </p>
      </div>

      {/* Live 5-Pillar Architecture Status Monitor */}
      <HealthStatusCard />

      <div className="rounded-3xl border border-[#E5DACB] bg-white p-8 space-y-6 shadow-2xs">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-[#173D2B]" />
          <h3 className="font-serif text-xl font-bold text-[#173D2B]">Environment Configuration</h3>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
              Airtable Base ID
            </label>
            <input
              disabled
              type="text"
              value="appggtW264wuDdGKl"
              className="w-full rounded-xl border border-[#E5DACB] bg-[#F5F0E7] p-3 text-xs font-mono text-[#173D2B]"
            />
          </div>

          <div>
            <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
              Active API Endpoint Base
            </label>
            <input
              disabled
              type="text"
              value={API_BASE_URL}
              className="w-full rounded-xl border border-[#E5DACB] bg-[#F5F0E7] p-3 text-xs font-mono text-[#173D2B]"
            />
          </div>

          <div>
            <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
              Cloud Database Provider
            </label>
            <input
              disabled
              type="text"
              value="Airtable Cloud REST API v0 (Tables: Products, Orders, OrderItems, Inventory, Users, Staff, Payments)"
              className="w-full rounded-xl border border-[#E5DACB] bg-[#F5F0E7] p-3 text-xs font-mono text-[#173D2B]"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-[#E5DACB] flex items-center justify-between text-xs text-[#573B2C]">
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-800" />
            <span>Security: Personal Access Token protected server-side</span>
          </span>
          <span className="font-bold text-emerald-800">Status: Protected</span>
        </div>
      </div>
    </div>
  );
}
