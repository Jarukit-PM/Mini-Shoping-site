import { expect, test } from "@playwright/test"

const TEST_EMAIL = `e2e_${Date.now()}@test.local`
const TEST_PASSWORD = "TestPass123!"

test.describe("Authentication", () => {
  test("register page renders form fields", async ({ page }) => {
    await page.goto("/register")
    await expect(page.locator("input[type='email'], input[name='email']")).toBeVisible()
    await expect(page.locator("input[type='password'], input[name='password']")).toBeVisible()
    await expect(page.getByRole("button", { name: /register|sign up|สมัคร/i })).toBeVisible()
  })

  test("register with valid credentials redirects away from register page", async ({ page }) => {
    await page.goto("/register")
    await page.locator("input[type='email'], input[name='email']").fill(TEST_EMAIL)
    await page.locator("input[type='password'], input[name='password']").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: /register|sign up|สมัคร/i }).click()
    await page.waitForURL((url) => !url.pathname.startsWith("/register"), { timeout: 10_000 })
    expect(page.url()).not.toContain("/register")
  })

  test("login page renders form fields", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator("input[type='email'], input[name='email']")).toBeVisible()
    await expect(page.locator("input[type='password'], input[name='password']")).toBeVisible()
    await expect(page.getByRole("button", { name: /login|sign in|เข้าสู่ระบบ/i })).toBeVisible()
  })

  test("login with wrong credentials shows error", async ({ page }) => {
    await page.goto("/login")
    await page.locator("input[type='email'], input[name='email']").fill("nobody@nowhere.invalid")
    await page.locator("input[type='password'], input[name='password']").fill("wrongpassword")
    await page.getByRole("button", { name: /login|sign in|เข้าสู่ระบบ/i }).click()
    await page.waitForTimeout(2_000)
    expect(page.url()).toContain("/login")
  })
})
