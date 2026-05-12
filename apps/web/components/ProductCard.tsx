import Link from "next/link"
import { Product, formatPrice } from "@/lib/api"

type Props = { product: Product }

export function ProductCard({ product }: Props) {
  return (
    <article className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="mb-3 h-40 w-full object-cover rounded" />}
      <span className="text-xs font-mono text-slate-500">{product.sku}</span>
      <h3 className="mt-1 font-semibold">{product.name}</h3>
      {product.description ? <p className="mt-1 text-sm text-slate-600">{product.description}</p> : null}
      <div className="mt-4 flex items-end justify-between gap-2">
        <span className="text-lg font-semibold text-[var(--accent)]">{formatPrice(product.priceCents, product.currency)}</span>
        <span className="text-xs text-slate-500">Stock: {product.stock}</span>
      </div>
      <div className="mt-4 flex gap-2">
        <Link href={`/products/${product.id}`} className="ml-auto rounded bg-black px-3 py-1 text-white">View</Link>
      </div>
    </article>
  )
}

export default ProductCard
