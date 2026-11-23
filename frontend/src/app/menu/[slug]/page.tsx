import { Suspense } from "react";
import ProductDetailClient from "./ProductDetailClient";

export function generateStaticParams() {
  return [
    { slug: "barako-espresso-romano" },
    { slug: "spanish-latte-dulce" },
    { slug: "tagaytay-cloud-coldbrew" },
    { slug: "salted-honey-latte" },
    { slug: "burnt-basque-cheesecake" },
    { slug: "rosemary-butter-croissant" },
  ];
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<div className="p-20 text-center text-xs">Loading reserve drink details...</div>}>
      <ProductDetailClient slug={slug} />
    </Suspense>
  );
}
