export default function AdminStaffPage() {
  const staff = [
    { id: "BARISTA-01", name: "Jhe Ramos", email: "jhe@brewandco.ph", role: "Manager", shift: "Morning", status: "Active" },
    { id: "BARISTA-02", name: "Carlo Dizon", email: "carlo@brewandco.ph", role: "Senior Barista", shift: "Closing", status: "Active" },
    { id: "BARISTA-03", name: "Ana Reyes", email: "ana@brewandco.ph", role: "Barista", shift: "Mid", status: "Active" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Staff &amp; Barista Shifts</h1>
        <p className="text-xs text-[#573B2C] mt-1">Active espresso bar staff schedule and roles.</p>
      </div>

      <div className="rounded-3xl border border-[#E5DACB] bg-white overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F5F0E7] text-[#573B2C] uppercase tracking-wider font-semibold border-b border-[#E5DACB]">
            <tr>
              <th className="p-4">Badge ID</th>
              <th className="p-4">Name</th>
              <th className="p-4">Role</th>
              <th className="p-4">Shift</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5DACB] text-[#173D2B]">
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-[#F5F0E7]/40">
                <td className="p-4 font-mono font-bold text-[#173D2B]">{s.id}</td>
                <td className="p-4 font-medium">{s.name}</td>
                <td className="p-4">{s.role}</td>
                <td className="p-4">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#F5F0E7] text-[#573B2C] font-semibold text-[10px]">
                    {s.shift}
                  </span>
                </td>
                <td className="p-4 text-emerald-800 font-bold uppercase text-[10px]">
                  {s.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
