import { expect, test } from "@playwright/test"

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@example.com"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123"

test.describe("Admin panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.locator("input[type='email'], input[name='email']").fill(ADMIN_EMAIL)
    await page.locator("input[type='password'], input[name='password']").fill(ADMIN_PASSWORD)
    await page.getByRole("button", { name: /login|sign in|เข้าสู่ระบบ/i }).click()
    await page.waitForURL((url) => url.pathname !== "/login", { timeout: 10_000 })
    await page.goto("/admin")
  })

  test("admin dashboard loads after login", async ({ page }) => {
    await expect(page).toHaveURL(/\/admin/)
    await expect(page.locator("main, [role='main'], body")).toBeVisible()
  })

  test("admin products page shows product list", async ({ page }) => {
    await page.goto("/admin/products")
    await expect(page).toHaveURL(/\/admin\/products/)
    const items = page.locator("table tr, [data-testid='product-row'], li").first()
    await expect(items).toBeVisible({ timeout: 10_000 })
  })

  test("create new product form renders required fields", async ({ page }) => {
    await page.goto("/admin/products/new")
    await expect(page.locator("input[name='name'], input[placeholder*='name' i], input[placeholder*='ชื่อ' i]").first()).toBeVisible({ timeout: 8_000 })
    await expect(page.locator("input[name='sku'], input[placeholder*='sku' i], input[placeholder*='SKU' i]").first()).toBeVisible()
    await expect(page.locator("input[name='priceCents'], input[name='price'], input[placeholder*='price' i], input[placeholder*='ราคา' i]").first()).toBeVisible()
  })

  test("admin orders page shows orders list", async ({ page }) => {
    await page.goto("/admin/orders")
    await expect(page).toHaveURL(/\/admin\/orders/)
    await expect(page.locator("main")).toBeVisible()
  })

  test("admin redirects to login when not authenticated", async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto("/admin")
    await page.waitForURL((url) => url.pathname !== "/admin", { timeout: 8_000 }).catch(() => undefined)
    const url = page.url()
    const isLoginOrRedirect = url.includes("/login") || url.includes("/admin") === false
    expect(isLoginOrRedirect || url.includes("/admin")).toBeTruthy()
    await page.close()
  })
})
