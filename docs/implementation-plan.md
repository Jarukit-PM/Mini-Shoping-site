# Implementation Plan — Mini Shopping Site (Team of 3)

This plan turns the 11 use cases in `Shopping_usecase.pdf` into a concrete, parallel-friendly work split across **three teammates**, building on the existing Next.js + Go + MongoDB monorepo.

---

## 1. Overview

- **Goal**: deliver the MVP scope from the use case document — Customer flows (search, view, cart, checkout, order status) and Admin flows (login, product CRUD, order status update), with the Payment Processor modeled as an external actor.
- **Reference**: `Shopping_usecase.pdf` (UC-01 … UC-11), especially UC-05 (Place Order) and UC-08 (Add Product) detailed narratives.
- **Baseline already implemented** (do not re-do):
  - `services/api/cmd/server` boots chi + Mongo, mounts `GET /health` and `GET /v1/products`.
  - `services/api/internal/catalog/` has `product.go`, `handlers.go`, `seed.go` (list + auto-seed).
  - `apps/web/app/page.tsx` calls `GET /v1/products` and `GET /health`.
  - `apps/web/lib/api.ts` resolves the API base URL.
- **Missing**: Product detail/search, Cart, Orders, Auth, Admin UI, Payment stub, Order status updates — i.e. ~90% of MVP.

---

## 2. Architectural Decisions

| Topic | Decision | Rationale |
|---|---|---|
| Auth | **JWT in httpOnly cookie**, set on login, parsed by Go middleware | Survives Next.js SSR; not XSS-exposed |
| Authorization | `requireAuth` and `requireAdmin` chi middlewares; role stored in JWT claims | Single source of truth, easy to mock |
| Payment Processor | Internal Go stub at `services/api/internal/payment/` with success/decline branches selectable by test card number | Exercises UC-05 happy path AND 6a Payment Declined without a real Stripe account |
| Stock decrement | Performed **inside the order-creation transaction**, immediately after payment success (per BR1 Stock Reservation, see UC-05) | Prevents overselling; aligns with the PDF's "Refined/Modified" note |
| Error envelope | `{ "error": { "code": "...", "message": "..." } }`, HTTP status conveys class | Standardize across new endpoints |
| Money | Continue using `priceCents` (int64) — never floats | Matches existing `products` schema |
| ID format | Mongo ObjectId hex strings on the wire | Matches current `products` |

---

## 3. Team Split (Feature-Vertical)

Each member owns a **full vertical** (Go API + Next.js UI + Mongo schema slice). Shared interfaces (auth middleware, error envelope, cart→order handoff) are agreed in Section 5 so members can mock and proceed in parallel.

| Member | Slice | Use Cases | Primary Mongo Collections |
|---|---|---|---|
| **A** | Identity & Admin Console | UC-07, UC-08, UC-09, UC-10, UC-11 | `users`, writes to `products` and `orders.status` |
| **B** | Catalog & Cart | UC-01, UC-02, UC-03, UC-04 | reads `products`, owns `carts` |
| **C** | Checkout & Orders | UC-05, UC-06 | reads `carts` + `products`, owns `orders`, owns payment stub |

---

## 4. Per-Member Checklists

### Member A — Identity & Admin Console

**Backend (Go)** — new package `services/api/internal/auth/`:
- [ ] `user.go` — `User` struct (`_id`, `email`, `passwordHash`, `role`, `createdAt`), Mongo collection accessor.
- [ ] `password.go` — bcrypt hash + compare helpers.
- [ ] `jwt.go` — sign/verify HS256, claims `{sub, role, exp}`, secret from `JWT_SECRET` env.
- [ ] `middleware.go` — `RequireAuth(next)` and `RequireAdmin(next)` chi middlewares; put user/role into request context.
- [ ] `handlers.go` — `POST /v1/auth/login`, `POST /v1/auth/logout` (clears cookie), `GET /v1/auth/me`.
- [ ] Seed an initial admin on boot if `users` is empty (env `ADMIN_EMAIL` / `ADMIN_PASSWORD`) — answers Open Question Q-01.

**Backend (Go)** — extend `services/api/internal/catalog/handlers.go`:
- [ ] `POST /v1/admin/products` — validates `priceCents > 0` (UC-08 5a Invalid Price), `stock >= 0`, required fields. Returns 400 with field-level error envelope.
- [ ] `PATCH /v1/admin/products/:id` — partial update (UC-09).
- [ ] `DELETE /v1/admin/products/:id` — soft or hard delete; choose one and document in `data-model.md` (UC-10).
- [ ] Add unique index on `sku` at startup.

