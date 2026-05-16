# Test Plan — Mini Shopping Site (All Use Cases)

> Covers all 11 use cases from `Shopping_usecase.pdf`:
> UC-01 through UC-06 (Customer) and UC-07 through UC-11 (Admin).

---

## 1. Scope

| Use Case | Description | Member |
|----------|-------------|--------|
| UC-01 | Search / Browse Products | B |
| UC-02 | View Product Detail | B |
| UC-03 | Add to Cart | B |
| UC-04 | View Cart | B |
| UC-05 | Place Order (Checkout) | C |
| UC-06 | View Order Status / History | C |
| UC-07 | Admin Login | A |
| UC-08 | Add Product (Admin) | A |
| UC-09 | Edit Product (Admin) | A |
| UC-10 | Delete Product (Admin) | A |
| UC-11 | Update Order Status (Admin) | A |

**Out of scope**: Guest checkout (login required — A-01), real payment gateway, image uploads, email notifications, customer self-registration (admin bootstrap only per Q-01 resolution).

---

## 2. Environment Setup

### 2.1 Start the stack

```powershell
cd D:\Work\KMUTT\CPE362_OOAD\Project\Mini-Shoping-site
docker compose up --build
```

| Service | URL |
|---------|-----|
| REST API | `http://localhost:8080` |
| Web UI | `http://localhost:3000` |
| MongoDB | `localhost:27017` (db: `mini_shop`) |

### 2.2 Environment variables (`.env` at repo root)

```
MONGODB_URI=mongodb://mongo:27017
MONGODB_DATABASE=mini_shop
CORS_ORIGINS=http://localhost:3000
API_URL=http://api:8080
NEXT_PUBLIC_API_URL=http://localhost:8080
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin1234!
JWT_SECRET=supersecretkey
SHIPPING_FLAT_CENTS=800
```

### 2.3 Seed data (auto-inserted on startup)

| Name | SKU | Price (THB) | Stock | Category |
|------|-----|-------------|-------|----------|
| Canvas Tote | TOTE-001 | 590.00 | 40 | Bags |
| Stainless Bottle | BOTT-001 | 890.00 | 120 | Drinkware |
| Notebook Set | NOTE-001 | 249.00 | 200 | Stationery |

### 2.4 Session cookie setup

All authenticated endpoints use `httpOnly` session cookies.

```bash
# Save cookie after login (reuse this file in subsequent calls)
curl -s -c cookies.txt -X POST http://localhost:8080/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"Admin1234!"}' -o /dev/null -w "%{http_code}"
# Expected: 204

# Customer login (register first if needed, or use a seeded customer)
curl -s -c customer_cookies.txt -X POST http://localhost:8080/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"customer@example.com","password":"Customer1!"}' -o /dev/null -w "%{http_code}"
```

---

## 3. UC-07 — Admin Login

> **Must be tested first** — admin session cookie is required for UC-08 through UC-11.

### 3.1 API Tests

#### TC-07-API-01: Successful admin login
```bash
curl -sv -c cookies.txt -X POST http://localhost:8080/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"Admin1234!"}' 2>&1 | grep -E 'HTTP|Set-Cookie'
```
**Expected**:
- HTTP 204
- `Set-Cookie: auth=<token>; HttpOnly; SameSite=Lax`

---

#### TC-07-API-02: Wrong password
```bash
curl -s -X POST http://localhost:8080/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"wrongpassword"}' | jq
```
**Expected**:
- HTTP 401
- `{ "error": { "code": "invalid_credentials", "message": "..." } }`

---

#### TC-07-API-03: Non-existent email
```bash
curl -s -X POST http://localhost:8080/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"nobody@example.com","password":"any"}' | jq
```
**Expected**: HTTP 401 `invalid_credentials`

---

#### TC-07-API-04: Get current user
```bash
curl -s -b cookies.txt http://localhost:8080/v1/auth/me | jq
```
**Expected**:
- HTTP 200
- `{ "id": "...", "email": "admin@example.com", "role": "admin" }`

---

#### TC-07-API-05: Unauthenticated /me
```bash
curl -s http://localhost:8080/v1/auth/me | jq
```
**Expected**: HTTP 401

---

#### TC-07-API-06: Logout clears session
```bash
curl -s -b cookies.txt -c cookies.txt -X POST http://localhost:8080/v1/auth/logout
curl -s -b cookies.txt http://localhost:8080/v1/auth/me | jq
```
**Expected**: Second call returns HTTP 401 (cookie cleared).

---

#### TC-07-API-07: Non-admin cannot access admin routes
```bash
# Login as customer first, then:
curl -s -b customer_cookies.txt \
  http://localhost:8080/v1/admin/products | jq
```
**Expected**: HTTP 403 or 401

