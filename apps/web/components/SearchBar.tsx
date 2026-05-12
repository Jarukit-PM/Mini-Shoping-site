"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function SearchBar({ initialQ = "", initialCategory = "" }: { initialQ?: string; initialCategory?: string }) {
  const [q, setQ] = useState(initialQ)
  const [category, setCategory] = useState(initialCategory)
  const router = useRouter()

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (category) params.set("category", category)
    router.push(`/?${params.toString()}`)
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="flex-1 rounded border px-3 py-2" />
      <select value={category} onChange={e => setCategory(e.target.value)} className="rounded border px-2 py-2">
        <option value="">All</option>
        <option>Drinkware</option>
        <option>Bags</option>
        <option>Stationery</option>
      </select>
      <button type="submit" className="rounded bg-black px-3 py-2 text-white">Search</button>
    </form>
  )
}

export default SearchBar
