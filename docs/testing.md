# Testing guide

The repo has **two** automated suites:

| Suite | Location | Runner | Needs Mongo / running API? |
|-------|----------|--------|------------------------------|
| **Web** | `apps/web` | Vitest (`npm run test`) | **No** — `fetch` is mocked; cart uses **happy-dom** for `localStorage`. |
| **Go API** | `services/api` | `go test ./...` | **Usually no.** Most tests are unit-only. **`internal/auth/register_integration_test.go`** talks to Mongo (`MONGODB_URI` or `mongodb://127.0.0.1:27017`) and **`Skip`**s if ping fails — `go test ./...` still exits **0**. |

---

## Run all tests

From the **repository root** (installs web deps if needed, then runs both suites in order):

```bash
(cd apps/web && npm install && npm run test) && (cd services/api && go test ./...)
```

If either suite fails, the chain stops (`&&`).

**Web only** — all Vitest files under `apps/web`:

```bash
cd apps/web
npm install          # first time or after package.json changes
npm run test         # all `**/*.test.ts`
npm run test:watch   # same, re-run on save
```

**Go only** — all packages with tests:

```bash
cd services/api
go test ./...
```

Useful flags:

| Flag | Where | Purpose |
|------|--------|---------|
| `-v` | Go | Verbose test names |
| `-count=1` | Go | Disable cache (repeatable runs) |
| `-cover` | Go | Coverage summary per package |
| `-run <regex>` | Go | Subset, e.g. `go test ./internal/auth -v -run Integration` |
| `npx vitest run <path>` | Web | Single file, e.g. `npx vitest run lib/auth-session.test.ts` |

Vitest config: [`apps/web/vitest.config.ts`](../apps/web/vitest.config.ts). Test files: **`*.test.ts`**.

---

## Test file inventory

**Web (`apps/web`) — 5 files**

| File |
|------|
| [`lib/api.test.ts`](../apps/web/lib/api.test.ts) |
| [`lib/auth-session.test.ts`](../apps/web/lib/auth-session.test.ts) |
| [`lib/cart.test.ts`](../apps/web/lib/cart.test.ts) |
| [`lib/checkout-client.test.ts`](../apps/web/lib/checkout-client.test.ts) |
| [`lib/admin-product-client.test.ts`](../apps/web/lib/admin-product-client.test.ts) |

**Go (`services/api`) — 9 files in 6 packages**

| Package | Test files |
|---------|------------|
| `internal/auth` | `password_test.go`, `bootstrap_test.go`, `register_test.go`, `register_integration_test.go` |
| `internal/authstub` | `authstub_test.go` |
| `internal/httpx` | `json_test.go` |
| `internal/payment` | `stub_test.go` |
| `internal/order` | `order_test.go`, `service_test.go` |

Packages **without** `_test.go` today: `cmd/server`, `internal/cart`, `internal/catalog`, `internal/orderadmin`.

---

## Environment variables and `.env`

- **Tests do not read** the repo root [`.env`](../.env) or [`.env.example`](../.env.example) automatically. They use `t.Setenv` / `process.env` only where each test describes.
- **Web:** mocks `fetch`; some tests set `NEXT_PUBLIC_API_URL` for `apiBaseUrl()`.
- **Go (bootstrap):** [`bootstrap_test.go`](../services/api/internal/auth/bootstrap_test.go) covers **`ADMIN_EMAIL`**, **`ADMIN_PASSWORD`**, **`APP_ENV`** semantics aligned with [`.env.example`](../.env.example).
- **Go (register/login integration):** needs a **running MongoDB** at the URI above; otherwise integration tests **skip** (no failure).

---

## Web app (`apps/web`)

### Prerequisites

- Node.js + npm (see [root README](../README.md) / Dev Container).
- `npm install` in `apps/web` when dependencies change.

### Focused examples

```bash
cd apps/web
npx vitest run lib/api.test.ts
npx vitest run lib/cart.test.ts
npx vitest run lib/auth-session.test.ts
```

### What the web tests cover

| Test file | Main symbols / flows | What “pass” means |
|-----------|----------------------|-------------------|
| [`lib/api.test.ts`](../apps/web/lib/api.test.ts) | `apiBaseUrl`, `formatPrice`, `fetchProducts`, `fetchProduct` | URL env precedence; price formatting; product list URL + query params + errors; single product + 404 `not_found`. |
| [`lib/checkout-client.test.ts`](../apps/web/lib/checkout-client.test.ts) | `parsePlaceOrderResult`, `postPlaceOrder` | Checkout response mapping (201, 402, 409, `empty_cart`, errors); POST `/v1/orders` shape. |
| [`lib/admin-product-client.test.ts`](../apps/web/lib/admin-product-client.test.ts) | `validateNewProductForm`, `parseCreateProductResult`, `postCreateAdminProduct` | Admin create-product validation and API response parsing; POST `/v1/admin/products`. |
| [`lib/cart.test.ts`](../apps/web/lib/cart.test.ts) | `getCart`, `addItem`, `updateQty`, `removeItem` | Authenticated cart HTTP shape; guest **401** path + `localStorage` + mocked catalog fetch. |
| [`lib/auth-session.test.ts`](../apps/web/lib/auth-session.test.ts) | `resolveMeAfterRegister` | After register: **201** + complete JSON → use body; incomplete **201** or **204** → `fetchMe`; else `null`. (`fetchMe` / `storefrontPathAfterAuth` in [`auth-session.ts`](../apps/web/lib/auth-session.ts) are used by login/register pages but not separately unit-tested.) |

Pages [`app/checkout/page.tsx`](../apps/web/app/checkout/page.tsx) and [`app/admin/products/new/page.tsx`](../apps/web/app/admin/products/new/page.tsx) use the `lib/*-client` helpers. [`app/login/page.tsx`](../apps/web/app/login/page.tsx) and [`app/register/page.tsx`](../apps/web/app/register/page.tsx) use [`lib/auth-session.ts`](../apps/web/lib/auth-session.ts).

### Not covered (web)

- Full React E2E (e.g. Playwright).
- [`lib/api-server.ts`](../apps/web/lib/api-server.ts), [`lib/require-signed-in.ts`](../apps/web/lib/require-signed-in.ts) (Next `cookies()` / redirects).

---

## Go API (`services/api`)

### Prerequisites

- Go — see [`go.mod`](../services/api/go.mod).

### Focused examples

```bash
cd services/api
go test ./internal/auth -v -run 'AdminEnv|SyncAdmin|HashPassword|ValidateSignup|Integration'
go test ./internal/payment -v
```

### What the Go tests cover

| Test file | Main symbols / flows | What “pass” means |
|-----------|----------------------|-------------------|
| [`internal/auth/password_test.go`](../services/api/internal/auth/password_test.go) | `HashPassword`, `ComparePassword` | Bcrypt happy path + wrong password + invalid hash. |
| [`internal/auth/bootstrap_test.go`](../services/api/internal/auth/bootstrap_test.go) | Admin env + `SyncAdminPasswordFromEnv` early exit | Trim/lowercase email; both vars required; production / empty creds return without DB (`nil` DB safe). |
| [`internal/auth/register_test.go`](../services/api/internal/auth/register_test.go) | `validateSignupEmail`, `validateSignupPassword` | Sign-up validation rules (email + password length). |
| [`internal/auth/register_integration_test.go`](../services/api/internal/auth/register_integration_test.go) | `RegisterUserHandler`, `loginHandler` | **Mongo or Skip:** **201** + `{id,email,role}` + `auth` cookie; duplicate **409**; login **204** + cookie; isolated DB per run. |
| [`internal/httpx/json_test.go`](../services/api/internal/httpx/json_test.go) | `WriteError*`, `WriteJSON` | JSON status + headers + body shape. |
| [`internal/payment/stub_test.go`](../services/api/internal/payment/stub_test.go) | `Charge` | Stub card rules (`4242`, decline PAN, etc.). |
| [`internal/order/order_test.go`](../services/api/internal/order/order_test.go) | `ErrOutOfStock` | Error string stable. |
| [`internal/order/service_test.go`](../services/api/internal/order/service_test.go) | `ShippingFlatCents`, `activeProductFilter` | Env shipping + BSON filter. |
| [`internal/authstub/authstub_test.go`](../services/api/internal/authstub/authstub_test.go) | `UserID`, `RequireAuth` | Stub auth middleware. |

### Not covered (Go)

- Most route handlers beyond register/login integration; **`EnsureBootstrapAdmin`** full insert path; **`cmd/server`** HTTP wiring.

---

## Troubleshooting

| Symptom | What to try |
|---------|-------------|
| Web: missing modules | `cd apps/web && npm install` |
| Web: npm `EBADENGINE` / Node warnings | Align Node with Dev Container / `eslint-config-next`; tests often still pass. |
| Go: `cannot find main module` | Run from **`services/api`**, or `go test -C services/api ./...` from repo root. |
| Go: slow `internal/auth` | Bcrypt dominates; run `go test ./internal/payment` etc. to scope. |
| Go: integration tests always skipped | Start **MongoDB** and set **`MONGODB_URI`** if not on `127.0.0.1:27017`. |

---

## Related docs

- Run the full stack: [root README](../README.md).
- Docs index: [docs/README.md](./README.md).
- Register/login API: [api-overview.md](./api-overview.md).