---

### 3.2 UI Tests

#### TC-07-UI-01: Login page renders
1. Open `http://localhost:3000/login`

**Expected**: Email and password fields, "Sign in" button visible.

---

#### TC-07-UI-02: Successful admin login redirects to /admin
1. Enter `admin@example.com` / `Admin1234!`
2. Click "Sign in"

**Expected**: Redirected to `/admin` (dashboard page) without errors.

---

#### TC-07-UI-03: Wrong credentials shows error
1. Enter wrong password
2. Click "Sign in"

**Expected**: Error message shown inline ("Invalid credentials" or similar). Page does not redirect.

---

#### TC-07-UI-04: /admin redirects unauthenticated users to /login
1. Without logging in, navigate to `http://localhost:3000/admin`

**Expected**: Redirected to `http://localhost:3000/login`.

---

#### TC-07-UI-05: /admin/products redirects unauthenticated
1. Without logging in, navigate to `http://localhost:3000/admin/products`

**Expected**: Redirected to `http://localhost:3000/login`.

---

## 4. UC-01 — Search / Browse Products

### 4.1 API Tests

#### TC-01-API-01: List all products
```bash
curl -s 'http://localhost:8080/v1/products' | jq
```
**Expected**:
- HTTP 200
- `items` array with 3 products, each with `id`, `name`, `priceCents`, `currency`, `sku`, `stock`, `category`
- `page: 1`, `total: 3`

---

#### TC-01-API-02: Keyword search — match
```bash
curl -s 'http://localhost:8080/v1/products?q=bottle' | jq
```
**Expected**: Only "Stainless Bottle" in `items`; `total: 1`

---

#### TC-01-API-03: Keyword search — no match
```bash
curl -s 'http://localhost:8080/v1/products?q=xyznonexistent' | jq
```
**Expected**: `items: []`, `total: 0`

---

#### TC-01-API-04: Category filter
```bash
curl -s 'http://localhost:8080/v1/products?category=Drinkware' | jq
```
**Expected**: All returned items have `"category": "Drinkware"`

---

#### TC-01-API-05: Pagination
```bash
curl -s 'http://localhost:8080/v1/products?pageSize=2&page=1' | jq
curl -s 'http://localhost:8080/v1/products?pageSize=2&page=2' | jq
```
**Expected**: First call returns 2 items; second call returns 1 item.

---

#### TC-01-API-06: Soft-deleted products excluded from public list
After deleting a product via admin (TC-10), run TC-01-API-01 again.
**Expected**: Deleted product no longer appears in `items`.

---

### 4.2 UI Tests

#### TC-01-UI-01: Home page loads product grid
1. Open `http://localhost:3000`

**Expected**: 3 product cards visible (Canvas Tote, Stainless Bottle, Notebook Set).

---

#### TC-01-UI-02: Search filters grid
1. Type "bottle" in search box, press Enter

**Expected**: Only "Stainless Bottle" card shown. URL contains `?q=bottle`.

---

#### TC-01-UI-03: Category filter
1. Select "Bags" from category filter

**Expected**: Only "Canvas Tote" shown.

---

#### TC-01-UI-04: No results state
1. Search "xyznonexistent"

**Expected**: Empty state message shown; no crash.

---

## 5. UC-02 — View Product Detail

### 5.1 API Tests

#### TC-02-API-01: Get product by valid ID
```bash
# Get an ID from TC-01-API-01 first
PRODUCT_ID=$(curl -s 'http://localhost:8080/v1/products' | jq -r '.items[0].id')
curl -s "http://localhost:8080/v1/products/$PRODUCT_ID" | jq
```
**Expected**:
- HTTP 200
- All fields: `id`, `name`, `description`, `category`, `imageUrl`, `priceCents`, `currency`, `sku`, `stock`

---

#### TC-02-API-02: Invalid ID format
```bash
curl -s 'http://localhost:8080/v1/products/not-valid' | jq
```
**Expected**: HTTP 400, `code: "bad_id"` or `"invalid_id"`

---

#### TC-02-API-03: Non-existent valid hex ID
```bash
curl -s 'http://localhost:8080/v1/products/000000000000000000000000' | jq
```
**Expected**: HTTP 404, `code: "not_found"`

---

### 5.2 UI Tests

#### TC-02-UI-01: Navigate to product detail
1. From home page, click a product card

**Expected**: Navigates to `/products/<id>`. Page shows name, price, description, stock count, "Add to Cart" button.

---

#### TC-02-UI-02: Direct URL access
1. Open `/products/<valid-id>` directly without visiting homepage

**Expected**: Page renders correctly.

