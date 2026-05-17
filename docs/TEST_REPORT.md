# Test Automation Report — Mini Shopping Site

> All commands are run **inside the Dev Container** (VS Code → Reopen in Container).  
> Workspace root: `/workspaces/Mini-Shoping-site`

---

## 1. Summary

| Layer | Framework | Tests Before | Tests Added | Total |
|-------|-----------|:---:|:---:|:---:|
| Frontend unit (lib/) | Vitest | 5 files | **3 files** | **8 files** |
| Backend unit (Go) | go test | 9 files | **1 file** | **10 files** |
| E2E (full-stack) | Playwright | 0 files | **5 files** | **5 files** |

---

## 2. How to Run Tests

### 2.1 Frontend Unit Tests (Vitest)

```bash
cd /workspaces/Mini-Shoping-site/apps/web

# Run all tests once (CI mode)
npm test

# Watch mode (re-runs on save)
npm run test:watch
```

**Expected output:**
```
✓ lib/api.test.ts
✓ lib/cart.test.ts
✓ lib/auth-session.test.ts
✓ lib/admin-product-client.test.ts
✓ lib/checkout-client.test.ts
✓ lib/orders.test.ts          ← new
✓ lib/admin-products.test.ts  ← new
✓ lib/admin-orders.test.ts    ← new
```

### 2.2 Backend Unit Tests (Go)

```bash
cd /workspaces/Mini-Shoping-site/services/api

# Run all unit tests (no MongoDB needed)
go test ./...

# Run a specific package
go test ./internal/catalog/...
go test ./internal/auth/...

# Verbose output
go test -v ./...

# Run integration tests (requires MongoDB via devcontainer)
go test -tags integration ./...
```

### 2.3 E2E Tests (Playwright)

Playwright requires the **full stack running** (web + API + MongoDB).

**Step 1 — Install Playwright (once, inside the container):**
```bash
cd /workspaces/Mini-Shoping-site/apps/web
npm install           # installs @playwright/test
npx playwright install chromium   # downloads browser
```

**Step 2 — Start the full stack:**
```bash
# Terminal 1: Start the API
cd /workspaces/Mini-Shoping-site/services/api
go run ./cmd/server

# Terminal 2: Start the web app
cd /workspaces/Mini-Shoping-site/apps/web
npm run dev
```

**Step 3 — Run E2E tests:**
```bash
cd /workspaces/Mini-Shoping-site/apps/web

# Run all E2E tests
npm run test:e2e

# Run with interactive UI
npm run test:e2e:ui

# Run a specific spec file
npx playwright test e2e/catalog.spec.ts

# Run with admin credentials from env
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=your_pass npx playwright test
```

---

## 3. What Was Tested — Before This Report

### Frontend (Vitest) — Pre-existing

| File | What it tests |
|------|--------------|
| `lib/api.test.ts` | `apiBaseUrl()` env priority; `fetchProducts()` URL building & 404 handling; `formatPrice()` / `formatPriceUSD()` output |
| `lib/cart.test.ts` | Authenticated cart CRUD (GET/POST/PATCH/DELETE); Guest fallback when API returns 401 (localStorage persistence, cart rebuilt from product fetches) |
| `lib/auth-session.test.ts` | `resolveMeAfterRegister()` with 201 body, 204 no-content, and `fetchMe()` fallback |
| `lib/admin-product-client.test.ts` | `validateNewProductForm()` price/stock rules; `parseCreateProductResult()` field error mapping; `postCreateAdminProduct()` POST shape |
| `lib/checkout-client.test.ts` | `parsePlaceOrderResult()` for all status codes (201, 402, 409, 400, 500); `postPlaceOrder()` request body shape |

### Backend (Go) — Pre-existing

| File | What it tests |
|------|--------------|
| `internal/auth/password_test.go` | `HashPassword()` produces non-empty hash; `ComparePassword()` correct match and mismatch; invalid hash returns error |
| `internal/auth/register_test.go` | Registration validation logic |
| `internal/auth/bootstrap_test.go` | `EnsureBootstrapAdmin()` and `SyncAdminPasswordFromEnv()` behavior |
| `internal/auth/register_integration_test.go` | Full registration against real MongoDB |
| `internal/authstub/authstub_test.go` | Auth stub correctness |
| `internal/httpx/json_test.go` | `WriteError()`, `WriteJSON()`, `WriteErrorFields()` response shapes |
| `internal/order/order_test.go` | `ShippingFlatCents()` env parsing; `activeProductFilter()` bson structure (order package) |
| `internal/order/service_test.go` | Service-level tests for PlaceOrder flow |
| `internal/payment/stub_test.go` | `Charge()` with 4242 card (succeed), 4000000000000002 (decline), empty card (error) |

