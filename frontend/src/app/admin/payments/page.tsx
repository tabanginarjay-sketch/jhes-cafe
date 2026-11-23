export default function AdminPaymentsPage() {
  const payments = [
    { ref: "PAY-2026-0001", order: "ORD-1001", amount: 440, provider: "GCash", status: "Completed", date: "Nov 23, 2026, 8:43 AM" },
    { ref: "PAY-2026-0002", order: "ORD-0982", amount: 350, provider: "Maya", status: "Completed", date: "Nov 21, 2026, 4:12 PM" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Payment Transactions</h1>
        <p className="text-xs text-[#573B2C] mt-1">GCash, Maya, Card, and Cash reconciliation logs.</p>
      </div>

      <div className="rounded-3xl border border-[#E5DACB] bg-white overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F5F0E7] text-[#573B2C] uppercase tracking-wider font-semibold border-b border-[#E5DACB]">
            <tr>
              <th className="p-4">Payment Ref</th>
              <th className="p-4">Order Code</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Gateway</th>
              <th className="p-4">Timestamp</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5DACB] text-[#173D2B]">
            {payments.map((p) => (
              <tr key={p.ref} className="hover:bg-[#F5F0E7]/40">
                <td className="p-4 font-mono font-bold">{p.ref}</td>
                <td className="p-4 font-mono">{p.order}</td>
                <td className="p-4 font-mono font-bold text-sm">₱{p.amount}</td>
                <td className="p-4 font-semibold">{p.provider}</td>
                <td className="p-4 text-[#573B2C]">{p.date}</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold uppercase text-[10px]">
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