---

#### TC-02-UI-03: Non-existent product → 404
1. Open `/products/000000000000000000000000`

**Expected**: Next.js 404 page shown.

---

## 6. UC-03 — Add to Cart

> Requires customer to be logged in.

### 6.1 API Tests

```bash
# Get a product ID for tests
PRODUCT_ID=$(curl -s 'http://localhost:8080/v1/products' | jq -r '.items[0].id')
```

#### TC-03-API-01: Add item successfully
```bash
curl -s -b customer_cookies.txt -X POST http://localhost:8080/v1/cart/items \
  -H 'Content-Type: application/json' \
  -d "{\"productId\":\"$PRODUCT_ID\",\"qty\":2}" | jq
```
**Expected**:
- HTTP 200 (or 201)
- `items` array contains the product with `qty: 2`
- `lineTotalCents = unitPriceCents × 2`

---

#### TC-03-API-02: Add same product twice — quantities accumulate
Add qty 1 twice.
**Expected**: After second call, `qty: 2` for that product.

---

#### TC-03-API-03: Out of stock (qty exceeds available)
```bash
curl -s -b customer_cookies.txt -X POST http://localhost:8080/v1/cart/items \
  -H 'Content-Type: application/json' \
  -d "{\"productId\":\"$PRODUCT_ID\",\"qty\":9999}" | jq
```
**Expected**: HTTP 409, `code: "out_of_stock"`

---

#### TC-03-API-04: Product not found
```bash
curl -s -b customer_cookies.txt -X POST http://localhost:8080/v1/cart/items \
  -H 'Content-Type: application/json' \
  -d '{"productId":"000000000000000000000000","qty":1}' | jq
```
**Expected**: HTTP 404

---

#### TC-03-API-05: Unauthenticated request returns 401
```bash
curl -s -X POST http://localhost:8080/v1/cart/items \
  -H 'Content-Type: application/json' \
  -d "{\"productId\":\"$PRODUCT_ID\",\"qty\":1}" | jq
```
**Expected**: HTTP 401

---

### 6.2 UI Tests

#### TC-03-UI-01: Add item from product detail page
1. Log in as customer, go to a product detail page
2. Click "Add to Cart"

**Expected**: Success indicator shown; navigate to `/cart` and confirm item is there.

---

#### TC-03-UI-02: Out-of-stock error shown inline
1. Set qty to a number greater than stock
2. Click "Add to Cart"

**Expected**: Error message shown (e.g. "Only N left in stock"). No navigation.

---

## 7. UC-04 — View Cart

### 7.1 API Tests

#### TC-04-API-01: Get cart after adds
```bash
curl -s -b customer_cookies.txt http://localhost:8080/v1/cart | jq
```
**Expected**:
- HTTP 200
- `items` with `productId`, `name`, `qty`, `unitPriceCents`, `lineTotalCents`
- `grandTotalCents` = sum of all `lineTotalCents`

---

#### TC-04-API-02: Get empty cart
```bash
# New customer with fresh session
curl -s -b fresh_customer_cookies.txt http://localhost:8080/v1/cart | jq
```
**Expected**: HTTP 200, `items: []`, `grandTotalCents: 0`

---

#### TC-04-API-03: Update quantity (PATCH)
```bash
curl -s -b customer_cookies.txt -X PATCH \
  "http://localhost:8080/v1/cart/items/$PRODUCT_ID" \
  -H 'Content-Type: application/json' \
  -d '{"qty":5}' | jq
```
**Expected**: HTTP 200; item has `qty: 5`; totals updated.

---

#### TC-04-API-04: Set qty to 0 removes item
```bash
curl -s -b customer_cookies.txt -X PATCH \
  "http://localhost:8080/v1/cart/items/$PRODUCT_ID" \
  -H 'Content-Type: application/json' \
  -d '{"qty":0}' | jq
```
**Expected**: HTTP 200; item no longer in `items`.

---

#### TC-04-API-05: Delete item
```bash
curl -s -b customer_cookies.txt -X DELETE \
  "http://localhost:8080/v1/cart/items/$PRODUCT_ID" | jq
```
**Expected**: HTTP 200; item removed; `grandTotalCents` reduced.

---

#### TC-04-API-06: Cart is user-scoped
Add items as customer A, then GET cart as customer B.
**Expected**: Customer B's cart is empty.

---

### 7.2 UI Tests

#### TC-04-UI-01: Cart page shows items
1. Add 2 different products, go to `/cart`

**Expected**: Both items listed with name, qty, unit price, line total; grand total shown.

---

#### TC-04-UI-02: Update qty from cart page
1. Change qty input for an item

