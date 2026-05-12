import { fetchProducts } from "@/lib/api"
import { Pagination } from "@/components/Pagination"
import { ProductCard } from "@/components/ProductCard"
import { SearchBar } from "@/components/SearchBar"

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page ?? 1)
  const data = await fetchProducts({ q: params.q, category: params.category, page })

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <SearchBar initialQ={params.q ?? ""} initialCategory={params.category ?? ""} />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {data.items.map(p => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      <Pagination page={page} pageSize={data.pageSize} total={data.total} q={params.q} category={params.category} />
    </main>
  )
}