---

## 4. What Was Added — This Report

### 4.1 Frontend: `lib/orders.test.ts` (NEW)

**File:** `apps/web/lib/orders.test.ts`

| Test | Description |
|------|-------------|
| STATUS_ORDER array | Confirms `["Pending","Paid","Shipped","Delivered"]` order |
| STATUS_FLOW mapping | Each status maps to next; Delivered and Cancelled map to null |
| `getOrders()` success | Returns items array; calls `/v1/orders` with `credentials: "include"` |
| `getOrders()` non-ok | Returns `[]` on 401/403 |
| `getOrders()` network error | Returns `[]` on exception |
| `getOrder(id)` field mapping | `totals.subtotalCents/shippingCents/grandTotalCents` extracted correctly |
| `getOrder(id)` line item | `priceCentsSnapshot` mapped to `priceCents` |
| `getOrder(id)` correct URL | Calls `/v1/orders/{id}` |
| `getOrder(id)` non-ok | Returns `null` on 404 |
| `getOrder(id)` network error | Returns `null` on exception |

**Why this matters:** The `apiOrderToOrder()` field mapping (especially `priceCentsSnapshot → priceCents`) is a silent conversion that could silently break if the API field name changes. These tests catch that regression.

---

### 4.2 Frontend: `lib/admin-products.test.ts` (NEW)

**File:** `apps/web/lib/admin-products.test.ts`

| Test | Description |
|------|-------------|
| `listAllProducts()` success | Returns products; each has a tone 1–5 from `productTone()` |
| `listAllProducts()` request | Calls `?pageSize=200` with `credentials: "include"` and `cache: "no-store"` |
| `listAllProducts()` non-ok | Returns `[]` |
| `listAllProducts()` network error | Returns `[]` |
| `saveProduct()` success | Returns `{ ok: true }` on 200 |
| `saveProduct()` correct method | PATCHes `/v1/admin/products/{id}` with credentials |
| `saveProduct()` API error | Returns `{ ok: false, error: "<API message>" }` on 409 |
| `saveProduct()` empty error body | Falls back to `"Update failed"` |
| `saveProduct()` network error | Returns `{ ok: false, error: "Network error" }` |
| `deleteProduct()` success | Returns `true` on 204; DELETEs correct URL |
| `deleteProduct()` non-ok | Returns `false` on 404 |
| `deleteProduct()` network error | Returns `false` on exception |

---

### 4.3 Frontend: `lib/admin-orders.test.ts` (NEW)

**File:** `apps/web/lib/admin-orders.test.ts`

| Test | Description |
|------|-------------|
| `getAdminOrders()` success | Returns items; calls `/v1/admin/orders` with credentials |
| `getAdminOrders()` non-ok | Returns `[]` on 403 |
| `getAdminOrders()` network error | Returns `[]` |
| `getAdminOrder(id)` field mapping | `totals` object extracted; `priceCentsSnapshot → priceCents` per line |
| `getAdminOrder(id)` correct URL | Calls `/v1/admin/orders/{id}` with credentials |
| `getAdminOrder(id)` non-ok | Returns `null` on 403 |
| `getAdminOrder(id)` network error | Returns `null` |
| `advanceOrderStatus()` success | Returns `true`; PATCHes `/v1/admin/orders/{id}/status` with `{ status }` body |
| `advanceOrderStatus()` non-ok | Returns `false` on 400 |
| `advanceOrderStatus()` network error | Returns `false` |

---

### 4.4 Backend Go: `internal/catalog/catalog_test.go` (NEW)

**File:** `services/api/internal/catalog/catalog_test.go`

| Test | Description |
|------|-------------|
| `TestAtoiOr` | Empty string → default; valid integer → parsed; negative number → parsed; invalid string → default; `"0"` → 0 (not default) |
| `TestActiveProductFilter` | Result has correct `_id`; `$or` has exactly 2 clauses both checking `deletedAt` |
| `TestValidateAdminProductCreate` | Valid body → no errors; missing name → `"name"` error; missing SKU → `"sku"` error; both missing → both errors; whitespace-only name/SKU treated as empty |
| `TestProductToJSON` | All fields (ID as hex, Name, Description, Category, ImageURL, PriceCents, Currency, SKU, Stock) copied correctly |

**Why this matters:** `activeProductFilter` is used by both public and admin product handlers — a bug here would silently show deleted products. `atoiOr` controls pagination bounds.

---

### 4.5 E2E: Playwright Tests (NEW — 5 spec files)