**Expected**: Line total and grand total update after API call; no page reload needed.

---

#### TC-04-UI-03: Remove item from cart
1. Click "Remove" on a cart item

**Expected**: Item disappears; grand total decreases.

---

#### TC-04-UI-04: Empty cart message
1. Remove all items

**Expected**: "Your cart is empty" message shown.

---

#### TC-04-UI-05: Cart persists on refresh
1. Add items to cart, refresh `/cart`

**Expected**: Items still present (stored server-side in MongoDB).

---

#### TC-04-UI-06: Checkout CTA visible
1. Cart page with at least 1 item

**Expected**: "Checkout" button is visible and links to `/checkout`.

---

## 8. UC-05 — Place Order (Checkout)

> Requires items in cart and a logged-in customer.

### 8.1 API Tests

Set up: add a product to cart first (TC-03-API-01).

#### TC-05-API-01: Successful order — test card 4242
```bash
curl -s -b customer_cookies.txt -X POST http://localhost:8080/v1/orders \
  -H 'Content-Type: application/json' \
  -d '{
    "shippingAddress": {
      "name": "Test Customer",
      "line1": "123 Test Street",
      "city": "Bangkok",
      "postal": "10100",
      "country": "Thailand"
    },
    "payment": {
      "cardNumber": "4242424242424242",
      "expiry": "12/27",
      "cvv": "123"
    }
  }' | jq
```
**Expected**:
- HTTP 201
- `{ "orderId": "<hex>", "status": "Paid" }`

---

#### TC-05-API-02: Verify cart is cleared after success
```bash
curl -s -b customer_cookies.txt http://localhost:8080/v1/cart | jq '.items | length'
```
**Expected**: `0` (cart emptied after order)

---

#### TC-05-API-03: Verify stock was decremented
```bash
curl -s "http://localhost:8080/v1/products/$PRODUCT_ID" | jq '.stock'
```
**Expected**: Stock reduced by the qty ordered.

---

#### TC-05-API-04: Payment declined — card 4000000000000002
```bash
# Add item to cart first, then:
curl -s -b customer_cookies.txt -X POST http://localhost:8080/v1/orders \
  -H 'Content-Type: application/json' \
  -d '{
    "shippingAddress": {"name":"Test","line1":"123 St","city":"BKK","postal":"10100","country":"TH"},
    "payment": {"cardNumber":"4000000000000002","expiry":"12/27","cvv":"123"}
  }' | jq
```
**Expected**:
- HTTP 402
- `{ "error": { "code": "payment_declined", "message": "..." } }`
- Cart still has items (not cleared)
- Stock unchanged (no order created, verify with TC-05-API-03 equivalent)

---

#### TC-05-API-05: Empty cart returns error
```bash
# Ensure cart is empty first, then attempt checkout
curl -s -b customer_cookies.txt -X POST http://localhost:8080/v1/orders \
  -H 'Content-Type: application/json' \
  -d '{
    "shippingAddress": {"name":"Test","line1":"123 St","city":"BKK","postal":"10100","country":"TH"},
    "payment": {"cardNumber":"4242424242424242","expiry":"12/27","cvv":"123"}
  }' | jq
```
**Expected**: HTTP 400, `code: "empty_cart"`

---

#### TC-05-API-06: Missing shipping address field
```bash
curl -s -b customer_cookies.txt -X POST http://localhost:8080/v1/orders \
  -H 'Content-Type: application/json' \
  -d '{
    "shippingAddress": {"name":"","line1":"","city":"BKK","postal":"10100","country":"TH"},
    "payment": {"cardNumber":"4242424242424242","expiry":"12/27","cvv":"123"}
  }' | jq
```
**Expected**: HTTP 400, `code: "missing_field"`

---

#### TC-05-API-07: Unauthenticated checkout
```bash
curl -s -X POST http://localhost:8080/v1/orders \
  -H 'Content-Type: application/json' \
  -d '{"shippingAddress":{},"payment":{}}' | jq
```
**Expected**: HTTP 401

---

### 8.2 UI Tests

#### TC-05-UI-01: Complete checkout — happy path
1. Login as customer, add product to cart
2. Go to `/cart`, click "Checkout"
3. Step 1: Fill in shipping address, click "Continue to payment"
4. Step 2: Enter card `4242 4242 4242 4242`, expiry `12/27`, CVV `123`
5. Click "Review order"
6. Step 3: Click "Place order"

**Expected**:
- Redirected to `/checkout/success/<orderId>` (with real MongoDB ObjectId)
- Success page shows: "Thank you", real Order ID, shipping address, payment reference
- Navigating to `/orders` shows the new order

---

