import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getOrder, getOrders, STATUS_FLOW, STATUS_ORDER } from "./orders"

const base = "http://localhost:8080"

describe("STATUS constants", () => {
  it("STATUS_ORDER lists active statuses in flow order", () => {
    expect(STATUS_ORDER).toEqual(["Pending", "Paid", "Shipped", "Delivered"])
  })

  it("STATUS_FLOW maps each status to next", () => {
    expect(STATUS_FLOW.Pending).toBe("Paid")
    expect(STATUS_FLOW.Paid).toBe("Shipped")
    expect(STATUS_FLOW.Shipped).toBe("Delivered")
    expect(STATUS_FLOW.Delivered).toBeNull()
    expect(STATUS_FLOW.Cancelled).toBeNull()
  })
})

describe("getOrders", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_URL", base))
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("returns items array on success", async () => {
    const items = [{ id: "o1", status: "Pending", createdAt: "2024-01-01", grandTotalCents: 500 }]
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ items }), { status: 200 }),
    )
    await expect(getOrders()).resolves.toEqual(items)
    expect(fetch).toHaveBeenCalledWith(
      `${base}/v1/orders`,
      expect.objectContaining({ credentials: "include" }),
    )
  })

  it("returns [] on non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 401 }))
    await expect(getOrders()).resolves.toEqual([])
  })

  it("returns [] on network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"))
    await expect(getOrders()).resolves.toEqual([])
  })
})

describe("getOrder", () => {
  const apiOrder = {
    id: "ord1",
    userId: "u1",
    lineItems: [
      { productId: "p1", name: "Tote", qty: 2, priceCentsSnapshot: 1000, lineTotalCents: 2000 },
    ],
    totals: { subtotalCents: 2000, shippingCents: 0, grandTotalCents: 2000 },
    shippingAddress: { name: "Alice", line1: "123 Main", city: "BKK", postal: "10000", country: "TH" },
    status: "Pending",
    paymentRef: "stub_abc",
    createdAt: "2024-01-01T00:00:00Z",
  }

  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_URL", base))
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("maps API response fields correctly", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(apiOrder), { status: 200 }),
    )
    const order = await getOrder("ord1")
    expect(order).toMatchObject({
      id: "ord1",
      userId: "u1",
      subtotalCents: 2000,
      shippingCents: 0,
      grandTotalCents: 2000,
      status: "Pending",
      paymentRef: "stub_abc",
    })
  })

  it("maps priceCentsSnapshot → priceCents on each line item", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(apiOrder), { status: 200 }),
    )
    const order = await getOrder("ord1")
    expect(order?.lineItems[0]).toMatchObject({
      productId: "p1",
      name: "Tote",
      qty: 2,
      priceCents: 1000,
      lineTotalCents: 2000,
    })
  })

  it("calls the correct URL with credentials", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(apiOrder), { status: 200 }),
    )
    await getOrder("ord1")
    expect(fetch).toHaveBeenCalledWith(
      `${base}/v1/orders/ord1`,
      expect.objectContaining({ credentials: "include" }),
    )
  })

  it("returns null on non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 404 }))
    await expect(getOrder("missing")).resolves.toBeNull()
  })

  it("returns null on network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"))
    await expect(getOrder("x")).resolves.toBeNull()
  })
})
