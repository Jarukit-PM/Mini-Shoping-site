import Link from "next/link"
import Image from "next/image"
import { Product, formatPrice } from "@/lib/api"

type Props = { product: Product }

export function ProductCard({ product }: Props) {
  return (
    <article className="flex flex-col h-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      {product.imageUrl && (
        <Image src={product.imageUrl} alt={product.name} width={400} height={160} className="mb-3 h-40 w-full object-cover rounded" />
      )}
      <span className="text-xs font-mono text-slate-500">{product.sku}</span>
      <h3 className="mt-1 mb-2 font-semibold">{product.name}</h3>
      
      <div className="flex-grow">
        {product.description && <p className="mt-2 text-sm text-slate-600 line-clamp-2">{product.description}</p>}
      </div>

      <div className="mt-6 flex items-end justify-between gap-2 border-t pt-4">
        <span className="text-lg font-semibold text-[var(--accent)]">{formatPrice(product.priceCents, product.currency)}</span>
        <span className="text-xs text-slate-500">Stock: {product.stock}</span>
      </div>
      
      <div className="mt-4 flex gap-2">
        <Link href={`/products/${product.id}`} className="w-full text-center rounded bg-black px-3 py-2 text-white">View Product</Link>
      </div>
    </article>
  )
}

export default ProductCard