#### TC-05-UI-02: Payment declined — stays on payment step
1. Repeat above but use card `4000 0000 0000 0002`
2. Click "Place order"

**Expected**:
- Error message shown: "Your card was declined"
- User remains on the payment step (step 2)
- No order created (verify `/orders` history is unchanged)

---

#### TC-05-UI-03: Out-of-stock mid-flight (409)
1. With item in cart, manually set product stock to 0 in MongoDB
2. Attempt checkout with card `4242...`

**Expected**: Error shown, user navigated back to `/cart` with a message.

---

#### TC-05-UI-04: Address validation
1. Leave "Full name" blank on step 1
2. Click "Continue to payment"

**Expected**: Inline error "Required" on the name field. Does not advance to step 2.

---

#### TC-05-UI-05: Success page shows real order ID
After successful checkout (TC-05-UI-01), verify:
- Order ID on success page is a 24-character hex string (MongoDB ObjectId)
- NOT the old mock format like `MER-YYMMDD-XXXX`

---

## 9. UC-06 — View Order Status / History

### 9.1 API Tests

#### TC-06-API-01: List my orders
```bash
curl -s -b customer_cookies.txt http://localhost:8080/v1/orders | jq
```
**Expected**:
- HTTP 200
- `{ "items": [{ "id", "status", "createdAt", "grandTotalCents" }] }`
- Contains the order created in TC-05

---

#### TC-06-API-02: Get single order detail
```bash
ORDER_ID=$(curl -s -b customer_cookies.txt http://localhost:8080/v1/orders | jq -r '.items[0].id')
curl -s -b customer_cookies.txt "http://localhost:8080/v1/orders/$ORDER_ID" | jq
```
**Expected**:
- HTTP 200
- Full order: `id`, `lineItems`, `totals`, `shippingAddress`, `status`, `paymentRef`, `createdAt`
- `lineItems` has correct `priceCentsSnapshot` and `lineTotalCents`

---

#### TC-06-API-03: Order not accessible by other customer
```bash
# customer_b_cookies.txt: another user's session
curl -s -b customer_b_cookies.txt "http://localhost:8080/v1/orders/$ORDER_ID" | jq
```
**Expected**: HTTP 403, `code: "forbidden"`

---

#### TC-06-API-04: Orders are user-filtered
List orders as customer B — they should NOT see customer A's order.
**Expected**: `items` does not contain `$ORDER_ID`.

---

#### TC-06-API-05: Unauthenticated access
```bash
curl -s "http://localhost:8080/v1/orders" | jq
```
**Expected**: HTTP 401

---

### 9.2 UI Tests

#### TC-06-UI-01: Order history shows placed orders
1. After placing an order (TC-05-UI-01), go to `/orders`

**Expected**: Order appears in the table with correct ID, date, total, and status.

---

#### TC-06-UI-02: Order detail page
1. Click on an order row

**Expected**: Navigates to `/orders/<id>`. Shows: order ID, status timeline, line items, totals, shipping address, payment reference.

---

#### TC-06-UI-03: Empty order history
1. Login as a new customer with no orders, go to `/orders`

**Expected**: "No orders yet" message shown.

---

#### TC-06-UI-04: Unauthenticated redirect
1. Without logging in, navigate to `/orders`

**Expected**: Redirected to `/login` (or shows empty state; depends on implementation).

---

## 10. UC-08 — Add Product (Admin)

### 10.1 API Tests

#### TC-08-API-01: Create product successfully
```bash
curl -s -b cookies.txt -X POST http://localhost:8080/v1/admin/products \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Test Lamp",
    "description": "A beautiful lamp",
    "category": "Home",
    "imageUrl": "https://example.com/lamp.jpg",
    "sku": "LAMP-TEST-001",
    "currency": "THB",
    "priceCents": 129900,
    "stock": 15
  }' | jq
```
**Expected**:
- HTTP 201
- Response contains the created product with `id`, all provided fields

---

#### TC-08-API-02: Product appears in public listing
```bash
curl -s 'http://localhost:8080/v1/products?q=lamp' | jq '.total'
```
**Expected**: `1`

---

#### TC-08-API-03: Price must be > 0 (UC-08 alternative 5a)
```bash
curl -s -b cookies.txt -X POST http://localhost:8080/v1/admin/products \
  -H 'Content-Type: application/json' \
  -d '{"name":"Bad","sku":"BAD-001","priceCents":0,"stock":1}' | jq
```
**Expected**: HTTP 400, `code: "invalid_price"` or field error on `priceCents`

---

#### TC-08-API-04: Missing required field (name)
```bash
curl -s -b cookies.txt -X POST http://localhost:8080/v1/admin/products \
  -H 'Content-Type: application/json' \
  -d '{"sku":"SKU-001","priceCents":100,"stock":1}' | jq
```
**Expected**: HTTP 400, `code: "missing_field"`

