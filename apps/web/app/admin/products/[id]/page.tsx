import Link from "next/link";
import { notFound } from "next/navigation";
import { authedFetch } from "@/lib/api-server";
import { EditProductForm } from "./ui";

type Product = {
  id: string;
  name: string;
  description?: string;
  sku: string;
  priceCents: number;
  currency: string;
  stock: number;
  category?: string;
  imageUrl?: string;
};

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await authedFetch(`/v1/admin/products/${id}`);
  if (res.status === 404) notFound();
  if (!res.ok) {
    return <p className="text-sm text-red-600">Could not load product.</p>;
  }
  const product = (await res.json()) as Product;

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Edit product</h1>
        <Link className="text-sm text-[var(--accent)] hover:underline" href="/admin/products">
          Back
        </Link>
      </div>
      <EditProductForm product={product} />
    </div>
  );
}
