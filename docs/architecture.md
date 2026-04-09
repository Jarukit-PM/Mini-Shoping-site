# Architecture

## Context

- **Shoppers** use the browser to browse the catalog (and later cart/checkout).
- **Staff / admins** (future) manage inventory and orders.
- **Mini Shopping Site** is delivered as a **Next.js** storefront and a **Go** JSON API backed by **MongoDB**.

## Containers

| Container | Responsibility |
|-----------|----------------|
| `apps/web` (Next.js) | Server-rendered pages, server-side calls to the API via `API_URL`, optional client calls via `NEXT_PUBLIC_API_URL`. |
| `services/api` (Go) | REST API, CORS, structured logging, MongoDB access. Versioned routes under `/v1`. |
| MongoDB | Document store for products, and later carts, orders, users. |

## Technology decisions

- **Next.js + React**: Same stack as Apartment-System for consistency across course projects.
- **Go + chi**: Small binary, explicit HTTP handlers, easy to grow with `internal/<domain>` packages.
- **MongoDB**: Flexible schema for evolving product attributes and order documents.
- **Docker Compose**: One command to run web, api, and mongo for demos and grading.

## Security boundaries (baseline)

- **Phase 0**: No authentication; catalog is read-only from the public internet in dev only. Do not expose raw MongoDB to the public internet in production.
- **Later**: JWT or session cookies, HTTPS, rate limiting, and input validation on write endpoints.

## Deployment view

- **Development**: Dev Container or host-run `go run` + `npm run dev` with local or containerized MongoDB.
- **Docker Compose**: Builds API and web images from `deploy/docker/`; web uses `API_URL=http://api:8080` for server-side fetches.
