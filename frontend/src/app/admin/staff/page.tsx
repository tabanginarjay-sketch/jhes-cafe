"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { BadgeCheck, Plus, X, RefreshCw } from "lucide-react";

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Barista");
  const [shift, setShift] = useState("Morning (6:00 AM - 2:00 PM)");
  const [submitting, setSubmitting] = useState(false);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/staff`, { cache: "no-store" });
      if (res.ok) setStaff(await res.json());
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStaff();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role,
          shift,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setStaff((prev) => [created, ...prev]);
        setIsModalOpen(false);
        setName("");
        setEmail("");
      } else {
        alert("Failed to add staff record.");
      }
    } catch {
      alert("Error adding barista staff.");
    } finally {
      setSubmitting(false);
    }
  };

  const staffList = staff.length > 0 ? staff : [
    { id: "BARISTA-01", name: "Jherald Ramos", email: "jhe@brewandco.ph", role: "Manager", shift: "Morning (6:00 AM - 2:00 PM)", status: "Active" },
    { id: "BARISTA-02", name: "Carlo Dizon", email: "carlo@brewandco.ph", role: "Senior Barista", shift: "Closing (2:00 PM - 10:00 PM)", status: "Active" },
    { id: "BARISTA-03", name: "Ana Reyes", email: "ana@brewandco.ph", role: "Barista", shift: "Mid (10:00 AM - 6:00 PM)", status: "Active" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Staff &amp; Barista Shifts</h1>
          <p className="text-xs text-[#573B2C] mt-1">
            Active espresso bar roster and schedule synchronized with Airtable Staff table.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadStaff}
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
            <span>Add Barista</span>
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#E5DACB] p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5DACB] pb-3">
              <h3 className="font-serif text-lg font-bold text-[#173D2B]">Add Barista Staff</h3>
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Christian Dela Cruz"
                  className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden"
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
                  placeholder="christian@brewandco.ph"
                  className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden"
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
                    className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden"
                  >
                    <option value="Senior Barista">Senior Barista</option>
                    <option value="Barista">Barista</option>
                    <option value="Roaster">Roaster</option>
                    <option value="Shift Supervisor">Shift Supervisor</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
                    Shift
                  </label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden"
                  >
                    <option value="Morning (6:00 AM - 2:00 PM)">Morning</option>
                    <option value="Mid (10:00 AM - 6:00 PM)">Mid</option>
                    <option value="Closing (2:00 PM - 10:00 PM)">Closing</option>
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
                <th className="p-4">Badge / ID</th>
                <th className="p-4">Staff Member</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Assigned Shift</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DACB] text-[#173D2B]">
              {staffList.map((s) => (
                <tr key={s.id || s.email} className="hover:bg-[#F5F0E7]/40 transition-colors">
                  <td className="p-4 font-mono font-bold text-[#173D2B]">{s.id || "BARISTA"}</td>
                  <td className="p-4 font-bold">{s.name}</td>
                  <td className="p-4 text-[#573B2C] font-mono">{s.email}</td>
                  <td className="p-4">{s.role}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#F5F0E7] text-[#573B2C] font-semibold text-[10px]">
                      {s.shift}
                    </span>
                  </td>
                  <td className="p-4 text-emerald-800 font-bold uppercase text-[10px]">
                    {s.status || "Active"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
