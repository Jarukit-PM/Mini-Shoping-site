# Test Plan — Member B (Catalog & Cart)

> Covers UC-01 Search Products, UC-02 View Product Details, UC-03 Add to Cart, UC-04 View Cart.

---

## 1. Scope

| In Scope | Out of Scope |
|----------|-------------|
| Product search, filter, pagination (UC-01) | Checkout / payment (Member C) |
| Product detail page (UC-02) | Admin product CRUD (Member A) |
| Add to cart with stock validation (UC-03) | Real authentication (Member A) |
| View / edit / remove cart items (UC-04) | Order history |
| API error envelope format | Infrastructure / DevOps |

**Auth during testing**: all cart requests must include header `X-Stub-User-Id: 65a000000000000000000001`.

---

## 2. Test Environment Setup

```powershell
cd D:\Work\KMUTT\CPE362_OOAD\Project\Mini-Shoping-site
docker compose up --build
```

| Service | URL |
|---------|-----|
| REST API | `http://localhost:8080` |
| Web UI | `http://localhost:3000` |
| MongoDB | `localhost:27017` |

Seed data is auto-inserted on startup (`EnsureDemoProducts`):

| Name | SKU | Price (THB) | Stock | Category |
|------|-----|-------------|-------|----------|
| Canvas Tote | TOTE-001 | 590.00 | 40 | Bags |
| Stainless Bottle | BOTT-001 | 890.00 | 120 | Drinkware |
| Notebook Set | NOTE-001 | 249.00 | 200 | Stationery |

---

## 3. API Test Cases

### 3.1 UC-01 — List Products

#### TC-API-01-01: List all products (no filters)
```bash
curl -s 'http://localhost:8080/v1/products' | jq
```
**Expected**:
- HTTP 200
- `items` array with 3 products
- `page: 1`, `pageSize: 20`, `total: 3`

---

#### TC-API-01-02: Keyword search — matching term
```bash
curl -s 'http://localhost:8080/v1/products?q=bottle' | jq
```
**Expected**:
- HTTP 200
- `items` contains only "Stainless Bottle"
- `total: 1`

---

#### TC-API-01-03: Keyword search — no match
```bash
curl -s 'http://localhost:8080/v1/products?q=xyznonexistent' | jq
```
**Expected**:
- HTTP 200
- `items: []`
- `total: 0`

---

#### TC-API-01-04: Category filter
```bash
curl -s 'http://localhost:8080/v1/products?category=Drinkware' | jq
```
**Expected**:
- HTTP 200
- All returned items have `category: "Drinkware"`

---

#### TC-API-01-05: Pagination — page size
```bash
curl -s 'http://localhost:8080/v1/products?pageSize=2&page=1' | jq
```
**Expected**:
- HTTP 200
- `items` has exactly 2 entries
- `page: 1`, `pageSize: 2`, `total: 3`

---

#### TC-API-01-06: Pagination — second page
```bash
curl -s 'http://localhost:8080/v1/products?pageSize=2&page=2' | jq
```
**Expected**:
- HTTP 200
- `items` has exactly 1 entry (the remaining product)

---

#### TC-API-01-07: pageSize capped at 100
```bash
curl -s 'http://localhost:8080/v1/products?pageSize=999' | jq
```
**Expected**:
- HTTP 200
- Response uses `pageSize: 20` (default, not 999)

---

### 3.2 UC-02 — Get Product Detail

#### TC-API-02-01: Valid product ID
```bash
# Replace <id> with a real ObjectId from TC-API-01-01
curl -s 'http://localhost:8080/v1/products/<id>' | jq
```
**Expected**:
- HTTP 200
- Response contains `id`, `name`, `description`, `category`, `imageUrl`, `priceCents`, `currency`, `sku`, `stock`

---

#### TC-API-02-02: Invalid hex ID
```bash
curl -s 'http://localhost:8080/v1/products/not-a-valid-id' | jq
```
**Expected**:
- HTTP 400
- `{ "error": { "code": "bad_id", "message": "invalid product id" } }`

---

