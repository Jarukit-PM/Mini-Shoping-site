import { describe, expect, it, vi } from "vitest"
import { resolveMeAfterRegister, type Me } from "./auth-session"

describe("resolveMeAfterRegister", () => {
  it("returns profile from 201 JSON when complete", async () => {
    const body: Me = { id: "507f1f77bcf86cd799439011", email: "a@b.com", role: "customer" }
    const res = new Response(JSON.stringify(body), { status: 201 })
    const fetchMe = vi.fn()
    await expect(resolveMeAfterRegister(res, fetchMe)).resolves.toEqual(body)
    expect(fetchMe).not.toHaveBeenCalled()
  })

  it("calls fetchMe when 201 JSON is incomplete", async () => {
    const res = new Response(JSON.stringify({ id: "x" }), { status: 201 })
    const fallback: Me = { id: "507f1f77bcf86cd799439011", email: "x@y.com", role: "customer" }
    const fetchMe = vi.fn().mockResolvedValue(fallback)
    await expect(resolveMeAfterRegister(res, fetchMe)).resolves.toEqual(fallback)
    expect(fetchMe).toHaveBeenCalledOnce()
  })

  it("calls fetchMe on 204", async () => {
    const res = new Response(null, { status: 204 })
    const me: Me = { id: "507f1f77bcf86cd799439012", email: "z@z.com", role: "customer" }
    const fetchMe = vi.fn().mockResolvedValue(me)
    await expect(resolveMeAfterRegister(res, fetchMe)).resolves.toEqual(me)
    expect(fetchMe).toHaveBeenCalledOnce()
  })

  it("returns null for other status", async () => {
    const res = new Response(null, { status: 409 })
    const fetchMe = vi.fn()
    await expect(resolveMeAfterRegister(res, fetchMe)).resolves.toBeNull()
    expect(fetchMe).not.toHaveBeenCalled()
  })
})
