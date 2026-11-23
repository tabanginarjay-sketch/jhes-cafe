export default function AdminCategoriesPage() {
  const categories = [
    { name: "Signature Espresso", slug: "signature-espresso", count: 2, order: 1 },
    { name: "Cold Brews", slug: "cold-brews", count: 1, order: 2 },
    { name: "Warm Classics", slug: "warm-classics", count: 1, order: 3 },
    { name: "Artisanal Pastries", slug: "artisanal-pastries", count: 2, order: 4 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Category Management</h1>
        <p className="text-xs text-[#573B2C] mt-1">Organize storefront menu sections and sorting order.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {categories.map((c) => (
          <div key={c.slug} className="p-6 rounded-3xl border border-[#E5DACB] bg-white space-y-2 shadow-2xs">
            <span className="text-[10px] font-mono text-[#573B2C]">Sequence #{c.order}</span>
            <h3 className="font-serif text-xl font-bold text-[#173D2B]">{c.name}</h3>
            <p className="text-xs text-[#573B2C]">Slug: <code className="font-mono text-[#173D2B]">/{c.slug}</code> · {c.count} items</p>
          </div>
        ))}
      </div>
    </div>
  );
}
