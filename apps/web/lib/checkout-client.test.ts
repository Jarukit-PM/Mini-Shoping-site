import { describe, expect, it } from "vitest"
import { parsePlaceOrderResult, postPlaceOrder } from "./checkout-client"

describe("parsePlaceOrderResult", () => {
  it("201 + orderId → created", () => {
    expect(parsePlaceOrderResult(201, { orderId: "abc123" })).toEqual({
      type: "created",
      orderId: "abc123",
    })
  })

  it("201 without orderId → error", () => {
    const r = parsePlaceOrderResult(201, {})
    expect(r.type).toBe("error")
    if (r.type === "error") expect(r.message).toBe("Checkout failed")
  })

  it("402 → payment_declined", () => {
    expect(parsePlaceOrderResult(402, { error: { message: "Card declined" } })).toEqual({
      type: "payment_declined",
      message: "Card declined",
    })
  })

  it("409 with details → out_of_stock message lists stock", () => {
    const r = parsePlaceOrderResult(409, {
      error: { details: ["Widget: need 5, have 1"], message: "x" },
    })
    expect(r).toEqual({
      type: "out_of_stock",
      redirectMessage: "Stock issue: Widget: need 5, have 1",
      details: ["Widget: need 5, have 1"],
    })
  })

  it("409 without details uses API message", () => {
    const r = parsePlaceOrderResult(409, { error: { message: "Conflict" } })
    expect(r.type).toBe("out_of_stock")
    if (r.type === "out_of_stock") expect(r.redirectMessage).toBe("Conflict")
  })

  it("400 empty_cart → empty_cart", () => {
    expect(parsePlaceOrderResult(400, { error: { code: "empty_cart" } })).toEqual({ type: "empty_cart" })
  })

  it("other status → error with message and details", () => {
    const r = parsePlaceOrderResult(500, { error: { message: "boom", details: ["a"] } })
    expect(r).toEqual({ type: "error", message: "boom", details: ["a"] })
  })
})

describe("postPlaceOrder", () => {
  it("POSTs JSON to /v1/orders", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const orig = globalThis.fetch
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init })
      return Promise.resolve(new Response("{}", { status: 400 }))
    }) as typeof fetch
    try {
      await postPlaceOrder(
        "http://api.test",
        { name: "n", line1: "1", city: "c", postal: "p", country: "TH" },
        { cardNumber: "4242", expiry: "12/30", cvv: "123" },
      )
      expect(calls[0]?.url).toBe("http://api.test/v1/orders")
      expect(String(calls[0]?.init?.body)).toContain("4242")
      expect(String(calls[0]?.init?.body)).toContain("shippingAddress")
      expect(calls[0]?.init?.method).toBe("POST")
      expect(calls[0]?.init?.credentials).toBe("include")
    } finally {
      globalThis.fetch = orig
    }
  })
})
