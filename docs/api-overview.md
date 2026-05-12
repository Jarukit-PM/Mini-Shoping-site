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
| POST | `/v1/auth/register` | JSON body `{ "email", "password" }`. Creates a **customer** user, sets `auth` session cookie. **201** on success with JSON `{ "id", "email", "role" }` (new MongoDB user id as `id`); **204** is still accepted by older clients. **409** `email_taken` if the email exists; **400** for invalid email or weak password (min 8 chars, max 72). |
| POST | `/v1/auth/login` | JSON `{ "email", "password" }`. **204** + session cookie on success. |
| POST | `/v1/auth/logout` | Clears session cookie. **204**. |
| GET | `/v1/auth/me` | Requires session cookie. JSON `{ "id", "email", "role" }`. |

## Errors (baseline)

Handlers return minimal JSON on failure, for example `{"error":"database_error"}` with HTTP 500. A later phase can standardize shape: `code`, `message`, `requestId`.

## CORS

Configured from `CORS_ORIGINS` (comma-separated). Must include the Next.js origin (e.g. `http://localhost:3000`).

## Authentication (implemented)

- Public **register** and **login** set an httpOnly **`auth`** cookie (opaque token in MongoDB `sessions`).
- **Customer** self-registration: `POST /v1/auth/register`.
- **Admin** bootstrap when `users` is empty: env `ADMIN_EMAIL` / `ADMIN_PASSWORD` (see `.env.example`).
- Protect mutating routes with middleware; catalog reads remain public for browsing.