---

#### TC-08-API-05: Duplicate SKU rejected
Run TC-08-API-01 a second time with the same SKU.
**Expected**: HTTP 409, `code: "duplicate_sku"`

---

#### TC-08-API-06: Non-admin cannot create product
```bash
curl -s -b customer_cookies.txt -X POST http://localhost:8080/v1/admin/products \
  -H 'Content-Type: application/json' \
  -d '{"name":"X","sku":"Y","priceCents":100,"stock":1}' | jq
```
**Expected**: HTTP 403 or 401

---

### 10.2 UI Tests

#### TC-08-UI-01: Admin can open new product form
1. Login as admin, go to `/admin/products`
2. Click "Add product"

**Expected**: Navigates to `/admin/products/new`. Form with name, SKU, price, stock, etc. visible.

---

#### TC-08-UI-02: Create product — valid input
1. Fill all fields (name, SKU unique, price > 0, stock ≥ 0)
2. Click "Create product"

**Expected**: Redirected to `/admin/products`. New product visible in the table and on the public storefront.

---

#### TC-08-UI-03: Invalid price shows Thai error message
1. Enter price `0` or negative
2. Click "Create product"

**Expected**: Error "ราคาสินค้าต้องมากกว่า 0" shown inline.

---

## 11. UC-09 — Edit Product (Admin)

### 11.1 API Tests

```bash
# Use the product created in TC-08-API-01
PROD_ID=$(curl -s -b cookies.txt http://localhost:8080/v1/admin/products 2>/dev/null | jq -r '.items[0].id' 2>/dev/null || \
  curl -s 'http://localhost:8080/v1/products?q=lamp' | jq -r '.items[0].id')
```

#### TC-09-API-01: Partial update (price and stock)
```bash
curl -s -b cookies.txt -X PATCH "http://localhost:8080/v1/admin/products/$PROD_ID" \
  -H 'Content-Type: application/json' \
  -d '{"priceCents":149900,"stock":20}' | jq
```
**Expected**:
- HTTP 200
- `priceCents: 149900`, `stock: 20`
- Other fields unchanged

---

#### TC-09-API-02: Partial update (name only)
```bash
curl -s -b cookies.txt -X PATCH "http://localhost:8080/v1/admin/products/$PROD_ID" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Updated Lamp"}' | jq
```
**Expected**: HTTP 200; `name: "Updated Lamp"`; price and stock unchanged.

---

#### TC-09-API-03: Update rejected with invalid price
```bash
curl -s -b cookies.txt -X PATCH "http://localhost:8080/v1/admin/products/$PROD_ID" \
  -H 'Content-Type: application/json' \
  -d '{"priceCents":-100}' | jq
```
**Expected**: HTTP 400

---

#### TC-09-API-04: Update non-existent product
```bash
curl -s -b cookies.txt -X PATCH http://localhost:8080/v1/admin/products/000000000000000000000000 \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ghost"}' | jq
```
**Expected**: HTTP 404

---

#### TC-09-API-05: Changes reflect on public listing
```bash
curl -s "http://localhost:8080/v1/products/$PROD_ID" | jq '.priceCents'
```
**Expected**: `149900` (updated value visible publicly)

---

### 11.2 UI Tests

#### TC-09-UI-01: Edit product from admin products list
1. Login as admin, go to `/admin/products`
2. Click "Edit" on a product

**Expected**: Navigates to `/admin/products/<id>`. Form pre-populated with current values.

---

#### TC-09-UI-02: Save changes persists to API
1. Change the price, click "Save changes"

**Expected**: Toast "Saved · <name> updated" shown. Refresh page — new price visible. Public storefront also shows updated price.

---

#### TC-09-UI-03: Invalid price shows error
1. Clear price field or enter 0, click "Save changes"

**Expected**: Error message shown ("ราคาสินค้าต้องมากกว่า 0 · Price must be greater than 0"). Changes NOT saved.

---

## 12. UC-10 — Delete Product (Admin)

### 12.1 API Tests

#### TC-10-API-01: Soft delete product
```bash
curl -sv -b cookies.txt -X DELETE "http://localhost:8080/v1/admin/products/$PROD_ID" 2>&1 | grep HTTP
```
**Expected**: HTTP 204 (no body)

---

#### TC-10-API-02: Deleted product absent from public list
```bash
curl -s 'http://localhost:8080/v1/products?q=lamp' | jq '.total'
```
**Expected**: `0` (soft-deleted product excluded)

---