#### TC-API-02-03: Valid hex, non-existent product
```bash
curl -s 'http://localhost:8080/v1/products/000000000000000000000000' | jq
```
**Expected**:
- HTTP 404
- `{ "error": { "code": "not_found", "message": "product not found" } }`

---

### 3.3 UC-03 — Add to Cart

#### TC-API-03-01: Add item successfully
```bash
curl -s -X POST 'http://localhost:8080/v1/cart/items' \
  -H 'Content-Type: application/json' \
  -H 'X-Stub-User-Id: 65a000000000000000000001' \
  -d '{"productId":"<id>","qty":2}' | jq
```
**Expected**:
- HTTP 200
- Response is a `Cart` object with `items` containing the added product
- `lineTotalCents = unitPriceCents × qty`
- `grandTotalCents` reflects the total

---

#### TC-API-03-02: Add same product twice — quantities accumulate
Add same product with qty 1, then add again with qty 1.
```bash
# First add
curl -s -X POST ... -d '{"productId":"<id>","qty":1}' | jq
# Second add
curl -s -X POST ... -d '{"productId":"<id>","qty":1}' | jq
```
**Expected**: After second call, the item in `items` has `qty: 2`.

---

#### TC-API-03-03: Out of stock (qty exceeds stock)
Canvas Tote has stock 40.
```bash
curl -s -X POST 'http://localhost:8080/v1/cart/items' \
  -H 'Content-Type: application/json' \
  -H 'X-Stub-User-Id: 65a000000000000000000001' \
  -d '{"productId":"<tote-id>","qty":999}' | jq
```
**Expected**:
- HTTP 409
- `{ "error": { "code": "out_of_stock", "message": "Only 40 left", "details": { "productId": "...", "available": 40 } } }`

---

#### TC-API-03-04: Out of stock — cumulative qty check
Already have qty 39 of Canvas Tote in cart, try to add 5 more (stock = 40).
**Expected**: HTTP 409 `out_of_stock`, `available: 1` (40 − 39).

---

#### TC-API-03-05: Non-existent product
```bash
curl -s -X POST 'http://localhost:8080/v1/cart/items' \
  -H 'Content-Type: application/json' \
  -H 'X-Stub-User-Id: 65a000000000000000000001' \
  -d '{"productId":"000000000000000000000000","qty":1}' | jq
```
**Expected**:
- HTTP 404
- `{ "error": { "code": "not_found", ... } }`

---

#### TC-API-03-06: Invalid qty (zero or negative)
```bash
curl -s -X POST ... -d '{"productId":"<id>","qty":0}' | jq
```
**Expected**:
- HTTP 400
- `{ "error": { "code": "invalid_qty", ... } }`

---

#### TC-API-03-07: Price snapshot is captured
Note the `priceCentsSnapshot` in the cart after add. If product price were changed in DB, the snapshot should retain the original value.
**Expected**: `priceCentsSnapshot` equals the product's `priceCents` at the time of adding.

---

### 3.4 UC-04 — View / Edit Cart

#### TC-API-04-01: Get cart (after adds)
```bash
curl -s 'http://localhost:8080/v1/cart' \
  -H 'X-Stub-User-Id: 65a000000000000000000001' | jq
```
**Expected**:
- HTTP 200
- `items` array with enriched lines: `name`, `imageUrl`, `qty`, `unitPriceCents`, `lineTotalCents`
- `grandTotalCents` = sum of all `lineTotalCents`
- `currency` present

---

#### TC-API-04-02: Get cart — empty cart
New stub user with no prior adds.
```bash
curl -s 'http://localhost:8080/v1/cart' \
  -H 'X-Stub-User-Id: 65a000000000000000000099' | jq
```
**Expected**:
- HTTP 200
- `items: []`, `grandTotalCents: 0`

---

#### TC-API-04-03: Update quantity (PATCH)
```bash
curl -s -X PATCH 'http://localhost:8080/v1/cart/items/<productId>' \
  -H 'Content-Type: application/json' \
  -H 'X-Stub-User-Id: 65a000000000000000000001' \
  -d '{"qty":5}' | jq
```
**Expected**:
- HTTP 200
- Item in response has `qty: 5`
- `lineTotalCents` and `grandTotalCents` updated accordingly

