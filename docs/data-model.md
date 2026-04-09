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

## `users` (planned)

Email, password hash, roles (`customer`, `admin`) when authentication is added.
