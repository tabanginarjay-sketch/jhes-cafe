import { BarChart3, TrendingUp, DollarSign } from "lucide-react";

export default function AdminReportsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Sales &amp; Analytics Reports</h1>
        <p className="text-xs text-[#573B2C] mt-1">Daily cups brewed, average order value, and top performing roasts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl border border-[#E5DACB] bg-white space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">Weekly Revenue</span>
          <p className="font-serif text-3xl font-bold text-[#173D2B]">₱104,250</p>
          <span className="text-xs text-emerald-800 font-semibold">+14.2% vs last week</span>
        </div>

        <div className="p-6 rounded-3xl border border-[#E5DACB] bg-white space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">Average Cup Ticket</span>
          <p className="font-serif text-3xl font-bold text-[#173D2B]">₱235.00</p>
          <span className="text-xs text-[#573B2C]">Driven by plant milk add-ons</span>
        </div>

        <div className="p-6 rounded-3xl border border-[#E5DACB] bg-white space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">Top Selling Drink</span>
          <p className="font-serif text-2xl font-bold text-[#173D2B]">Spanish Latte</p>
          <span className="text-xs text-[#573B2C]">142 cups sold this week</span>
        </div>
      </div>

      <div className="p-8 rounded-3xl border border-[#E5DACB] bg-white space-y-4">
        <h3 className="font-serif text-xl font-bold text-[#173D2B]">Roast Extraction Distribution</h3>
        <div className="space-y-3 text-xs">
          {[
            { name: "Signature Espresso Blends", pct: "52%" },
            { name: "Cold Brew Slow Drip", pct: "26%" },
            { name: "Warm Classics & Teas", pct: "14%" },
            { name: "Artisanal Pastries & Viennoiserie", pct: "8%" },
          ].map((r) => (
            <div key={r.name} className="space-y-1">
              <div className="flex justify-between font-medium text-[#173D2B]">
                <span>{r.name}</span>
                <span className="font-bold">{r.pct}</span>
              </div>
              <div className="h-2 rounded-full bg-[#F5F0E7] overflow-hidden">
                <div className="h-full bg-[#173D2B] rounded-full" style={{ width: r.pct }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
