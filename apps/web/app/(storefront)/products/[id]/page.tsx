import { notFound } from "next/navigation";
import { fetchProduct } from "@/lib/api";
import { ProductDetailClient } from "./ProductDetailClient";

export const revalidate = 60;

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let product;
  try {
    product = await fetchProduct(id);
  } catch {
    // fetchProduct throws on 404 or network error
  }

  if (!product) notFound();

  return <ProductDetailClient key={product.id} product={product} />;
}
