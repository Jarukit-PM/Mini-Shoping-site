import Image from "next/image"
import { fetchProduct, formatPrice } from "@/lib/api"
import AddToCartButton from "@/components/AddToCartButton"
import { notFound } from "next/navigation"

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  let p
  try {
    const { id } = await params
    p = await fetchProduct(id)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "not_found") notFound()
    throw error
  }

  return (
    <main className="p-6 max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
      {p.imageUrl && (
        <Image
          src={p.imageUrl}
          alt={p.name}
          width={800}
          height={600}
          className="rounded-lg object-cover"
        />
      )}
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">{p.name}</h1>
        <p className="text-xl">{formatPrice(p.priceCents, p.currency)}</p>
        <p className="text-sm opacity-80">{p.description}</p>
        <p className="text-xs opacity-60">In stock: {p.stock}</p>
        <AddToCartButton productId={p.id} maxStock={p.stock} />
      </div>
    </main>
  )
}