#### TC-10-API-03: Admin can still fetch deleted product by ID
```bash
curl -s -b cookies.txt "http://localhost:8080/v1/admin/products/$PROD_ID" | jq '.name'
```
**Expected**: HTTP 200 with `deletedAt` field set (soft delete preserved).

---

#### TC-10-API-04: Delete non-existent product
```bash
curl -sv -b cookies.txt -X DELETE http://localhost:8080/v1/admin/products/000000000000000000000000 2>&1 | grep HTTP
```
**Expected**: HTTP 404

---

### 12.2 UI Tests

#### TC-10-UI-01: Delete product via list page
1. Go to `/admin/products`, click trash icon on a product
2. Confirm in the modal

**Expected**: Toast "Deleted · <name> removed from catalog". Product disappears from the admin list and from the public storefront.

---

#### TC-10-UI-02: Delete product via edit page
1. Go to `/admin/products/<id>`, click "Delete product"
2. Confirm in the modal

**Expected**: Redirected to `/admin/products`. Product no longer in list.

---

#### TC-10-UI-03: Existing orders unaffected by product deletion
1. Note an existing order that includes the deleted product
2. Go to `/admin/orders/<id>`

**Expected**: Order detail still shows the product name and price from the snapshot.

---

## 13. UC-11 — Update Order Status (Admin)

### 13.1 API Tests

```bash
# Get an order ID in Pending status
ORDER_ID=$(curl -s -b cookies.txt http://localhost:8080/v1/admin/orders | jq -r '.items[] | select(.status=="Pending") | .id' | head -1)
```

#### TC-11-API-01: Advance Pending → Paid
```bash
curl -s -b cookies.txt -X PATCH "http://localhost:8080/v1/admin/orders/$ORDER_ID/status" \
  -H 'Content-Type: application/json' \
  -d '{"status":"Paid"}' | jq
```
**Expected**: HTTP 200; `status: "Paid"`

---

#### TC-11-API-02: Advance Paid → Shipped
```bash
curl -s -b cookies.txt -X PATCH "http://localhost:8080/v1/admin/orders/$ORDER_ID/status" \
  -H 'Content-Type: application/json' \
  -d '{"status":"Shipped"}' | jq
```
**Expected**: HTTP 200; `status: "Shipped"`

---

#### TC-11-API-03: Invalid transition rejected (UC-11 alternative 3a)
```bash
# Try to move Shipped back to Pending (invalid)
curl -s -b cookies.txt -X PATCH "http://localhost:8080/v1/admin/orders/$ORDER_ID/status" \
  -H 'Content-Type: application/json' \
  -d '{"status":"Pending"}' | jq
```
**Expected**: HTTP 400, `code: "invalid_transition"`

---

#### TC-11-API-04: Cancel an order (Pending → Cancelled)
```bash
PENDING_ID=$(curl -s -b cookies.txt http://localhost:8080/v1/admin/orders | jq -r '.items[] | select(.status=="Pending") | .id' | head -1)
curl -s -b cookies.txt -X PATCH "http://localhost:8080/v1/admin/orders/$PENDING_ID/status" \
  -H 'Content-Type: application/json' \
  -d '{"status":"Cancelled"}' | jq
```
**Expected**: HTTP 200; `status: "Cancelled"`

---

#### TC-11-API-05: Cannot change status of Cancelled order
```bash
curl -s -b cookies.txt -X PATCH "http://localhost:8080/v1/admin/orders/$PENDING_ID/status" \
  -H 'Content-Type: application/json' \
  -d '{"status":"Paid"}' | jq
```
**Expected**: HTTP 400, `code: "invalid_transition"`

---

#### TC-11-API-06: Invalid status value
```bash
curl -s -b cookies.txt -X PATCH "http://localhost:8080/v1/admin/orders/$ORDER_ID/status" \
  -H 'Content-Type: application/json' \
  -d '{"status":"Delivered"}' | jq
```
**Expected**: HTTP 400, `code: "invalid_status"` (Delivered is not an allowed transition target)

---

#### TC-11-API-07: Non-admin cannot update status
```bash
curl -s -b customer_cookies.txt -X PATCH "http://localhost:8080/v1/admin/orders/$ORDER_ID/status" \
  -H 'Content-Type: application/json' \
  -d '{"status":"Paid"}' | jq
```
**Expected**: HTTP 401 or 403

---

#### TC-11-API-08: Status change reflected in customer order view
```bash
curl -s -b customer_cookies.txt "http://localhost:8080/v1/orders/$ORDER_ID" | jq '.status'
```
**Expected**: `"Paid"` (or whichever status was set by admin)

---

### 13.2 UI Tests

#### TC-11-UI-01: Admin can view all orders
1. Login as admin, go to `/admin/orders`

