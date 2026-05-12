/** Admin create product: validation + POST /v1/admin/products. */

export type CreateProductPayload = {
  name: string
  description: string
  category: string
  imageUrl: string
  sku: string
  currency: string
  priceCents: number
  stock: number
}

export function validateNewProductForm(priceBaht: string, stock: string):
  | { ok: true; priceCents: number; stockNum: number }
  | { ok: false; fieldErrors: Record<string, string> } {
  const priceNum = Number(priceBaht)
  if (!Number.isFinite(priceNum) || priceNum <= 0) {
    return { ok: false, fieldErrors: { priceCents: "ราคาสินค้าต้องมากกว่า 0" } }
  }
  const priceCents = Math.round(priceNum * 100)
  const stockNum = Number.parseInt(stock, 10)
  if (!Number.isFinite(stockNum) || stockNum < 0) {
    return { ok: false, fieldErrors: { stock: "stock must be >= 0" } }
  }
  return { ok: true, priceCents, stockNum }
}

export async function postCreateAdminProduct(
  baseUrl: string,
  payload: CreateProductPayload,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${baseUrl}/v1/admin/products`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers as Record<string, string> | undefined) },
    body: JSON.stringify(payload),
    ...init,
  })
}

export type ParsedCreateProduct =
  | { type: "created" }
  | { type: "api_error"; fieldErrors: Record<string, string>; message: string | null }

export function parseCreateProductResult(status: number, body: unknown): ParsedCreateProduct {
  if (status === 201) return { type: "created" }

  const b = body as {
    error?: { code?: string; message?: string; fields?: Record<string, string> }
  }

  const fieldErrors = b?.error?.fields ?? {}
  if (Object.keys(fieldErrors).length > 0) {
    let message: string | null = null
    if (b?.error?.code === "invalid_price" || fieldErrors.priceCents) {
      message = fieldErrors.priceCents ?? b?.error?.message ?? "ราคาสินค้าต้องมากกว่า 0"
    } else {
      message = b?.error?.message ?? "Could not create product"
    }
    return { type: "api_error", fieldErrors, message }
  }

  return {
    type: "api_error",
    fieldErrors: {},
    message: b?.error?.message ?? "Could not create product",
  }
}
