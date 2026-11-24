"use client";

import { HealthStatusCard } from "@/components/HealthStatusCard";
import { API_BASE_URL } from "@/lib/api";
import { BRAND_CONFIG } from "@/lib/brandConfig";
import { Server, Lock, Store } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#173D2B]">System Architecture &amp; Settings</h1>
        <p className="text-xs text-[#573B2C] mt-1">
          Live health diagnostics, environment-based API routing, and Jhe&apos;s Cafe&apos; business profile.
        </p>
      </div>

      {/* Live Environment Diagnostics Monitor */}
      <HealthStatusCard />

      {/* Business Profile (Portfolio Demo) */}
      <div className="rounded-3xl border border-[#E5DACB] bg-white p-8 space-y-5 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-[#173D2B]" />
            <h3 className="font-serif text-xl font-bold text-[#173D2B]">Business Profile</h3>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#F5F0E7] text-[#315640] border border-[#E5DACB]">
            {BRAND_CONFIG.demoBadge}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[#F5F0E7]/70 border border-[#E5DACB]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C] block">Official Brand</span>
            <span className="font-serif font-bold text-[#173D2B] text-sm">{BRAND_CONFIG.name}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#F5F0E7]/70 border border-[#E5DACB]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C] block">Contact Email (Demo)</span>
            <span className="font-mono text-[#173D2B]">{BRAND_CONFIG.contact.email}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#F5F0E7]/70 border border-[#E5DACB]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C] block">Operating Hours</span>
            <span className="text-[#173D2B]">{BRAND_CONFIG.hours.compactLabel}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#F5F0E7]/70 border border-[#E5DACB]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C] block">Demo Location</span>
            <span className="text-[#173D2B]">{BRAND_CONFIG.location.shortAddress}</span>
          </div>
        </div>
      </div>

      {/* Environment Configuration */}
      <div className="rounded-3xl border border-[#E5DACB] bg-white p-8 space-y-6 shadow-2xs">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-[#173D2B]" />
          <h3 className="font-serif text-xl font-bold text-[#173D2B]">Runtime Environment Configuration</h3>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
              Active API Endpoint Base (Environment-Aware)
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
              Connected Airtable Tables
            </label>
            <input
              disabled
              type="text"
              value="Product, Category, Orders, OrderItems, Inventory, Users, Staff, Payments"
              className="w-full rounded-xl border border-[#E5DACB] bg-[#F5F0E7] p-3 text-xs font-mono text-[#173D2B]"
            />
          </div>

          <div>
            <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
              Reservations Storage Mode
            </label>
            <input
              disabled
              type="text"
              value="Auto-detects Airtable Reservations table; transparently uses demo_memory if table not yet added in Airtable"
              className="w-full rounded-xl border border-[#E5DACB] bg-[#F5F0E7] p-3 text-xs font-mono text-[#173D2B]"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-[#E5DACB] flex items-center justify-between text-xs text-[#573B2C]">
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-800" />
            <span>Airtable PAT, OAuth secrets &amp; session keys are strictly server-side</span>
          </span>
          <span className="font-bold text-emerald-800">Status: Protected</span>
        </div>
      </div>
    </div>
  );
}