---

#### TC-API-04-04: PATCH qty = 0 removes the item
```bash
curl -s -X PATCH ... -d '{"qty":0}' | jq
```
**Expected**:
- HTTP 200
- Item no longer appears in `items`

---

#### TC-API-04-05: PATCH qty exceeds stock
```bash
curl -s -X PATCH ... -d '{"qty":9999}' | jq
```
**Expected**:
- HTTP 409 `out_of_stock`

---

#### TC-API-04-06: Remove item (DELETE)
```bash
curl -s -X DELETE 'http://localhost:8080/v1/cart/items/<productId>' \
  -H 'X-Stub-User-Id: 65a000000000000000000001' | jq
```
**Expected**:
- HTTP 200
- Item no longer in `items`
- `grandTotalCents` reduced accordingly

---

#### TC-API-04-07: Cart is user-scoped
Add items with user `...0001`, then GET cart with user `...0002`.
**Expected**: `...0002`'s cart is empty — carts are not shared between users.

---

## 4. UI Test Cases

### 4.1 UC-01 — Product Listing & Search

#### TC-UI-01-01: Home page loads product grid
1. Open `http://localhost:3000`

**Expected**: Grid shows 3 product cards (Canvas Tote, Stainless Bottle, Notebook Set). Each card shows name, price, image, stock level, and a View button.

---

#### TC-UI-01-02: Text search filters the grid
1. Open `http://localhost:3000`
2. Type "bottle" in the search box
3. Submit / press Enter

**Expected**: Grid updates to show only "Stainless Bottle". URL becomes `/?q=bottle`.

---

#### TC-UI-01-03: Category dropdown filters the grid
1. Open `http://localhost:3000`
2. Select "Bags" from the category dropdown
3. Submit

**Expected**: Grid shows only "Canvas Tote". URL includes `category=Bags`.

---

#### TC-UI-01-04: Combined search + category
1. Search "note", category "Stationery"

**Expected**: Only "Notebook Set" shown.

---

#### TC-UI-01-05: No results state
1. Search "xyznonexistent"

**Expected**: Grid is empty; no error message thrown; page doesn't crash.

---

#### TC-UI-01-06: Pagination — Next page appears when needed
1. Reduce pageSize via URL: `http://localhost:3000?pageSize=2`

**Expected**: Grid shows 2 products. "Next" button is visible. "Prev" button is grayed out.

---

#### TC-UI-01-07: Pagination — Next navigates correctly
1. Go to `http://localhost:3000?pageSize=2`
2. Click "Next"

**Expected**: URL becomes `/?pageSize=2&page=2`. Grid shows the remaining 1 product. "Next" is now grayed out. "Prev" is active.

---

#### TC-UI-01-08: Pagination preserves search params
1. Go to `http://localhost:3000?q=notebook&pageSize=1`
2. Click "Next"

**Expected**: URL is `/?q=notebook&pageSize=1&page=2`. Search param `q=notebook` is preserved.

---

#### TC-UI-01-09: Single page — no pagination controls
With 3 products and default pageSize=20, no Prev/Next buttons appear.

---

### 4.2 UC-02 — Product Detail

#### TC-UI-02-01: Navigate to detail page via View button
1. Open `http://localhost:3000`
2. Click "View" on "Stainless Bottle"

**Expected**: Navigates to `/products/<id>`. Page shows name, price, description, stock count, image, and "Add to Cart" button with qty input.

---

#### TC-UI-02-02: Direct URL to detail page
1. Open `/products/<valid-id>` directly (without visiting homepage first)

**Expected**: Page renders correctly with product data.

---

#### TC-UI-02-03: Non-existent product → 404
1. Open `/products/000000000000000000000000`

**Expected**: Next.js 404 page shown (via `notFound()`).

---

### 4.3 UC-03 — Add to Cart

#### TC-UI-03-01: Add item with default qty (1)
1. Open a product detail page
2. Click "Add to Cart" (default qty = 1)

**Expected**: No error shown. (Verify by navigating to `/cart` and seeing the item.)

---

