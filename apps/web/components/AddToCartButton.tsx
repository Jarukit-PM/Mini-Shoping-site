"use client"
import { useState } from "react"
import Link from "next/link"
import { addItem } from "@/lib/cart"

export default function AddToCartButton({ productId, maxStock }: { productId: string; maxStock: number }) {
  const [qty, setQty] = useState(1)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)

  type ErrorEnvelope = {
    error?: {
      code?: string
      details?: { available?: number }
    }
  }

  type ApiError = Error & { body?: ErrorEnvelope; status?: number }

  const onAdd = async () => {
    setErr(null)
    setLoading(true)
    try {
      await addItem(productId, qty)
      setAdded(true)
    } catch (e: unknown) {
      const apiErr = e as Partial<ApiError>
      if (apiErr.body?.error?.code === "out_of_stock") {
        const avail = apiErr.body?.error?.details?.available
        setErr(avail ? `Only ${avail} left` : "Out of stock")
      } else {
        setErr(e instanceof Error ? e.message : String(e))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <input type="number" min={1} max={maxStock} value={qty} onChange={e => setQty(Number(e.target.value) || 1)} className="w-20 rounded border px-2 py-1" />
        <button onClick={onAdd} disabled={loading} className="rounded bg-[var(--accent)] px-3 py-1 text-white">{loading ? 'Adding…' : 'Add to cart'}</button>
      </div>
      {err ? (
        <p className="mt-2 text-sm text-red-600">{err}</p>
      ) : null}
      {added ? (
        <Link href="/cart" className="mt-2 inline-block rounded border border-[var(--accent)] px-3 py-1 text-sm text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white">
          View cart
        </Link>
      ) : null}
    </div>
  )
}