**Expected**: Table shows orders from all customers with Order ID, date, total, status.

---

#### TC-11-UI-02: Advance status via dropdown in list
1. Find a Pending order
2. Use the "Advance →" dropdown, select "Mark Paid"

**Expected**: Toast shown. Row updates to "Paid" status.

---

#### TC-11-UI-03: Advance status from order detail page
1. Click on an order, go to detail page `/admin/orders/<id>`
2. Click "Mark Shipped"

**Expected**: Status badge updates to "Shipped". Button disappears (no further transitions available from Shipped).

---

#### TC-11-UI-04: Cancel order
1. On detail page for a Pending or Paid order
2. Click "Cancel order"

**Expected**: Status updates to "Cancelled". No further status buttons shown.

---

## 14. End-to-End Demo Flow

This is the primary acceptance test. Run in order after the full stack is up.

| Step | Action | Expected |
|------|--------|---------|
| 1 | Admin logs in at `/login` | Redirected to `/admin` |
| 2 | Admin adds a product via `/admin/products/new` (SKU=DEMO-001, price=500 THB, stock=10) | Product appears in `/admin/products` and public storefront |
| 3 | Open `/` in a new browser (customer) | DEMO-001 product card visible |
| 4 | Register a customer account at `/register` | Logged in as customer |
| 5 | Search for "DEMO" | Product card shown |
| 6 | Click product → detail page | Add to Cart button visible |
| 7 | Add 2 units to cart | Navigate to `/cart`, see 2× item, correct total |
| 8 | Click "Checkout" | Three-step checkout form |
| 9 | Fill address, use card `4242 4242 4242 4242` | Success page with real MongoDB order ID |
| 10 | Go to `/orders` | Order appears with status "Paid" |
| 11 | Admin goes to `/admin/orders` | Order visible |
| 12 | Admin clicks order → "Mark Shipped" | Status changes to "Shipped" |
| 13 | Customer refreshes `/orders/<id>` | Status shows "Shipped" |
| 14 | Admin edits the product (raise price) | Storefront shows new price; order detail shows original `priceCentsSnapshot` |
| 15 | Admin deletes the product | Public listing excludes it; admin orders history still shows it |

All 15 steps must pass for the demo to be considered complete.

---

## 15. Error Envelope Verification

All API errors must conform to:

```json
{
  "error": {
    "code": "snake_case_string",
    "message": "Human-readable description",
    "fields": { "fieldName": "reason" },
    "details": [ "extra info..." ]
  }
}
```

| Scenario | Code | HTTP |
|----------|------|------|
| Bad credentials | `invalid_credentials` | 401 |
| Not authenticated | `unauthorized` | 401 |
| Not admin | `forbidden` | 403 |
| Invalid ID format | `invalid_id` | 400 |
| Resource not found | `not_found` | 404 |
| Price ≤ 0 | `invalid_price` | 400 |
| Missing required field | `missing_field` | 400 |
| Duplicate SKU | `duplicate_sku` | 409 |
| Cart item out of stock | `out_of_stock` | 409 |
| Empty cart at checkout | `empty_cart` | 400 |
| Payment declined | `payment_declined` | 402 |
| Invalid status transition | `invalid_transition` | 400 |

---

## 16. Regression Checklist

Run after any code change:

- [ ] TC-07-API-01 — Admin login returns 204 + cookie
- [ ] TC-07-UI-04 — Unauthenticated `/admin` redirects to `/login`
- [ ] TC-01-API-01 — Public product list returns 200
- [ ] TC-03-API-01 — Add to cart returns updated cart
- [ ] TC-03-API-03 — Out of stock returns 409
- [ ] TC-05-API-01 — Checkout succeeds with card 4242
- [ ] TC-05-API-04 — Declined card returns 402, cart intact
- [ ] TC-05-UI-05 — Success page shows MongoDB ObjectId (not mock ID)
- [ ] TC-06-API-01 — Order history returns placed orders
- [ ] TC-08-API-01 — Admin can create product (201)
- [ ] TC-08-API-03 — Price ≤ 0 returns 400
- [ ] TC-10-API-02 — Deleted product absent from public list
- [ ] TC-11-API-01 — Admin can advance Pending → Paid
- [ ] TC-11-API-03 — Invalid transition returns 400

---

## 17. Out-of-Scope

- Guest checkout (login required — A-01)
- Real Stripe / payment gateway
- Image upload (external URLs only — A-02)
- SMS or email notifications (A-03)
- Customer self-registration via admin UI (done via `/register` endpoint)
- Real shipping carrier API (flat fee only)
- Playwright / Cypress E2E automation (manual browser tests only)
