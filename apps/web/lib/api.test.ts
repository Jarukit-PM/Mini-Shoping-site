import { afterEach, describe, expect, it, vi } from "vitest"
import { apiBaseUrl, fetchProduct, fetchProducts, formatPrice } from "./api"

describe("apiBaseUrl", () => {
  const orig = { api: process.env.API_URL, pub: process.env.NEXT_PUBLIC_API_URL }

  afterEach(() => {
    vi.unstubAllGlobals()
    if (orig.api === undefined) delete process.env.API_URL
    else process.env.API_URL = orig.api
    if (orig.pub === undefined) delete process.env.NEXT_PUBLIC_API_URL
    else process.env.NEXT_PUBLIC_API_URL = orig.pub
  })

  it("prefers API_URL over NEXT_PUBLIC_API_URL", () => {
    process.env.API_URL = "http://api:8080"
    process.env.NEXT_PUBLIC_API_URL = "http://ignored"
    expect(apiBaseUrl()).toBe("http://api:8080")
  })

  it("falls back to NEXT_PUBLIC_API_URL", () => {
    delete process.env.API_URL
    process.env.NEXT_PUBLIC_API_URL = "https://example.com"
    expect(apiBaseUrl()).toBe("https://example.com")
  })

  it("defaults to localhost:8080", () => {
    delete process.env.API_URL
    delete process.env.NEXT_PUBLIC_API_URL
    expect(apiBaseUrl()).toBe("http://localhost:8080")
  })

  it("in the browser ignores API_URL and uses NEXT_PUBLIC_API_URL", () => {
    vi.stubGlobal("window", {} as Window)
    process.env.API_URL = "https://api.onrender.com"
    process.env.NEXT_PUBLIC_API_URL = "https://public.onrender.com"
    expect(apiBaseUrl()).toBe("https://public.onrender.com")
  })
})

describe("formatPrice", () => {
  it("formats cents with Intl for known currency", () => {
    expect(formatPrice(12345, "THB")).toMatch(/123/)
    expect(formatPrice(100, "USD")).toMatch(/1/)
  })

  it("uses THB when currency is empty", () => {
    const s = formatPrice(50, "")
    expect(s).toBeTruthy()
  })

  it("falls back on invalid currency code", () => {
    const s = formatPrice(100, "NOT_A_CCY")
    expect(s).toContain("1.00")
    expect(s).toContain("NOT_A_CCY")
  })
})

describe("fetchProducts", () => {
  const orig = { api: process.env.API_URL, pub: process.env.NEXT_PUBLIC_API_URL }

  afterEach(() => {
    vi.restoreAllMocks()
    if (orig.api === undefined) delete process.env.API_URL
    else process.env.API_URL = orig.api
    if (orig.pub === undefined) delete process.env.NEXT_PUBLIC_API_URL
    else process.env.NEXT_PUBLIC_API_URL = orig.pub
  })

  it("builds query string and returns JSON", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://api.test"
    delete process.env.API_URL
    const body = { items: [], page: 1, pageSize: 20, total: 0 }
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }),
    )
    await expect(fetchProducts({ q: "bag", category: "Bags", page: 2, pageSize: 10 })).resolves.toEqual(body)
    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain("/v1/products")
    expect(url).toContain("q=bag")
    expect(url).toContain("category=Bags")
    expect(url).toContain("page=2")
    expect(url).toContain("pageSize=10")
  })

  it("throws on non-ok response", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://api.test"
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }))
    await expect(fetchProducts()).rejects.toThrow("fetchProducts 500")
  })
})

describe("fetchProduct", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("returns product JSON", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test")
    const p = { id: "x", name: "P", priceCents: 1, currency: "THB", sku: "s", stock: 1 }
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(p), { status: 200 }))
    await expect(fetchProduct("x")).resolves.toEqual(p)
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/v1/products/x", { cache: "no-store" })
  })

  it("throws not_found on 404", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test")
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 404 }))
    await expect(fetchProduct("missing")).rejects.toThrow("not_found")
  })
})
