import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { deleteProduct, listAllProducts, saveProduct } from "./admin-products"
import type { AdminProduct } from "./admin-products"

const base = "http://localhost:8080"

const product: AdminProduct = {
  id: "p1",
  name: "Tote Bag",
  sku: "TOTE-01",
  priceCents: 1000,
  currency: "THB",
  stock: 5,
  tone: 1,
}

describe("listAllProducts", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", base)
    delete process.env.API_URL
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("returns products with a tone value on success", async () => {
    const items = [{ id: "p1", name: "Tote", sku: "TOTE", priceCents: 1000, currency: "THB", stock: 5 }]
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ items }), { status: 200 }),
    )
    const result = await listAllProducts()
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: "p1", name: "Tote" })
    expect([1, 2, 3, 4, 5]).toContain(result[0]?.tone)
  })

  it("requests /v1/products?pageSize=200 with credentials and no-store cache", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), { status: 200 }),
    )
    await listAllProducts()
    expect(fetch).toHaveBeenCalledWith(
      `${base}/v1/products?pageSize=200`,
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    )
  })

  it("returns [] on non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 401 }))
    await expect(listAllProducts()).resolves.toEqual([])
  })

  it("returns [] on network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"))
    await expect(listAllProducts()).resolves.toEqual([])
  })
})

describe("saveProduct", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", base)
    delete process.env.API_URL
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("returns ok:true on 200", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(product), { status: 200 }),
    )
    await expect(saveProduct(product)).resolves.toEqual({ ok: true })
  })

  it("PATCHes /v1/admin/products/{id} with credentials", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(product), { status: 200 }),
    )
    await saveProduct(product)
    expect(fetch).toHaveBeenCalledWith(
      `${base}/v1/admin/products/p1`,
      expect.objectContaining({ method: "PATCH", credentials: "include" }),
    )
  })

  it("returns ok:false with API error message on failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "SKU already exists" } }), { status: 409 }),
    )
    const r = await saveProduct(product)
    expect(r).toEqual({ ok: false, error: "SKU already exists" })
  })

  it("returns ok:false with fallback message when body has no error message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 500 }))
    const r = await saveProduct(product)
    expect(r.ok).toBe(false)
    expect(r.error).toBe("Update failed")
  })

  it("returns ok:false Network error on exception", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"))
    await expect(saveProduct(product)).resolves.toEqual({ ok: false, error: "Network error" })
  })
})

describe("deleteProduct", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", base)
    delete process.env.API_URL
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("returns true on 204", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }))
    await expect(deleteProduct("p1")).resolves.toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      `${base}/v1/admin/products/p1`,
      expect.objectContaining({ method: "DELETE", credentials: "include" }),
    )
  })

  it("returns false on 404", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 404 }))
    await expect(deleteProduct("missing")).resolves.toBe(false)
  })

  it("returns false on network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"))
    await expect(deleteProduct("x")).resolves.toBe(false)
  })
})