**Requires:** full stack running (`go run ./cmd/server` + `npm run dev`).

#### `e2e/catalog.spec.ts`
| Test | Flow |
|------|------|
| Catalog page shows products | `GET /` → product cards visible |
| Navigate to product detail | Click first product link → URL changes to `/products/{id}` |
| Search filters products | Fill search input → press Enter → cards visible |
| Product detail has add-to-cart button | Navigate to product → "Add to Cart" button visible |

#### `e2e/auth.spec.ts`
| Test | Flow |
|------|------|
| Register page renders fields | `GET /register` → email + password inputs visible |
| Register redirects after success | Fill valid email/password → submit → URL no longer `/register` |
| Login page renders fields | `GET /login` → email + password inputs visible |
| Login with wrong credentials stays on login | Fill bad credentials → submit → still on `/login` |

#### `e2e/cart.spec.ts`
| Test | Flow |
|------|------|
| Add product shows cart badge | Navigate to product → click Add to Cart → badge count visible in TopBar |
| Cart page shows added item | Add product → `GET /cart` → line item visible |
| Cart checkout button goes to `/checkout` | Add product → cart → click checkout button → URL is `/checkout` |

#### `e2e/checkout.spec.ts`
| Test | Flow |
|------|------|
| Checkout page shows address step | Login → add product → `GET /checkout` → name/address fields visible |
| Full checkout with 4242 card succeeds | Fill address → fill card 4242 4242 4242 4242 → place order → URL becomes `/checkout/success/{orderId}` |
| Declined card (4000000000000002) stays on checkout | Fill address → fill decline card → place order → URL does NOT contain `/checkout/success` |

#### `e2e/admin.spec.ts`
| Test | Flow |
|------|------|
| Admin dashboard loads after login | Login as admin → `GET /admin` → page visible |
| Admin products page shows list | `GET /admin/products` → table rows visible |
| Create product form renders fields | `GET /admin/products/new` → name/SKU/price inputs visible |
| Admin orders page loads | `GET /admin/orders` → page visible |
| Unauthenticated access to `/admin` redirects | New browser context (no cookie) → `GET /admin` → redirected away |

---

## 5. Coverage Gaps (Not Yet Automated)

| Area | Gap | Effort to add |
|------|-----|:---:|
| React components | No component-level tests (TopBar, CartDrawer, ProductCard, Toast). Needs `@testing-library/react`. | Medium |
| Cart service (Go) | `cart.Service` (AddItem, SetQty, RemoveItem) has no tests — requires real or embedded MongoDB | High |
| Order service (Go) | PlaceOrder orchestration not integration-tested against real DB | High |
| Admin order status transitions | `canTransition()` logic in `orderadmin/handlers.go` untested | Low |
| Pagination | No tests for page/pageSize boundary behavior | Low |
| Guest cart → authenticated merge | No E2E test for the cart-merge flow after login | Medium |

---

## 6. Test Architecture Decisions

**Why mock `fetch` instead of a real API server?**  
Frontend lib tests use `vi.spyOn(globalThis, "fetch")` to intercept calls. This keeps tests fast and self-contained — no running API needed. The contract being tested is "does this function call the right URL with the right method/body and handle the response shape correctly?", which mock fetch can verify perfectly.

**Why `package catalog` (not `package catalog_test`) for Go tests?**  
The functions under test (`atoiOr`, `activeProductFilter`, `validateAdminProductCreate`, `productToJSON`) are unexported helpers. Testing them from the same package (`package catalog`) gives white-box access without exposing them to other packages.

**Why Playwright workers: 1?**  
Checkout and auth tests share database state (user accounts, cart contents). Running sequentially avoids race conditions where two tests create conflicting orders or carts.

**Payment test cards (stub processor):**
- `4242 4242 4242 4242` → payment succeeds
- `4000 0000 0000 0002` → card declined (402 response)
- Any other non-empty number → succeeds

---

## 7. File Locations

```
apps/web/
├── lib/
│   ├── orders.test.ts           ← NEW
│   ├── admin-products.test.ts   ← NEW
│   └── admin-orders.test.ts     ← NEW
├── e2e/
│   ├── catalog.spec.ts          ← NEW
│   ├── auth.spec.ts             ← NEW
│   ├── cart.spec.ts             ← NEW
│   ├── checkout.spec.ts         ← NEW
│   └── admin.spec.ts            ← NEW
├── playwright.config.ts         ← NEW
└── package.json                 (updated: added @playwright/test, test:e2e scripts)

services/api/
└── internal/catalog/
    └── catalog_test.go          ← NEW
```
