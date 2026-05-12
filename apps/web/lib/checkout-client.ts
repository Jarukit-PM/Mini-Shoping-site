/** Client-side checkout → POST /v1/orders (used by checkout page and tests). */

export type ShippingAddressInput = {
  name: string
  line1: string
  city: string
  postal: string
  country: string
}

export type PaymentInput = {
  cardNumber: string
  expiry: string
  cvv: string
}

export async function postPlaceOrder(
  baseUrl: string,
  shippingAddress: ShippingAddressInput,
  payment: PaymentInput,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${baseUrl}/v1/orders`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers as Record<string, string> | undefined) },
    body: JSON.stringify({ shippingAddress, payment }),
    ...init,
  })
}

export type ParsedPlaceOrder =
  | { type: "created"; orderId: string }
  | { type: "payment_declined"; message: string }
  | { type: "out_of_stock"; redirectMessage: string; details: string[] }
  | { type: "empty_cart" }
  | { type: "error"; message: string; details: string[] | null }

/** Maps API status + JSON body to a result the UI can branch on (mirrors checkout page behavior). */
export function parsePlaceOrderResult(status: number, body: unknown): ParsedPlaceOrder {
  const b = body as {
    orderId?: string
    error?: { code?: string; message?: string; details?: string[] }
  } | null

  if (status === 201 && b?.orderId) {
    return { type: "created", orderId: b.orderId }
  }
  if (status === 402) {
    return { type: "payment_declined", message: b?.error?.message ?? "Payment was declined" }
  }
  if (status === 409) {
    const d = b?.error?.details ?? []
    const redirectMessage =
      d.length > 0 ? `Stock issue: ${d.join("; ")}` : b?.error?.message ?? "Not enough stock"
    return { type: "out_of_stock", redirectMessage, details: d }
  }
  if (status === 400 && b?.error?.code === "empty_cart") {
    return { type: "empty_cart" }
  }
  return {
    type: "error",
    message: b?.error?.message ?? "Checkout failed",
    details: b?.error?.details ?? null,
  }
}
