# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

OOAD course project (CPE362). Mini e-commerce site implementing 11 use cases from `docs/Shopping_usecase.pdf` (customer: search, view, add-to-cart, view-cart, place order, view orders; admin: login, product CRUD, order status). Monorepo with Next.js storefront, Go REST API, and MongoDB. Three-member team split is documented in `docs/implementation-plan.md` (A = Identity/Admin, B = Catalog/Cart, C = Checkout/Orders).

## Common commands

Run web and API on the host (after `docker run mongo:7` or Dev Container Mongo on :27017):

```bash
cd services/api && go run ./cmd/server     # API on :8080
cd apps/web && npm run dev                  # Web on :3000
cd apps/web && npm run build && npm start
cd apps/web && npm run lint                 # eslint (flat config: eslint.config.mjs)
```

Full stack via Compose:

```bash
docker compose up --build                   # mongo + api + web
```

Go tests (none yet — `go test ./...` from `services/api`). No test runner wired in `apps/web`.

Env: copy `.env.example` to `.env` at repo root. Important vars: `MONGODB_URI`, `MONGODB_DATABASE` (default `mini_shop`), `CORS_ORIGINS`, `API_URL` (Next.js server-side; `http://api:8080` in Compose), `NEXT_PUBLIC_API_URL` (browser; `http://localhost:8080`), `ADMIN_EMAIL`/`ADMIN_PASSWORD` (bootstrap admin), `SESSION_TTL_HOURS`.

## Architecture

**Go API** (`services/api`) — chi router in `cmd/server/main.go`. Module path `github.com/Jarukit-PM/Mini-Shoping-site/services/api`. On startup it: connects Mongo, calls each domain's `EnsureIndexes`, runs `catalog.EnsureDemoProducts`, bootstraps the admin user (`auth.EnsureBootstrapAdmin` + `SyncAdminPasswordFromEnv`), then mounts routes under `/v1`. Domain packages live in `internal/<domain>/` and each owns its Mongo collection + HTTP handlers:

- `internal/catalog/` — products (public list/detail + admin CRUD). Soft delete via `deletedAt`; partial unique index on `sku` filters active rows.
- `internal/cart/` — per-user cart, behind `auth.RequireAuth`.
- `internal/auth/` — opaque session token in httpOnly `auth` cookie (NOT JWT — implementation diverged from the plan doc). `sessions` collection with TTL index on `expiresAt`. `RequireAuth(db)` returns middleware; `RequireAdmin` checks role from the session snapshot to avoid an extra user read. `CookieSecureFromEnv()` controls cookie `Secure` flag.
- `internal/orderadmin/` — admin order status transitions.
- `internal/httpx/json.go` — shared JSON/error helpers.
- `internal/authstub/` — temporary stub used before real auth landed; check before adding new auth code.

Admin routes are nested: `r.Route("/v1/admin", ...)` with `RequireAuth → RequireAdmin`. CORS uses `AllowCredentials: true` and allows the `Cookie` header — the Next.js server must forward cookies on SSR fetches.

**Next.js web** (`apps/web`) — App Router, React 19, Next 16, Tailwind v4 (`@tailwindcss/postcss`), TypeScript. Route groups:

- `app/(storefront)/` — public + customer pages (catalog, product detail, cart, checkout, orders). Shares a layout.
- `app/admin/` — admin console (products, orders); layout guards via `/v1/auth/me`.
- `app/login/` — login form.

`lib/api.ts` exposes `apiBaseUrl()` which prefers `API_URL` (server-side, container-internal) then `NEXT_PUBLIC_API_URL` (browser). `lib/api-server.ts`, `lib/cart.ts`, `lib/orders.ts`, `lib/admin-products.ts` are the per-domain fetch wrappers — extend these rather than calling `fetch` directly from components, and forward cookies for any authed SSR call.

**Money**: always `priceCents` (int64) end-to-end — never floats. **IDs**: Mongo ObjectId hex strings on the wire. **Error envelope** per `docs/implementation-plan.md` is `{ "error": { "code", "message" } }`, but baseline handlers return `{"error":"..."}` — check the package you're editing before assuming a shape.

## Conventions

- New backend feature → new `services/api/internal/<domain>/` package exposing `RegisterRoutes(r chi.Router, db *mongo.Database, ...)` and `EnsureIndexes(ctx, db)`; wire both from `cmd/server/main.go`.
- Stock decrement happens **inside the order transaction after payment success** (per `docs/implementation-plan.md` §2 and UC-05 BR1). Do not decrement on add-to-cart.
- Product delete is **soft** (`deletedAt`); public listings must filter it out (`docs/data-model.md` §"Product delete (UC-10)").
- Implementation plan (`docs/implementation-plan.md`) said JWT; actual code uses **opaque session tokens in Mongo `sessions`**. Trust the code, update the doc if you change auth.

## Reference docs

`docs/architecture.md`, `docs/api-overview.md`, `docs/data-model.md`, `docs/diagrams.md`, `docs/roadmap.md`, `docs/implementation-plan.md` (team split + API contract table), `docs/implementation-plan-member-b.md`, `docs/test-plan-member-b.md`. Source-of-truth use cases: `docs/Shopping_usecase.pdf`.