#### TC-UI-03-02: Add item with custom qty
1. Change qty input to 3
2. Click "Add to Cart"

**Expected**: Item added with qty 3. Navigate to `/cart` to confirm.

---

#### TC-UI-03-03: qty input is bounded to 1 – maxStock
1. Try typing 0 or negative value in qty input

**Expected**: Input enforces min=1 (HTML validation or button is disabled).

---

#### TC-UI-03-04: Out-of-stock inline error
1. Set qty to a number greater than the product's stock
2. Click "Add to Cart"

**Expected**: Inline message appears: "Only N left" (where N = available stock). No navigation occurs.

---

#### TC-UI-03-05: Loading state during add
1. Click "Add to Cart"

**Expected**: Button shows a loading indicator (spinner or disabled state) while the API call is in flight.

---

### 4.4 UC-04 — Shopping Cart

#### TC-UI-04-01: Cart page shows added items
1. Add 2 products from their detail pages
2. Navigate to `http://localhost:3000/cart`

**Expected**: Both items listed with image, name, price × qty = line total. Grand total shown at the bottom.

---

#### TC-UI-04-02: Line total calculation
1. Add Stainless Bottle (890.00 THB) with qty 3
2. Go to `/cart`

**Expected**: Line shows `890.00 × 3 = 2670.00`. Grand total reflects this.

---

#### TC-UI-04-03: Update quantity from cart page
1. Change the qty input for an item from 2 to 4

**Expected**: Line total and grand total update immediately (after API call resolves). No page reload.

---

#### TC-UI-04-04: Remove item from cart
1. Click "Remove" on a cart item

**Expected**: Item disappears from the list. Grand total decreases. No page reload.

---

#### TC-UI-04-05: Empty cart message
1. Remove all items from the cart

**Expected**: Message "Your cart is empty." is shown instead of the item list.

---

#### TC-UI-04-06: Cart persists on page refresh
1. Add items to the cart
2. Refresh `http://localhost:3000/cart`

**Expected**: Items still appear (data is server-persisted in MongoDB, not localStorage).

---

#### TC-UI-04-07: Checkout button links to /checkout
1. Scroll to bottom of `/cart`

**Expected**: "Checkout" button is visible and links to `/checkout` (page may not exist yet — just verify the link target).

---

#### TC-UI-04-08: Cart error state
1. Stop the API server while on `/cart`
2. Reload the page

**Expected**: Error message displayed (e.g. "Error: Failed to fetch" or similar), not a blank or crashed page.

---

## 5. Error Envelope Verification

All error responses from Member B endpoints must follow the agreed envelope:

```json
{
  "error": {
    "code": "snake_case_string",
    "message": "Human readable",
    "details": { }
  }
}
```

| Scenario | Expected code | HTTP status |
|----------|--------------|-------------|
| Bad product ID hex | `bad_id` | 400 |
| Product not found | `not_found` | 404 |
| Out of stock | `out_of_stock` | 409 |
| Zero / negative qty | `invalid_qty` | 400 |
| Database error | `database_error` | 500 |

---

## 6. Regression Checklist

Run after any code change:

- [ ] TC-API-01-01 (list all products returns 3)
- [ ] TC-API-03-01 (add item returns enriched cart)
- [ ] TC-API-03-03 (out of stock returns 409)
- [ ] TC-API-04-06 (remove item)
- [ ] TC-UI-01-01 (home page grid loads)
- [ ] TC-UI-03-04 (out-of-stock inline error in UI)
- [ ] TC-UI-04-06 (cart persists after refresh)

---

## 7. Auth Migration Smoke Test

When Member A's `internal/auth` replaces `authstub`:

1. Remove `X-Stub-User-Id` header from all curl commands above
2. Obtain a real session cookie via `POST /v1/auth/login`
3. Repeat TC-API-03-01, TC-API-04-01, TC-API-04-06 using the cookie
4. Verify an unauthenticated request to `GET /v1/cart` returns HTTP 401

---

## 8. Out-of-Scope (Do Not Test Here)

- `POST /v1/orders` — Member C
- `GET /v1/orders` — Member C
- Admin product create/update/delete — Member A
- Login / logout flows — Member A
