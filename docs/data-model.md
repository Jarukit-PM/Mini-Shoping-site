# Data model (MongoDB)

Database name: **`mini_shop`** (override with `MONGODB_DATABASE`).

## `products` (implemented)

| Field | Type | Notes |
|-------|------|--------|
| `_id` | ObjectId | Primary key. |
| `name` | string | Display name. |
| `description` | string | Optional. |
| `priceCents` | int64 | Integer cents to avoid float rounding. |
| `currency` | string | e.g. `THB`. |
| `sku` | string | Unique per catalog (add unique index when you enforce it). |
| `stock` | int32 | Available quantity. |

**Indexes (recommended next)**:

- Unique index on `sku`.
- Text index on `name` + `description` if you add search.

## `carts` (planned)

Session- or user-scoped cart: `userId` or `sessionId`, `items[]` with `productId`, `qty`, `priceCents` snapshot.

## `orders` (planned)

`orderId`, `status`, `lineItems[]`, `totals`, `createdAt`. Consider embedding vs referencing products.

## `users` (implemented)

| Field | Type | Notes |
|-------|------|--------|
| `_id` | ObjectId | Primary key. |
| `email` | string | Unique index; normalized lowercase. |
| `passwordHash` | string | bcrypt hash. |
| `role` | string | `customer` \| `admin`. |
| `createdAt` | Date | UTC. |

## `sessions` (implemented — login)

Opaque **session token** in the httpOnly `auth` cookie; each login inserts a row here. Middleware validates by lookup + `expiresAt`.

| Field | Type | Notes |
|-------|------|--------|
| `_id` | ObjectId | Primary key. |
| `userId` | ObjectId | FK to `users`. |
| `role` | string | Snapshot at login (used by `RequireAuth` without an extra user read). |
| `token` | string | Random hex (64 chars); **unique index**. |
| `expiresAt` | Date | TTL index (`expireAfterSeconds: 0`) removes expired sessions. |
| `createdAt` | Date | UTC. |

## Product delete (UC-10)

**Soft delete**: `products.deletedAt` set to a timestamp; public `GET /v1/products` omits those rows. Partial unique index on `sku` applies only to active (non-deleted) documents.
