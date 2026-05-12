import { describe, expect, it } from "vitest"
import {
  parseCreateProductResult,
  postCreateAdminProduct,
  validateNewProductForm,
} from "./admin-product-client"

describe("validateNewProductForm", () => {
  it("accepts valid price and stock", () => {
    expect(validateNewProductForm("12.50", "3")).toEqual({
      ok: true,
      priceCents: 1250,
      stockNum: 3,
    })
  })

  it("rejects non-positive price", () => {
    const r = validateNewProductForm("0", "1")
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.fieldErrors.priceCents).toBeTruthy()
  })

  it("rejects negative stock", () => {
    const r = validateNewProductForm("10", "-1")
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.fieldErrors.stock).toContain(">=")
  })

  it("allows stock 0", () => {
    expect(validateNewProductForm("1", "0")).toEqual({ ok: true, priceCents: 100, stockNum: 0 })
  })
})

describe("parseCreateProductResult", () => {
  it("201 → created", () => {
    expect(parseCreateProductResult(201, {})).toEqual({ type: "created" })
  })

  it("maps field errors and invalid_price message", () => {
    const r = parseCreateProductResult(400, {
      error: {
        code: "invalid_price",
        fields: { priceCents: "bad" },
        message: "ignored when field set",
      },
    })
    expect(r).toEqual({
      type: "api_error",
      fieldErrors: { priceCents: "bad" },
      message: "bad",
    })
  })

  it("field errors without price use generic message", () => {
    const r = parseCreateProductResult(400, {
      error: { fields: { sku: "taken" }, message: "SKU in use" },
    })
    expect(r).toEqual({
      type: "api_error",
      fieldErrors: { sku: "taken" },
      message: "SKU in use",
    })
  })

  it("no fields falls back to error message", () => {
    expect(parseCreateProductResult(403, { error: { message: "Forbidden" } })).toEqual({
      type: "api_error",
      fieldErrors: {},
      message: "Forbidden",
    })
  })
})

describe("postCreateAdminProduct", () => {
  it("POSTs JSON payload", async () => {
    let url = ""
    let init: RequestInit | undefined
    const orig = globalThis.fetch
    globalThis.fetch = (input: RequestInfo | URL, i?: RequestInit) => {
      url = String(input)
      init = i
      return Promise.resolve(new Response("{}", { status: 201 }))
    }
    try {
      await postCreateAdminProduct("http://api.test", {
        name: "N",
        description: "",
        category: "c",
        imageUrl: "https://x",
        sku: "SKU",
        currency: "THB",
        priceCents: 100,
        stock: 2,
      })
      expect(url).toBe("http://api.test/v1/admin/products")
      expect(init?.method).toBe("POST")
      expect(String(init?.body)).toContain("SKU")
    } finally {
      globalThis.fetch = orig
    }
  })
})
