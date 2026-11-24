"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { Plus, X, RefreshCw, Power } from "lucide-react";

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("barista");
  const [shift, setShift] = useState("Morning");
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadStaff = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      const res = await fetch(`${API_BASE_URL}/staff`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        setStaff(await res.json());
      } else {
        setFeedback("Failed to load staff roster from Airtable.");
      }
    } catch {
      setFeedback("Unable to connect to staff API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStaff();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;

    try {
      setSubmitting(true);
      setFeedback(null);
      const res = await fetch(`${API_BASE_URL}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          role,
          shift,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setStaff((prev) => [created, ...prev]);
        setIsModalOpen(false);
        setFullName("");
        setEmail("");
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback(err.detail || "Failed to add staff record.");
      }
    } catch {
      setFeedback("Error adding staff member.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (member: any) => {
    try {
      setBusyId(member.id);
      const nextActive = !(member.is_active !== false);
      const res = await fetch(`${API_BASE_URL}/staff/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_active: nextActive }),
      });
      if (res.ok) {
        const updated = await res.json();
        setStaff((prev) => prev.map((s) => (s.id === member.id ? updated : s)));
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Staff &amp; Barista Shifts</h1>
          <p className="text-xs text-[#573B2C] mt-1">
            Active Jhe&apos;s Cafe&apos; roster synchronized with Airtable Staff table ({staff.length} records).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadStaff()}
            className="p-2.5 rounded-full border border-[#E5DACB] bg-white text-[#173D2B] hover:bg-[#F5F0E7] transition-all cursor-pointer"
            title="Refresh Staff"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#C9AE8B]" />
            <span>Add Staff</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50 text-xs text-rose-900">
          {feedback}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#E5DACB] p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5DACB] pb-3">
              <h3 className="font-serif text-lg font-bold text-[#173D2B]">Add Barista / Staff Member</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#573B2C] hover:bg-[#F5F0E7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-4 text-xs">
              <div>
                <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Christian Dela Cruz"
                  className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] bg-[#FFFCF7]"
                />
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="christian@jhescafe.ph"
                  className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] bg-[#FFFCF7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] bg-[#FFFCF7]"
                  >
                    <option value="barista">Barista</option>
                    <option value="roaster">Roaster</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
                    Shift
                  </label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] bg-[#FFFCF7]"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Mid">Mid</option>
                    <option value="Closing">Closing</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E5DACB]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-[#E5DACB] text-[#573B2C] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white font-semibold cursor-pointer"
                >
                  {submitting ? "Saving..." : "Add to Roster"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-[#E5DACB] bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F0E7] text-[#573B2C] uppercase tracking-wider font-semibold border-b border-[#E5DACB]">
              <tr>
                <th className="p-4">Staff ID</th>
                <th className="p-4">Staff Member</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Shift</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DACB] text-[#173D2B]">
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-[#573B2C]">
                    {loading ? "Loading staff roster from Airtable..." : "No staff records found."}
                  </td>
                </tr>
              ) : (
                staff.map((s) => {
                  const active = s.is_active !== false;
                  return (
                    <tr key={s.id} className="hover:bg-[#F5F0E7]/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-[#173D2B]">
                        {s.staff_id || s.id}
                      </td>
                      <td className="p-4 font-bold">{s.full_name || s.name || "—"}</td>
                      <td className="p-4 text-[#573B2C] font-mono">{s.email}</td>
                      <td className="p-4 capitalize">{s.role}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#F5F0E7] text-[#573B2C] font-semibold text-[10px]">
                          {s.shift || "—"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            active
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-stone-100 text-stone-700"
                          }`}
                        >
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          disabled={busyId === s.id}
                          onClick={() => void handleToggleActive(s)}
                          className="p-1.5 rounded-lg border border-[#E5DACB] bg-[#FFFCF7] hover:bg-[#F5F0E7] text-[#173D2B] cursor-pointer"
                          title={active ? "Deactivate staff" : "Activate staff"}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
