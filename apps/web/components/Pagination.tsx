import Link from "next/link"

type Props = {
  page: number
  pageSize: number
  total: number
  q?: string
  category?: string
}

export function Pagination({ page, pageSize, total, q, category }: Props) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  function href(p: number) {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (category) params.set("category", category)
    params.set("page", String(p))
    return `/?${params.toString()}`
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={href(page - 1)} className="px-3 py-1 border rounded hover:bg-[var(--card)]">
          Prev
        </Link>
      ) : (
        <span className="px-3 py-1 border rounded opacity-30 cursor-not-allowed">Prev</span>
      )}

      <span className="text-sm opacity-70">
        Page {page} of {totalPages}
      </span>

      {page < totalPages ? (
        <Link href={href(page + 1)} className="px-3 py-1 border rounded hover:bg-[var(--card)]">
          Next
        </Link>
      ) : (
        <span className="px-3 py-1 border rounded opacity-30 cursor-not-allowed">Next</span>
      )}
    </div>
  )
}
