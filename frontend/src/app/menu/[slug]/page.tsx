import { Suspense } from "react";
import ProductDetailClient from "./ProductDetailClient";

export function generateStaticParams() {
  return [
    { slug: "barako-espresso-romano" },
    { slug: "spanish-latte-dulce" },
    { slug: "iced-brown-sugar-shaken-espresso" },
    { slug: "single-origin-affogato-al-caffe" },
    { slug: "tagaytay-cloud-coldbrew" },
    { slug: "kyoto-drip-slow-pour-cold-brew" },
    { slug: "salted-honey-latte" },
    { slug: "tagaytay-tablea-mocha" },
    { slug: "highland-uji-matcha-latte" },
    { slug: "glazed-heritage-doughnut" },
    { slug: "dark-cacao-ganache-brioche-doughnut" },
    { slug: "burnt-basque-cheesecake" },
    { slug: "rosemary-butter-croissant" },
    { slug: "strawberry-pistachio-croissant" },
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
