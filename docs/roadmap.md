# Roadmap

## Phase 0 (current baseline)

- Monorepo layout matching [Apartment-System](https://github.com/Jarukit-PM/Apartment-System): `apps/web`, `services/api`, `deploy/docker`, `.devcontainer`, `docs/`.
- `GET /health`, `GET /v1/products`, demo seed when `products` is empty.
- Next.js home: stack health + product grid.

## Phase 1 — Catalog hardening

- Unique `sku` index; admin `POST/PATCH/DELETE` (behind auth or dev-only key).
- Pagination for `GET /v1/products`.
- Product images (URLs or GridFS — pick one and document).

## Phase 2 — Cart

- Server-side cart session or guest cart collection; API routes under `/v1/cart`.
- Next.js cart page and optimistic UI where safe.

## Phase 3 — Checkout and orders

- Create `orders` from cart; simple payment stub or “cash on delivery” flag for OOAD scope.
- Order history for logged-in users (requires Phase 4).

## Phase 4 — Auth

- Register/login, JWT or httpOnly cookies; protect admin and order endpoints.

## Phase 5 — Quality

- Go tests (`httptest` + testcontainers optional), ESLint in CI, `docker compose build` in CI.

## Related docs

- [architecture.md](./architecture.md)
- [api-overview.md](./api-overview.md)
- [data-model.md](./data-model.md)