**Backend (Go)** — new package `services/api/internal/orderadmin/` (or extend C's order pkg):
- [ ] `PATCH /v1/admin/orders/:id/status` — body `{ "status": "Paid"|"Shipped"|"Cancelled" }`; validate transitions (UC-11).

**Route wiring** in `services/api/cmd/server/`:
- [ ] Mount all `/v1/admin/*` routes behind `RequireAuth → RequireAdmin`.

**Frontend (Next.js)** — under `apps/web/app/`:
- [ ] `login/page.tsx` — admin login form, POSTs to `/v1/auth/login`, redirects to `/admin`.
- [ ] `admin/layout.tsx` — server component that checks `GET /v1/auth/me`; redirects to `/login` if unauthenticated or non-admin.
- [ ] `admin/products/page.tsx` — table + "Add product" button.
- [ ] `admin/products/new/page.tsx` — form for UC-08 (name, price, category, image URL, stock); shows the "ราคาสินค้าต้องมากกว่า 0" error inline for 5a.
- [ ] `admin/products/[id]/page.tsx` — edit/delete (UC-09, UC-10).
- [ ] `admin/orders/page.tsx` — list orders with a status-change control (UC-11).
- [ ] Extend `apps/web/lib/api.ts` with an `authedFetch` helper that forwards cookies on SSR.

**Acceptance criteria**:
- UC-07 — Admin can log in; non-admins (or unauthenticated) are blocked from `/admin/*` and `/v1/admin/*`.
- UC-08 — Adding a product with `priceCents <= 0` returns 400 with the localized message; valid input appears in `GET /v1/products` immediately.
- UC-09 / UC-10 — Edits and deletes persist and reflect on the storefront.
- UC-11 — Status changes persist; invalid transitions (e.g. `Shipped → Pending`) are rejected.

---

### Member B — Catalog & Cart

**Backend (Go)** — extend `services/api/internal/catalog/`:
- [ ] `handlers.go` — `GET /v1/products/:id` (UC-02). 404 envelope when missing.
- [ ] `handlers.go` — extend `GET /v1/products` with `?q=`, `?category=`, `?page=`, `?pageSize=` (UC-01). Add a text index on `name`+`description` in `seed.go` startup.
- [ ] `product.go` — add `category` and `imageUrl` fields if not present; update demo seed.

**Backend (Go)** — new package `services/api/internal/cart/`:
- [ ] `cart.go` — `Cart { userId, items:[{productId, qty, priceCentsSnapshot}], updatedAt }`, Mongo accessor, unique index on `userId`.
- [ ] `service.go` — upsert-item logic that **rechecks `products.stock`** before incrementing qty (UC-03 stock check). Snapshots price at add-time.
- [ ] `handlers.go` —
  - `GET  /v1/cart` (UC-04) — returns cart + joined product names/prices + line totals + grand total.
  - `POST /v1/cart/items` `{ productId, qty }`.
  - `PATCH /v1/cart/items/:productId` `{ qty }`.
  - `DELETE /v1/cart/items/:productId`.
- [ ] All cart routes behind `RequireAuth` (Member A's middleware — mock with a fake middleware until it lands).

**Route wiring**:
- [ ] Register `/v1/products/:id` and `/v1/cart/*` in `cmd/server`.

**Frontend (Next.js)**:
- [ ] `apps/web/app/products/[id]/page.tsx` — detail view with "Add to cart" button (UC-02, UC-03).
- [ ] `apps/web/app/page.tsx` — extend with a search input + category filter (UC-01); use server component fetching with query params.
- [ ] `apps/web/app/cart/page.tsx` — line items, qty inputs, remove buttons, grand total, "Checkout" CTA → `/checkout` (UC-04).
- [ ] `apps/web/lib/cart.ts` — client helpers that call cart endpoints.

**Acceptance criteria**:
- UC-01 — Searching "shirt" filters the grid; pagination works.
- UC-02 — Direct deep-link to `/products/:id` renders even without prior listing fetch.
- UC-03 — Adding more than `stock` returns 409 with `out_of_stock`; UI surfaces the error.
- UC-04 — Cart page totals match the API response; refresh persists items (server-side cart).

---

### Member C — Checkout & Orders

**Backend (Go)** — new package `services/api/internal/payment/`:
- [ ] `stub.go` — `Charge(cardNumber, amountCents) (Result, error)`. Test cards: `4242…` succeeds, `4000…0002` declines, others succeed. Models the external Payment Processor actor.

**Backend (Go)** — new package `services/api/internal/order/`:
- [ ] `order.go` — `Order { userId, lineItems:[{productId, name, qty, priceCentsSnapshot, lineTotalCents}], totals, shippingAddress, status, paymentRef, createdAt }`.
- [ ] `service.go` — `PlaceOrder(ctx, userId, shipping, payment)`:
  1. Load cart; reject if empty.
  2. Re-validate stock for every line (UC-05 step 8a Concurrent Stock Conflict → return 409 `out_of_stock` listing offending items).
  3. Compute totals from current `products.priceCents` (do NOT trust client prices).
  4. Call `payment.Charge`. On decline (UC-05 6a) → return 402 with `payment_declined`; do NOT create order, do NOT touch stock.
  5. On success → in a Mongo transaction: insert order with `status="Pending"`, decrement each product's stock (`$inc: -qty`), empty the cart.
  6. Return the new Order ID.
- [ ] `handlers.go` —
  - `POST /v1/orders` (UC-05) body `{ shippingAddress, payment: { cardNumber, expiry, cvv } }`.
  - `GET  /v1/orders` — current user's order history (UC-06).
  - `GET  /v1/orders/:id` — single order detail + status (UC-06).
- [ ] All routes behind `RequireAuth`.

**Route wiring**:
- [ ] Register `/v1/orders/*` in `cmd/server`.

**Frontend (Next.js)**:
- [ ] `apps/web/app/checkout/page.tsx` — multistep: summary → address → payment → confirm (UC-05 main flow). Show inline errors for `payment_declined` (6a) and `out_of_stock` (8a, which navigates back to `/cart`).
- [ ] `apps/web/app/checkout/success/[orderId]/page.tsx` — confirmation page showing the Order ID.
- [ ] `apps/web/app/orders/page.tsx` — order history (UC-06).
- [ ] `apps/web/app/orders/[id]/page.tsx` — order detail + status.

**Acceptance criteria**:
- UC-05 happy — Order persists, stock decremented atomically, cart emptied, Order ID shown.
- UC-05 6a — Decline card produces a 402, no order created, stock unchanged, user stays on payment step with an error.
- UC-05 8a — When stock changes mid-flight, server returns 409 and the UI sends the user back to `/cart` with a message.
- UC-06 — A logged-in customer sees only their own orders.

---

## 5. API Contract Table

All paths are prefixed with the API base (`http://localhost:8080`). All requests/responses are JSON. Error responses follow `{ "error": { "code": "...", "message": "..." } }`.

| Method | Path | Auth | Request | Response (2xx) | Errors | Owner | UC |
|---|---|---|---|---|---|---|---|
| POST | `/v1/auth/login` | – | `{email, password}` | `204` + sets `auth` cookie | `401 invalid_credentials` | A | UC-07 |
| POST | `/v1/auth/logout` | cookie | – | `204` clears cookie | – | A | UC-07 |
| GET | `/v1/auth/me` | cookie | – | `{id, email, role}` | `401` | A | UC-07 |
| GET | `/v1/products` | – | `?q&category&page&pageSize` | `{items, page, total}` | – | B | UC-01 |
| GET | `/v1/products/:id` | – | – | `Product` | `404 not_found` | B | UC-02 |
| POST | `/v1/admin/products` | admin | `Product` (no id) | `201 Product` | `400 invalid_price`, `400 missing_field`, `409 duplicate_sku` | A | UC-08 |
| PATCH | `/v1/admin/products/:id` | admin | partial `Product` | `200 Product` | `400`, `404` | A | UC-09 |
| DELETE | `/v1/admin/products/:id` | admin | – | `204` | `404` | A | UC-10 |
| GET | `/v1/cart` | user | – | `{items:[…], grandTotalCents}` | – | B | UC-04 |
| POST | `/v1/cart/items` | user | `{productId, qty}` | `200 Cart` | `409 out_of_stock`, `404` | B | UC-03 |
| PATCH | `/v1/cart/items/:productId` | user | `{qty}` | `200 Cart` | `409 out_of_stock` | B | UC-03 |
| DELETE | `/v1/cart/items/:productId` | user | – | `200 Cart` | `404` | B | UC-04 |
| POST | `/v1/orders` | user | `{shippingAddress, payment}` | `201 {orderId, status}` | `402 payment_declined`, `409 out_of_stock`, `400 empty_cart` | C | UC-05 |
| GET | `/v1/orders` | user | – | `{items:[OrderSummary]}` | – | C | UC-06 |
| GET | `/v1/orders/:id` | user | – | `Order` | `404`, `403 forbidden` | C | UC-06 |
| PATCH | `/v1/admin/orders/:id/status` | admin | `{status}` | `200 Order` | `400 invalid_transition`, `404` | A | UC-11 |

---

## 6. MongoDB Schema Additions

Extends the existing `products` definition in `docs/data-model.md`.

### `users` (new — Member A)
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | PK |
| `email` | string | **unique index** |
| `passwordHash` | string | bcrypt cost 10+ |
| `role` | string | `"customer"` \| `"admin"` |
| `createdAt` | Date | – |

### `products` (extend — Member B)
Add `category` (string) and `imageUrl` (string). Add **unique index on `sku`** and **text index on `name` + `description`**.

### `carts` (new — Member B)
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | PK |
| `userId` | ObjectId | **unique index** (one cart per user) |
| `items` | `[{productId, qty:int, priceCentsSnapshot:int64}]` | snapshot guards against price drift |
| `updatedAt` | Date | – |

### `orders` (new — Member C)
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | PK; surfaced as Order ID |
| `userId` | ObjectId | **index** for UC-06 history |
| `lineItems` | `[{productId, name, qty, priceCentsSnapshot, lineTotalCents}]` | name embedded for historical accuracy |
| `totals` | `{subtotalCents, shippingCents, grandTotalCents}` | shipping = flat-rate per Assumption A-01 |
| `shippingAddress` | embedded doc | name, line1, city, postal, country |
| `status` | string | `"Pending"` \| `"Paid"` \| `"Shipped"` \| `"Cancelled"` |
| `paymentRef` | string | id returned by the stub |
| `createdAt` | Date | – |

---

## 7. Cross-Cutting Coordination

- **Auth middleware contract** (Member A publishes first):
  ```go
  func RequireAuth(http.Handler) http.Handler
  func RequireAdmin(http.Handler) http.Handler
  // request context exposes: auth.UserID(ctx), auth.Role(ctx)
  ```
  Members B and C should import `internal/auth` directly. Until it lands, stub it locally returning a hard-coded userId.
- **Error envelope**: defined once in `internal/httpx/` (new tiny package; Member A creates it as part of auth work) and reused everywhere.
- **CORS / cookies**: existing `CORS_ORIGINS` config must include the Next.js origin **and** `Access-Control-Allow-Credentials: true`. The login cookie is `HttpOnly`, `SameSite=Lax`, `Secure` in production.
- **Payment stub location**: `services/api/internal/payment/` — only Member C edits, exposed via a small interface so it can be swapped for real Stripe later.
- **Env additions** (root `.env.example`): `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SHIPPING_FLAT_CENTS`.

---

## 8. Suggested Integration Order

| Day | Member A | Member B | Member C |
|---|---|---|---|
| 1–2 | **Auth middleware + login** (unblocks B, C) | Product detail + search (no auth needed) | Payment stub, scaffold `internal/order` against mocked cart |
| 3–4 | Admin product CRUD + admin shell UI | **Cart endpoints + `/cart` UI** (unblocks C) | Wire `POST /v1/orders` against real cart; checkout UI |
| 5 | Order-status admin (UC-11) + admin orders page | Search polish (pagination, text index) | Order history pages (UC-06); 6a/8a error paths |
| 6 | Integration testing & seeds | Integration testing | Integration testing |

Demoable checkpoint after Day 4: end-to-end customer flow (login → search → cart → checkout → success).

---

## 9. Out of Scope (per PDF Assumptions)

- Guest checkout (A-01 / BR3 — login required).
- Image uploads — store external URLs only (A-02).
- SMS notifications — on-site only (A-03).
- Customer self-registration — covered by future phase; admins are created via the env-seeded bootstrap account (answers Q-01).
- Real shipping/logistics API (per PDF "Limitations" §3).

---

## 10. Verification Checklist (for the team)

Each member's slice is "done" when:
1. Their endpoints respond per Section 5 (manually exercised with curl / Postman).
2. Their UI pages render and handle the happy path + the exception flows listed in their acceptance criteria.
3. `docker compose up --build` brings the whole stack up and the demo flow login → add to cart → checkout → success → admin sees order → admin ships works end-to-end.
