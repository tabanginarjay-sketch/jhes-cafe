export default function AdminCustomersPage() {
  const customers = [
    { name: "Juan Ramos", email: "juan@example.com", phone: "+63 917 123 4567", role: "Customer", points: 320 },
    { name: "Maria Santos", email: "maria@example.com", phone: "+63 918 987 6543", role: "VIP Reserve", points: 840 },
    { name: "Patricia Valdez", email: "patricia@example.com", phone: "+63 917 892 4110", role: "Customer", points: 150 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Customer Directory</h1>
        <p className="text-xs text-[#573B2C] mt-1">Loyalty points, purchase frequency, and membership tiers.</p>
      </div>

      <div className="rounded-3xl border border-[#E5DACB] bg-white overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F5F0E7] text-[#573B2C] uppercase tracking-wider font-semibold border-b border-[#E5DACB]">
            <tr>
              <th className="p-4">Customer</th>
              <th className="p-4">Email</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Membership</th>
              <th className="p-4">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5DACB] text-[#173D2B]">
            {customers.map((c) => (
              <tr key={c.email} className="hover:bg-[#F5F0E7]/40">
                <td className="p-4 font-bold">{c.name}</td>
                <td className="p-4">{c.email}</td>
                <td className="p-4 font-mono">{c.phone}</td>
                <td className="p-4">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#173D2B] text-white text-[10px] font-semibold">
                    {c.role}
                  </span>
                </td>
                <td className="p-4 font-mono font-bold">{c.points} pts</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
