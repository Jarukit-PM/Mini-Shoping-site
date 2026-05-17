import { expect, test } from "@playwright/test"

const TEST_EMAIL = `checkout_${Date.now()}@test.local`
const TEST_PASSWORD = "TestPass123!"

const shippingAddress = {
  name: "Alice Test",
  line1: "123 Sukhumvit Road",
  city: "Bangkok",
  postal: "10110",
  country: "TH",
}

test.describe("Checkout flow (authenticated)", () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto("/register")
    await page.locator("input[type='email'], input[name='email']").fill(TEST_EMAIL)
    await page.locator("input[type='password'], input[name='password']").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: /register|sign up|สมัคร/i }).click()
    await page.waitForURL((url) => !url.pathname.startsWith("/register"), { timeout: 10_000 })
    await page.close()
  })

  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.locator("input[type='email'], input[name='email']").fill(TEST_EMAIL)
    await page.locator("input[type='password'], input[name='password']").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: /login|sign in|เข้าสู่ระบบ/i }).click()
    await page.waitForURL("/", { timeout: 10_000 })
  })

  test("checkout page renders shipping address step", async ({ page }) => {
    await page.goto("/")
    const firstProduct = page.locator("a[href^='/products/']").first()
    await firstProduct.click()
    await page.getByRole("button", { name: /add to cart|เพิ่ม/i }).click()
    await page.waitForTimeout(500)

    await page.goto("/checkout")
    const nameInput = page.locator("input[name='name'], input[placeholder*='name' i], input[placeholder*='ชื่อ' i]").first()
    await expect(nameInput).toBeVisible({ timeout: 8_000 })
  })

  test("full checkout with test card succeeds", async ({ page }) => {
    await page.goto("/")
    const firstProduct = page.locator("a[href^='/products/']").first()
    await firstProduct.click()
    await page.getByRole("button", { name: /add to cart|เพิ่ม/i }).click()
    await page.waitForTimeout(500)

    await page.goto("/checkout")

    const nameInput = page.locator("input[name='name'], input[placeholder*='name' i], input[placeholder*='ชื่อ' i]").first()
    await nameInput.fill(shippingAddress.name)

    await page.locator("input[name='line1'], input[placeholder*='address' i], input[placeholder*='ที่อยู่' i]").first().fill(shippingAddress.line1)
    await page.locator("input[name='city'], input[placeholder*='city' i], input[placeholder*='เมือง' i]").first().fill(shippingAddress.city)
    await page.locator("input[name='postal'], input[placeholder*='postal' i], input[placeholder*='รหัสไปรษณีย์' i]").first().fill(shippingAddress.postal)

    const countryInput = page.locator("input[name='country'], select[name='country']").first()
    const tag = await countryInput.evaluate((el) => el.tagName.toLowerCase())
    if (tag === "select") {
      await countryInput.selectOption(shippingAddress.country)
    } else {
      await countryInput.fill(shippingAddress.country)
    }

    const nextBtn = page.getByRole("button", { name: /next|continue|ถัดไป/i })
    if (await nextBtn.isVisible()) {
      await nextBtn.click()
      await page.waitForTimeout(500)
    }

    const cardInput = page.locator("input[name='cardNumber'], input[placeholder*='card' i], input[placeholder*='บัตร' i]").first()
    await expect(cardInput).toBeVisible({ timeout: 8_000 })
    await cardInput.fill("4242 4242 4242 4242")

    const expiryInput = page.locator("input[name='expiry'], input[placeholder*='expiry' i], input[placeholder*='MM' i]").first()
    if (await expiryInput.isVisible()) await expiryInput.fill("12/30")

    const cvvInput = page.locator("input[name='cvv'], input[placeholder*='CVV' i], input[placeholder*='CVC' i]").first()
    if (await cvvInput.isVisible()) await cvvInput.fill("123")

    const placeOrderBtn = page.getByRole("button", { name: /place order|pay|confirm|สั่งซื้อ/i })
    await placeOrderBtn.click()

    await expect(page).toHaveURL(/\/checkout\/success\//, { timeout: 15_000 })
  })

  test("declined card shows payment error message", async ({ page }) => {
    await page.goto("/")
    const firstProduct = page.locator("a[href^='/products/']").first()
    await firstProduct.click()
    await page.getByRole("button", { name: /add to cart|เพิ่ม/i }).click()
    await page.waitForTimeout(500)

    await page.goto("/checkout")

    await page.locator("input[name='name'], input[placeholder*='name' i], input[placeholder*='ชื่อ' i]").first().fill(shippingAddress.name)
    await page.locator("input[name='line1'], input[placeholder*='address' i], input[placeholder*='ที่อยู่' i]").first().fill(shippingAddress.line1)
    await page.locator("input[name='city'], input[placeholder*='city' i], input[placeholder*='เมือง' i]").first().fill(shippingAddress.city)
    await page.locator("input[name='postal'], input[placeholder*='postal' i], input[placeholder*='รหัสไปรษณีย์' i]").first().fill(shippingAddress.postal)
    await page.locator("input[name='country'], select[name='country']").first().fill(shippingAddress.country).catch(() => undefined)

    const nextBtn = page.getByRole("button", { name: /next|continue|ถัดไป/i })
    if (await nextBtn.isVisible()) await nextBtn.click()

    await page.locator("input[name='cardNumber'], input[placeholder*='card' i], input[placeholder*='บัตร' i]").first().fill("4000000000000002")
    const expiryInput = page.locator("input[name='expiry'], input[placeholder*='MM' i]").first()
    if (await expiryInput.isVisible()) await expiryInput.fill("12/30")
    const cvvInput = page.locator("input[name='cvv'], input[placeholder*='CVV' i]").first()
    if (await cvvInput.isVisible()) await cvvInput.fill("123")

    await page.getByRole("button", { name: /place order|pay|confirm|สั่งซื้อ/i }).click()
    await page.waitForTimeout(3_000)

    expect(page.url()).not.toContain("/checkout/success")
  })
})
