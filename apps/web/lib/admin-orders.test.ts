import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { advanceOrderStatus, getAdminOrder, getAdminOrders } from "./admin-orders"

const base = "http://localhost:8080"

describe("getAdminOrders", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", base)
    delete process.env.API_URL
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("returns items on success", async () => {
    const items = [{ id: "o1", userId: "u1", status: "Pending", createdAt: "2024-01-01", grandTotalCents: 1000 }]
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ items }), { status: 200 }),
    )
    await expect(getAdminOrders()).resolves.toEqual(items)
    expect(fetch).toHaveBeenCalledWith(
      `${base}/v1/admin/orders`,
      expect.objectContaining({ credentials: "include" }),
    )
  })

  it("returns [] on non-ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 403 }))
    await expect(getAdminOrders()).resolves.toEqual([])
  })

  it("returns [] on network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"))
    await expect(getAdminOrders()).resolves.toEqual([])
  })
})

describe("getAdminOrder", () => {
  const apiOrder = {
    id: "ord1",
    userId: "u1",
    lineItems: [
      { productId: "p1", name: "Bottle", qty: 1, priceCentsSnapshot: 500, lineTotalCents: 500 },
    ],
    totals: { subtotalCents: 500, shippingCents: 0, grandTotalCents: 500 },
    shippingAddress: { name: "Bob", line1: "1 Street", city: "BKK", postal: "10000", country: "TH" },
    status: "Paid",
    paymentRef: "stub_xyz",
    createdAt: "2024-02-01T00:00:00Z",
  }

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", base)
    delete process.env.API_URL
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("maps API fields correctly", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(apiOrder), { status: 200 }),
    )
    const order = await getAdminOrder("ord1")
    expect(order).toMatchObject({
      id: "ord1",
      userId: "u1",
      subtotalCents: 500,
      shippingCents: 0,
      grandTotalCents: 500,
      status: "Paid",
      paymentRef: "stub_xyz",
    })
  })

  it("maps priceCentsSnapshot → priceCents on line items", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(apiOrder), { status: 200 }),
    )
    const order = await getAdminOrder("ord1")
    expect(order?.lineItems[0]).toMatchObject({ priceCents: 500, name: "Bottle", qty: 1 })
  })

  it("calls correct URL with credentials", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(apiOrder), { status: 200 }),
    )
    await getAdminOrder("ord1")
    expect(fetch).toHaveBeenCalledWith(
      `${base}/v1/admin/orders/ord1`,
      expect.objectContaining({ credentials: "include" }),
    )
  })

  it("returns null on non-ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 403 }))
    await expect(getAdminOrder("x")).resolves.toBeNull()
  })

  it("returns null on network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"))
    await expect(getAdminOrder("x")).resolves.toBeNull()
  })
})

describe("advanceOrderStatus", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", base)
    delete process.env.API_URL
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("returns true on 200 and PATCHes correct endpoint with status body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }))
    await expect(advanceOrderStatus("ord1", "Paid")).resolves.toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      `${base}/v1/admin/orders/ord1/status`,
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({ status: "Paid" }),
      }),
    )
  })

  it("returns false on non-ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 400 }))
    await expect(advanceOrderStatus("ord1", "Shipped")).resolves.toBe(false)
  })

  it("returns false on network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"))
    await expect(advanceOrderStatus("ord1", "Shipped")).resolves.toBe(false)
  })
})
