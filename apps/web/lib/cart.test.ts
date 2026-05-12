/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { addItem, getCart, removeItem, updateQty } from "./cart"

const base = "http://localhost:8080"

describe("cart (authenticated)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", base)
    delete process.env.API_URL
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("getCart returns API cart when ok", async () => {
    const cart = { items: [], grandTotalCents: 0, currency: "THB" }
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(cart), { status: 200, headers: { "Content-Type": "application/json" } }),
    )
    await expect(getCart()).resolves.toEqual(cart)
    expect(fetch).toHaveBeenCalledWith(
      `${base}/v1/cart`,
      expect.objectContaining({ credentials: "include" }),
    )
  })

  it("addItem POSTs productId and qty", async () => {
    const cart = { items: [{ productId: "p1", name: "A", qty: 2, unitPriceCents: 100, lineTotalCents: 200 }], grandTotalCents: 200, currency: "THB" }
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(cart), { status: 200, headers: { "Content-Type": "application/json" } }),
    )
    await expect(addItem("p1", 2)).resolves.toEqual(cart)
    expect(fetch).toHaveBeenCalledWith(
      `${base}/v1/cart/items`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ productId: "p1", qty: 2 }),
      }),
    )
  })

  it("updateQty PATCHes qty", async () => {
    const cart = { items: [], grandTotalCents: 0, currency: "THB" }
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(cart), { status: 200, headers: { "Content-Type": "application/json" } }),
    )
    await updateQty("abc", 3)
    expect(fetch).toHaveBeenCalledWith(
      `${base}/v1/cart/items/abc`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ qty: 3 }),
      }),
    )
  })

  it("removeItem DELETEs line", async () => {
    const cart = { items: [], grandTotalCents: 0, currency: "THB" }
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(cart), { status: 200, headers: { "Content-Type": "application/json" } }),
    )
    await removeItem("x")
    expect(fetch).toHaveBeenCalledWith(`${base}/v1/cart/items/x`, expect.objectContaining({ method: "DELETE" }))
  })
})

describe("cart (guest, 401)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", base)
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("addItem stores guest line and builds cart from fetchProduct", async () => {
    const err = Object.assign(new Error("unauth"), { status: 401 })
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "unauthorized" } }), { status: 401 }))
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "p1",
            name: "Tote",
            priceCents: 1000,
            currency: "THB",
            sku: "s",
            stock: 9,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )

    const cart = await addItem("p1", 2)
    expect(cart.items).toHaveLength(1)
    expect(cart.items[0]).toMatchObject({
      productId: "p1",
      name: "Tote",
      qty: 2,
      unitPriceCents: 1000,
      lineTotalCents: 2000,
    })
    expect(cart.grandTotalCents).toBe(2000)
    const raw = localStorage.getItem("guest_cart")
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!)).toEqual([{ productId: "p1", qty: 2 }])
  })

  it("getCart on 401 returns guest cart from localStorage", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "unauthorized" } }), { status: 401 }))
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "p9",
            name: "X",
            priceCents: 50,
            currency: "THB",
            sku: "s",
            stock: 1,
          }),
          { status: 200 },
        ),
      )
    localStorage.setItem("guest_cart", JSON.stringify([{ productId: "p9", qty: 1 }]))
    const cart = await getCart()
    expect(cart.grandTotalCents).toBe(50)
    expect(cart.items[0]?.name).toBe("X")
  })
})
