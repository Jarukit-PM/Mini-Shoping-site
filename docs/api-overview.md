# API overview

Base URL: `http://localhost:8080` (local) or `http://api:8080` from the Next.js container.

## Versioning

- **Unversioned**: `GET /health` — for probes and the home page status widget.
- **Versioned**: `GET /v1/products` — catalog (list). Expand with `POST`, `PATCH`, etc. when you add admin flows.

## Current endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | JSON `{ "status", "mongo" }`. |
| GET | `/v1/products` | JSON `{ "items": [ Product ] }`. |

## Errors (baseline)

Handlers return minimal JSON on failure, for example `{"error":"database_error"}` with HTTP 500. A later phase can standardize shape: `code`, `message`, `requestId`.

## CORS

Configured from `CORS_ORIGINS` (comma-separated). Must include the Next.js origin (e.g. `http://localhost:3000`).

## Future: authentication

- `POST /v1/auth/login`, refresh, logout.
- Protect mutating routes with middleware; keep catalog reads public or rate-limited as you prefer.
