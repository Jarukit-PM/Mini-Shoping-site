import { expect, test } from "@playwright/test"

test.describe("Catalog page", () => {
  test("shows the product list on home page", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("main")).toBeVisible()
    const cards = page.locator("[data-testid='product-card'], a[href^='/products/']")
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })
  })

  test("navigates to product detail from catalog", async ({ page }) => {
    await page.goto("/")
    const firstLink = page.locator("a[href^='/products/']").first()
    await firstLink.click()
    await expect(page).toHaveURL(/\/products\/[a-f0-9]+/)
    await expect(page.locator("main")).toBeVisible()
  })

  test("search filters products", async ({ page }) => {
    await page.goto("/")
    const searchInput = page.getByRole("searchbox").or(page.locator("input[type='search'], input[placeholder*='Search' i], input[placeholder*='ค้น' i]")).first()
    await searchInput.fill("Tote")
    await page.keyboard.press("Enter")
    await page.waitForTimeout(500)
    const cards = page.locator("a[href^='/products/']")
    await expect(cards.first()).toBeVisible({ timeout: 8_000 })
  })

  test("product detail page shows add-to-cart button", async ({ page }) => {
    await page.goto("/")
    const firstLink = page.locator("a[href^='/products/']").first()
    await firstLink.click()
    await expect(page).toHaveURL(/\/products\//)
    const addBtn = page.getByRole("button", { name: /add to cart|เพิ่ม/i })
    await expect(addBtn).toBeVisible({ timeout: 8_000 })
  })
})
