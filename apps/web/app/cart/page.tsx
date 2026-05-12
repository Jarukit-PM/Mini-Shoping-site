"use client"
import { useEffect, useState } from "react"
import { getCart, updateQty, removeItem, type Cart } from "@/lib/cart"
import Link from "next/link"

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null)
  const [err, setErr] = useState<string>("")

  useEffect(() => {
    getCart()
      .then(setCart)
      .catch((e: unknown) => {
        setErr(e instanceof Error ? e.message : String(e))
      })
  }, [])
  if (err) return <p className="p-6 text-red-600">Error: {err}</p>
  if (!cart) return <p className="p-6">Loading…</p>
  if (cart.items.length === 0) return <p className="p-6">Your cart is empty.</p>

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Your Cart</h1>
      {cart.items.map(line => (
        <div key={line.productId} className="flex items-center gap-4 border-b pb-3">
          {line.imageUrl && <img src={line.imageUrl} className="w-20 h-20 rounded" alt={line.name} />}
          <div className="flex-1">
            <p>{line.name}</p>
            <p className="text-sm opacity-70">{(line.unitPriceCents / 100).toFixed(2)} × {line.qty} = {(line.lineTotalCents / 100).toFixed(2)}</p>
          </div>
          <input type="number" min={1} value={line.qty}
            onChange={async e => {
              try {
                setCart(await updateQty(line.productId, Number(e.target.value)))
              } catch (er: unknown) {
                setErr(er instanceof Error ? er.message : String(er))
              }
            }}
            className="w-20 border rounded p-1" />
          <button onClick={async () => setCart(await removeItem(line.productId))}>Remove</button>
        </div>
      ))}
      <div className="flex justify-between items-center pt-4">
        <p className="text-lg">Grand total: {(cart.grandTotalCents / 100).toFixed(2)} {cart.currency}</p>
        <Link href="/checkout" className="px-4 py-2 bg-black text-white rounded">Checkout</Link>
      </div>
    </main>
  )
}
