import { expect, test } from "@playwright/test"

test.describe("Cart (guest user)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.evaluate(() => localStorage.clear())
  })

  test("adding a product shows cart count badge in top bar", async ({ page }) => {
    await page.goto("/")
    const firstProduct = page.locator("a[href^='/products/']").first()
    await firstProduct.click()
    await expect(page).toHaveURL(/\/products\//)

    const addBtn = page.getByRole("button", { name: /add to cart|เพิ่ม/i })
    await addBtn.click()

    const cartBadge = page.locator("[data-testid='cart-count'], [aria-label*='cart' i] span, header span").first()
    await expect(cartBadge).toBeVisible({ timeout: 5_000 })
  })

  test("cart page shows added item", async ({ page }) => {
    await page.goto("/")
    const firstProduct = page.locator("a[href^='/products/']").first()
    await firstProduct.click()

    const addBtn = page.getByRole("button", { name: /add to cart|เพิ่ม/i })
    await addBtn.click()
    await page.waitForTimeout(500)

    await page.goto("/cart")
    const lineItem = page.locator("li, [data-testid='cart-line']").first()
    await expect(lineItem).toBeVisible({ timeout: 8_000 })
  })

  test("cart page checkout button navigates to /checkout", async ({ page }) => {
    await page.goto("/")
    const firstProduct = page.locator("a[href^='/products/']").first()
    await firstProduct.click()
    await page.getByRole("button", { name: /add to cart|เพิ่ม/i }).click()
    await page.waitForTimeout(500)

    await page.goto("/cart")
    const checkoutBtn = page.getByRole("link", { name: /checkout|ชำระเงิน/i }).or(
      page.getByRole("button", { name: /checkout|ชำระเงิน/i }),
    )
    await checkoutBtn.click()
    await expect(page).toHaveURL(/\/checkout/, { timeout: 8_000 })
  })
})
