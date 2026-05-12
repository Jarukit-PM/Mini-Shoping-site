# Implementation Plan — Member B (Catalog & Cart)

> Standalone, code-level execution plan for **Member B**. Companion to `docs/implementation-plan.md` (combined team plan). Use that file for cross-team coordination and this file as your day-to-day execution reference.

---

## 1. Overview & Scope

| Use Case | Goal | Deliverable |
|---|---|---|
| **UC-01** Search Products | Find products via keyword / category | `GET /v1/products?q&category&page&pageSize` + storefront search/filter |
| **UC-02** View Product Details | See price + details before buy | `GET /v1/products/{id}` + `/products/[id]` page |
| **UC-03** Add Product to Cart | Add item to cart with stock check | `POST /v1/cart/items` (recheck stock, snapshot price) + "Add to Cart" button |
| **UC-04** View Shopping Cart | Review items + total before checkout | `GET /v1/cart` + `/cart` page; PATCH/DELETE for line edits |

**Out of scope for Member B** (do NOT implement):
- Auth (Member A) — Member B uses a temporary `authstub` package.
- Checkout, payment, order creation, order history (Member C).
- Admin product CRUD, order status (Member A).

**Reference**: `Shopping_usecase.pdf` UC-01..04, BR1 (Stock Reservation re-checked at add-to-cart).

---

## 2. Dependencies & Coordination

### 2.1 Auth stub strategy
Member A owns `internal/auth`. Until it lands, Member B ships `services/api/internal/authstub/` with the same interface so cart code is auth-aware from day one. Migration is a single import-line change.

```go
// stub today
import "github.com/Jarukit-PM/Mini-Shoping-site/services/api/internal/authstub"
cart.RegisterRoutes(r, db, authstub.RequireAuth)
userID := authstub.UserID(r.Context())

// after Member A merges
import "github.com/Jarukit-PM/Mini-Shoping-site/services/api/internal/auth"
cart.RegisterRoutes(r, db, auth.RequireAuth)
userID := auth.UserID(r.Context())
```

### 2.2 Error envelope (agreed across team)
```json
{ "error": { "code": "out_of_stock", "message": "Only 3 left", "details": { "productId": "...", "available": 3 } } }
```
- HTTP status conveys class (400/401/404/409).
- All Member B handlers MUST emit this shape. A tiny helper in `cart/handlers.go` (or shared `internal/httpx` once Member A creates it) is fine — do not pull in a heavy library.

### 2.3 Shared contracts
- Money: `int64` cents (`priceCents`). Never floats.
- IDs on the wire: Mongo ObjectId hex strings.
- Cookies: cart endpoints rely on the auth cookie set by `/v1/auth/login`. For the stub, send header `X-Stub-User-Id: <hex>` from the frontend during dev.

---

## 3. Backend Tasks (Go)

Module path: `github.com/Jarukit-PM/Mini-Shoping-site/services/api`.

### 3.1 Extend `Product` struct

**File**: `services/api/internal/catalog/product.go`

```go
type Product struct {
    ID          primitive.ObjectID `json:"id"          bson:"_id,omitempty"`
    Name        string             `json:"name"        bson:"name"`
    Description string             `json:"description" bson:"description"`
    Category    string             `json:"category"    bson:"category"`     // NEW
    ImageUrl    string             `json:"imageUrl"    bson:"imageUrl"`     // NEW
    PriceCents  int64              `json:"priceCents"  bson:"priceCents"`
    Currency    string             `json:"currency"    bson:"currency"`
    SKU         string             `json:"sku"         bson:"sku"`
    Stock       int32              `json:"stock"       bson:"stock"`
}
```

### 3.2 Indexes + refreshed seed

**File**: `services/api/internal/catalog/seed.go`

Add an index-bootstrap function called once on startup:

```go
func EnsureIndexes(ctx context.Context, db *mongo.Database) error {
    col := db.Collection("products")
    _, err := col.Indexes().CreateMany(ctx, []mongo.IndexModel{
        {
            Keys:    bson.D{{Key: "sku", Value: 1}},
            Options: options.Index().SetUnique(true).SetName("ux_products_sku"),
        },
        {
            Keys:    bson.D{{Key: "name", Value: "text"}, {Key: "description", Value: "text"}},
            Options: options.Index().SetName("tx_products_search"),
        },
        {
            Keys:    bson.D{{Key: "category", Value: 1}},
            Options: options.Index().SetName("ix_products_category"),
        },
    })
    return err
}
```

Refresh `EnsureDemoProducts` to populate `Category` + `ImageUrl` on the three demo rows.

Call both from `cmd/server/main.go` startup, before mounting routes.

### 3.3 `GET /v1/products` — search + paging (UC-01)

**File**: `services/api/internal/catalog/handlers.go`

```go
func listProducts(db *mongo.Database) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
        defer cancel()

        q := strings.TrimSpace(r.URL.Query().Get("q"))
        category := strings.TrimSpace(r.URL.Query().Get("category"))
        page := atoiOr(r.URL.Query().Get("page"), 1)
        if page < 1 { page = 1 }
        pageSize := atoiOr(r.URL.Query().Get("pageSize"), 20)
        if pageSize < 1 || pageSize > 100 { pageSize = 20 }

        filter := bson.M{}
        if q != "" { filter["$text"] = bson.M{"$search": q} }
        if category != "" { filter["category"] = category }

        col := db.Collection("products")
        total, err := col.CountDocuments(ctx, filter)
        if err != nil { writeError(w, 500, "database_error", err.Error()); return }

        opts := options.Find().
            SetSkip(int64((page - 1) * pageSize)).
            SetLimit(int64(pageSize)).
            SetSort(bson.D{{Key: "name", Value: 1}})

        cur, err := col.Find(ctx, filter, opts)
        if err != nil { writeError(w, 500, "database_error", err.Error()); return }
        defer cur.Close(ctx)

        items := []Product{}
        if err := cur.All(ctx, &items); err != nil {
            writeError(w, 500, "database_error", err.Error()); return
        }
        writeJSON(w, 200, map[string]any{
            "items": items, "page": page, "pageSize": pageSize, "total": total,
        })
    }
}
```

`atoiOr`, `writeJSON`, `writeError` are tiny local helpers (put them in `catalog/http.go`).

### 3.4 `GET /v1/products/{id}` (UC-02)

```go
func getProduct(db *mongo.Database) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        idHex := chi.URLParam(r, "id")
        id, err := primitive.ObjectIDFromHex(idHex)
        if err != nil { writeError(w, 400, "bad_id", "invalid product id"); return }

        ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
        defer cancel()

        var p Product
        err = db.Collection("products").FindOne(ctx, bson.M{"_id": id}).Decode(&p)
        if errors.Is(err, mongo.ErrNoDocuments) {
            writeError(w, 404, "not_found", "product not found"); return
        }
        if err != nil { writeError(w, 500, "database_error", err.Error()); return }
        writeJSON(w, 200, p)
    }
}
```

Register both routes:
```go
func RegisterRoutes(r chi.Router, db *mongo.Database) {
    r.Get("/products", listProducts(db))
    r.Get("/products/{id}", getProduct(db))
}
```

### 3.5 `internal/authstub` (temporary)

**File**: `services/api/internal/authstub/authstub.go`

```go
package authstub

import (
    "context"
    "net/http"

    "go.mongodb.org/mongo-driver/bson/primitive"
)

type ctxKey int
const userIDKey ctxKey = 1

// Fixed dev user for local work without auth headers.
var devUserID = primitive.NewObjectIDFromTimestamp(timeMustParse("2025-01-01T00:00:00Z"))

func RequireAuth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        hex := r.Header.Get("X-Stub-User-Id")
        uid := devUserID
        if hex != "" {
            if parsed, err := primitive.ObjectIDFromHex(hex); err == nil { uid = parsed }
        }
        ctx := context.WithValue(r.Context(), userIDKey, uid)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

func UserID(ctx context.Context) primitive.ObjectID {
    if v, ok := ctx.Value(userIDKey).(primitive.ObjectID); ok { return v }
    return primitive.NilObjectID
}
```

> Delete this package the day Member A's `internal/auth` lands; the public API matches.

### 3.6 `internal/cart/cart.go`

```go
package cart

import (
    "time"
    "go.mongodb.org/mongo-driver/bson/primitive"
)

type CartItem struct {
    ProductID          primitive.ObjectID `bson:"productId"          json:"productId"`
    Qty                int32              `bson:"qty"                json:"qty"`
    PriceCentsSnapshot int64              `bson:"priceCentsSnapshot" json:"priceCentsSnapshot"`
}

type Cart struct {
    ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
    UserID    primitive.ObjectID `bson:"userId"        json:"userId"`
    Items     []CartItem         `bson:"items"         json:"items"`
    UpdatedAt time.Time          `bson:"updatedAt"     json:"updatedAt"`
}
```

Index bootstrap (call from `main.go` after Mongo connect):
```go
func EnsureIndexes(ctx context.Context, db *mongo.Database) error {
    _, err := db.Collection("carts").Indexes().CreateOne(ctx, mongo.IndexModel{
        Keys:    bson.D{{Key: "userId", Value: 1}},
        Options: options.Index().SetUnique(true).SetName("ux_carts_userId"),
    })
    return err
}
```

### 3.7 `internal/cart/service.go`

```go
var ErrOutOfStock = errors.New("out_of_stock")
var ErrProductNotFound = errors.New("product_not_found")

type Service struct{ db *mongo.Database }

func New(db *mongo.Database) *Service { return &Service{db: db} }

// AddItem increments qty for an existing line or appends a new one.
// Always re-reads product stock and snapshots the current price (BR1).
func (s *Service) AddItem(ctx context.Context, userID, productID primitive.ObjectID, qty int32) (*Cart, error) {
    if qty <= 0 { return nil, errors.New("invalid_qty") }

    var p struct {
        Stock      int32 `bson:"stock"`
        PriceCents int64 `bson:"priceCents"`
    }
    err := s.db.Collection("products").FindOne(ctx, bson.M{"_id": productID}).Decode(&p)
    if errors.Is(err, mongo.ErrNoDocuments) { return nil, ErrProductNotFound }
    if err != nil { return nil, err }

    cart, err := s.getOrCreate(ctx, userID)
    if err != nil { return nil, err }

    existingQty := int32(0)
    for _, it := range cart.Items { if it.ProductID == productID { existingQty = it.Qty; break } }
    if existingQty+qty > p.Stock { return nil, ErrOutOfStock }

    // Upsert-line via two-phase: try $inc on matching line, else $push.
    col := s.db.Collection("carts")
    res, err := col.UpdateOne(ctx,
        bson.M{"userId": userID, "items.productId": productID},
        bson.M{
            "$inc": bson.M{"items.$.qty": qty},
            "$set": bson.M{"items.$.priceCentsSnapshot": p.PriceCents, "updatedAt": time.Now()},
        },
    )
    if err != nil { return nil, err }
    if res.MatchedCount == 0 {
        _, err = col.UpdateOne(ctx, bson.M{"userId": userID},
            bson.M{
                "$push": bson.M{"items": CartItem{ProductID: productID, Qty: qty, PriceCentsSnapshot: p.PriceCents}},
                "$set":  bson.M{"updatedAt": time.Now()},
            })
        if err != nil { return nil, err }
    }
    return s.get(ctx, userID)
}

func (s *Service) SetQty(ctx context.Context, userID, productID primitive.ObjectID, qty int32) (*Cart, error) {
    if qty < 0 { return nil, errors.New("invalid_qty") }
    if qty == 0 { return s.RemoveItem(ctx, userID, productID) }

    var p struct{ Stock int32 `bson:"stock"` }
    if err := s.db.Collection("products").FindOne(ctx, bson.M{"_id": productID}).Decode(&p); err != nil {
        if errors.Is(err, mongo.ErrNoDocuments) { return nil, ErrProductNotFound }
        return nil, err
    }
    if qty > p.Stock { return nil, ErrOutOfStock }

    _, err := s.db.Collection("carts").UpdateOne(ctx,
        bson.M{"userId": userID, "items.productId": productID},
        bson.M{"$set": bson.M{"items.$.qty": qty, "updatedAt": time.Now()}})
    if err != nil { return nil, err }
    return s.get(ctx, userID)
}

func (s *Service) RemoveItem(ctx context.Context, userID, productID primitive.ObjectID) (*Cart, error) {
    _, err := s.db.Collection("carts").UpdateOne(ctx,
        bson.M{"userId": userID},
        bson.M{
            "$pull": bson.M{"items": bson.M{"productId": productID}},
            "$set":  bson.M{"updatedAt": time.Now()},
        })
    if err != nil { return nil, err }
    return s.get(ctx, userID)
}

func (s *Service) Get(ctx context.Context, userID primitive.ObjectID) (*Cart, error) { return s.get(ctx, userID) }

func (s *Service) getOrCreate(ctx context.Context, userID primitive.ObjectID) (*Cart, error) {
    col := s.db.Collection("carts")
    _, err := col.UpdateOne(ctx,
        bson.M{"userId": userID},
        bson.M{"$setOnInsert": bson.M{"userId": userID, "items": []CartItem{}, "updatedAt": time.Now()}},
        options.Update().SetUpsert(true),
    )
    if err != nil { return nil, err }
    return s.get(ctx, userID)
}

func (s *Service) get(ctx context.Context, userID primitive.ObjectID) (*Cart, error) {
    var c Cart
    err := s.db.Collection("carts").FindOne(ctx, bson.M{"userId": userID}).Decode(&c)
    if errors.Is(err, mongo.ErrNoDocuments) { return &Cart{UserID: userID, Items: []CartItem{}}, nil }
    return &c, err
}
```

### 3.8 `internal/cart/handlers.go`

```go
type cartLineResponse struct {
    ProductID      primitive.ObjectID `json:"productId"`
    Name           string             `json:"name"`
    ImageUrl       string             `json:"imageUrl"`
    Qty            int32              `json:"qty"`
    UnitPriceCents int64              `json:"unitPriceCents"` // snapshot
    LineTotalCents int64              `json:"lineTotalCents"`
}

type cartResponse struct {
    Items           []cartLineResponse `json:"items"`
    GrandTotalCents int64              `json:"grandTotalCents"`
    Currency        string             `json:"currency"`
}

func RegisterRoutes(r chi.Router, db *mongo.Database, requireAuth func(http.Handler) http.Handler) {
    svc := New(db)
    r.Route("/cart", func(r chi.Router) {
        r.Use(requireAuth)
        r.Get("/", getCartHandler(svc, db))
        r.Post("/items", addItemHandler(svc, db))
        r.Patch("/items/{productId}", setQtyHandler(svc, db))
        r.Delete("/items/{productId}", removeItemHandler(svc, db))
    })
}
```

Each handler:
1. Pulls `userID` from `authstub.UserID(r.Context())`.
2. Calls the service method.
3. Maps errors → envelope:
   - `ErrOutOfStock` → 409 `out_of_stock`
   - `ErrProductNotFound` → 404 `not_found`
   - validation → 400
4. For responses, joins `products` (one `Find` with `{_id: {$in: ids}}`) to enrich each line with `name` + `imageUrl` + computed `lineTotalCents`.

### 3.9 Wire it up

**File**: `services/api/cmd/server/main.go`

```go
// after Mongo connect, before r.Mount:
if err := catalog.EnsureIndexes(ctx, db); err != nil { logger.Error("indexes", "err", err) }
if err := cart.EnsureIndexes(ctx, db);    err != nil { logger.Error("indexes", "err", err) }
_ = catalog.EnsureDemoProducts(ctx, db)

r.Route("/v1", func(r chi.Router) {
    catalog.RegisterRoutes(r, db)              // GET /v1/products, GET /v1/products/{id}
    cart.RegisterRoutes(r, db, authstub.RequireAuth) // /v1/cart/*
})
```

---

## 4. Frontend Tasks (Next.js)

### 4.1 `apps/web/lib/api.ts` — extend

```ts
export type Product = {
  id: string; name: string; description?: string;
  category?: string; imageUrl?: string;
  priceCents: number; currency: string; sku: string; stock: number;
};

export type ProductListParams = { q?: string; category?: string; page?: number; pageSize?: number };

export type ProductsResponse = { items: Product[]; page: number; pageSize: number; total: number };

export async function fetchProducts(p: ProductListParams = {}): Promise<ProductsResponse> {
  const url = new URL(`${apiBaseUrl()}/v1/products`);
  if (p.q)        url.searchParams.set("q", p.q);
  if (p.category) url.searchParams.set("category", p.category);
  if (p.page)     url.searchParams.set("page", String(p.page));
  if (p.pageSize) url.searchParams.set("pageSize", String(p.pageSize));
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchProducts ${res.status}`);
  return res.json();
}

export async function fetchProduct(id: string): Promise<Product> {
  const res = await fetch(`${apiBaseUrl()}/v1/products/${id}`, { cache: "no-store" });
  if (res.status === 404) throw new Error("not_found");
  if (!res.ok) throw new Error(`fetchProduct ${res.status}`);
  return res.json();
}
```

### 4.2 `apps/web/lib/cart.ts` — new

```ts
import { apiBaseUrl } from "./api";

export type CartLine = {
  productId: string; name: string; imageUrl?: string;
  qty: number; unitPriceCents: number; lineTotalCents: number;
};
export type Cart = { items: CartLine[]; grandTotalCents: number; currency: string };

const STUB_HEADER = { "X-Stub-User-Id": "65a000000000000000000001" };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...STUB_HEADER, ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body?.error?.code ?? `http_${res.status}`), { status: res.status, body });
  }
  return res.json();
}

export const getCart    = () => call<Cart>("/v1/cart");
export const addItem    = (productId: string, qty: number) => call<Cart>("/v1/cart/items",       { method: "POST",   body: JSON.stringify({ productId, qty }) });
export const updateQty  = (productId: string, qty: number) => call<Cart>(`/v1/cart/items/${productId}`, { method: "PATCH",  body: JSON.stringify({ qty }) });
export const removeItem = (productId: string)              => call<Cart>(`/v1/cart/items/${productId}`, { method: "DELETE" });
```

> The stub header is dev-only; remove after Member A's cookie auth is wired.

### 4.3 `apps/web/app/page.tsx` — search + filter (UC-01)

```tsx
import { fetchProducts } from "@/lib/api";
import { SearchBar } from "@/components/SearchBar";
import { ProductCard } from "@/components/ProductCard";

export default async function Home({ searchParams }: { searchParams: { q?: string; category?: string; page?: string } }) {
  const page = Number(searchParams.page ?? 1);
  const data = await fetchProducts({ q: searchParams.q, category: searchParams.category, page });

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <SearchBar initialQ={searchParams.q ?? ""} initialCategory={searchParams.category ?? ""} />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {data.items.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
      <Pagination page={page} pageSize={data.pageSize} total={data.total} />
    </main>
  );
}
```

`SearchBar` is a client component that `router.push`es `?q=&category=` so the server component re-fetches.

### 4.4 `apps/web/app/products/[id]/page.tsx` — detail (UC-02, UC-03 entry)

```tsx
import { fetchProduct, formatPrice } from "@/lib/api";
import { AddToCartButton } from "@/components/AddToCartButton";
import { notFound } from "next/navigation";

export default async function ProductPage({ params }: { params: { id: string } }) {
  try {
    const p = await fetchProduct(params.id);
    return (
      <main className="p-6 max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
        {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="rounded-lg" />}
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">{p.name}</h1>
          <p className="text-xl">{formatPrice(p.priceCents, p.currency)}</p>
          <p className="text-sm opacity-80">{p.description}</p>
          <p className="text-xs opacity-60">In stock: {p.stock}</p>
          <AddToCartButton productId={p.id} maxStock={p.stock} />
        </div>
      </main>
    );
  } catch (e: any) {
    if (e.message === "not_found") notFound();
    throw e;
  }
}
```

`AddToCartButton` (client): qty input, calls `addItem(...)`, on 409 shows inline "Only N left" using `err.body.error.details.available`.

### 4.5 `apps/web/app/cart/page.tsx` — cart (UC-04)

```tsx
"use client";
import { useEffect, useState } from "react";
import { getCart, updateQty, removeItem, type Cart } from "@/lib/cart";
import Link from "next/link";

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => { getCart().then(setCart).catch(e => setErr(e.message)); }, []);

  if (err) return <p className="p-6 text-red-600">Error: {err}</p>;
  if (!cart) return <p className="p-6">Loading…</p>;
  if (cart.items.length === 0) return <p className="p-6">Your cart is empty.</p>;

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Your Cart</h1>
      {cart.items.map(line => (
        <div key={line.productId} className="flex items-center gap-4 border-b pb-3">
          {line.imageUrl && <img src={line.imageUrl} className="w-20 h-20 rounded" alt={line.name} />}
          <div className="flex-1">
            <p>{line.name}</p>
            <p className="text-sm opacity-70">{(line.unitPriceCents / 100).toFixed(2)} × {line.qty} = {(line.lineTotalCents / 100).toFixed(2)}</p>
          </div>
          <input type="number" min={1} value={line.qty}
            onChange={async e => { try { setCart(await updateQty(line.productId, Number(e.target.value))); } catch (er:any) { setErr(er.message); } }}
            className="w-20 border rounded p-1" />
          <button onClick={async () => setCart(await removeItem(line.productId))}>Remove</button>
        </div>
      ))}
      <div className="flex justify-between items-center pt-4">
        <p className="text-lg">Grand total: {(cart.grandTotalCents / 100).toFixed(2)} {cart.currency}</p>
        <Link href="/checkout" className="px-4 py-2 bg-black text-white rounded">Checkout</Link>
      </div>
    </main>
  );
}
```

### 4.6 New components (`apps/web/components/`)
- `SearchBar.tsx` — client; debounced input + category dropdown; uses `useRouter().push()`.
- `ProductCard.tsx` — server-friendly card with name, price, image, link to `/products/[id]`.
- `AddToCartButton.tsx` — client; qty + button + inline error.
- `QtyInput.tsx` — small reusable.

---

## 5. API Contract — Member B slice

| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/v1/products` | — | query: `q, category, page, pageSize` | `200 {items, page, pageSize, total}` | — |
| GET | `/v1/products/{id}` | — | — | `200 Product` | `400 bad_id`, `404 not_found` |
| GET | `/v1/cart` | user | — | `200 {items[], grandTotalCents, currency}` | `401` |
| POST | `/v1/cart/items` | user | `{productId, qty}` | `200 Cart` | `400 invalid_qty`, `404 product_not_found`, `409 out_of_stock` |
| PATCH | `/v1/cart/items/{productId}` | user | `{qty}` | `200 Cart` | `404`, `409 out_of_stock` |
| DELETE | `/v1/cart/items/{productId}` | user | — | `200 Cart` | `404` |

**Example — out of stock**
```http
POST /v1/cart/items
{ "productId": "65a...", "qty": 99 }

HTTP/1.1 409 Conflict
{ "error": { "code": "out_of_stock", "message": "Only 3 left",
             "details": { "productId": "65a...", "available": 3 } } }
```

---

## 6. MongoDB Schema — Member B slice

### `products` (extended)
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | PK |
| `name` | string | required; **text index** |
| `description` | string | **text index** |
| `category` | string | **single-field index** |
| `imageUrl` | string | external URL only (Assumption A-02) |
| `priceCents` | int64 | > 0 enforced by Member A's admin handler |
| `currency` | string | e.g. `"THB"` |
| `sku` | string | **unique index** |
| `stock` | int32 | ≥ 0 |

### `carts` (new)
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | PK |
| `userId` | ObjectId | **unique index** (one cart per user) |
| `items` | `[{productId, qty, priceCentsSnapshot}]` | snapshot price at add-time |
| `updatedAt` | Date | – |

---

## 7. Acceptance Criteria

| UC | How to verify |
|---|---|
| UC-01 | `curl '…/v1/products?q=bottle'` returns only matching items; `?page=2&pageSize=2` paginates; UI search box filters the grid live. |
| UC-02 | `curl …/v1/products/{validId}` returns the product; bad hex → 400; non-existent → 404; UI deep-link `/products/{id}` renders without homepage load. |
| UC-03 | Adding `qty > stock` returns 409 `out_of_stock`; UI surfaces "Only N left"; successful add updates `carts.items`. |
| UC-04 | `GET /v1/cart` after adds returns correct line totals + grand total; reloading the cart page after refresh shows the same items (server-side persistence). |

---

## 8. Verification Steps

### 8.1 Run the stack
```powershell
cd D:\Work\KMUTT\CPE362_OOAD\Project\Mini-Shoping-site
docker compose up --build
```
API at `http://localhost:8080`, web at `http://localhost:3000`.

### 8.2 Manual curl smoke
```bash
# UC-01 search
curl -s 'http://localhost:8080/v1/products?q=bottle' | jq

# UC-02 detail (replace ID)
curl -s 'http://localhost:8080/v1/products/<id>' | jq

# UC-03 add to cart (stub header until auth lands)
curl -s -X POST 'http://localhost:8080/v1/cart/items' \
     -H 'Content-Type: application/json' \
     -H 'X-Stub-User-Id: 65a000000000000000000001' \
     -d '{"productId":"<id>","qty":1}' | jq

# UC-04 view cart
curl -s 'http://localhost:8080/v1/cart' \
     -H 'X-Stub-User-Id: 65a000000000000000000001' | jq
```

### 8.3 UI walkthrough
1. Open `/` — products render. Type "bottle" → grid filters.
2. Click a card → detail page. Click **Add to Cart**.
3. Navigate to `/cart` — line appears with correct totals.
4. Change qty to a number > stock → inline "Only N left".
5. Reduce qty / remove → totals update.

### 8.4 Auth migration sanity check
When Member A merges `internal/auth`:
1. Replace `authstub` import with `auth` in `cmd/server/main.go` and any handler that calls `UserID`.
2. Remove `X-Stub-User-Id` header in `apps/web/lib/cart.ts`; keep `credentials: "include"`.
3. Delete `internal/authstub/` package.
4. Re-run §8.2 with a real cookie from `POST /v1/auth/login`.

---

## 9. Day-by-Day Sequencing

| Day | Backend | Frontend |
|---|---|---|
| **D1** | Product struct fields, indexes, `GET /v1/products/{id}`, query params on `/v1/products` | — |
| **D2** | `authstub`, `cart` package (struct, service, handlers), wire `/v1/cart/*` | `lib/api.ts` + `lib/cart.ts` updates |
| **D3** | Polish (joined cart response, error envelopes, edge cases) | `app/page.tsx` search + `app/products/[id]/page.tsx` |
| **D4** | Integration testing against Member C's checkout (cart → order handoff) | `app/cart/page.tsx` + components; manual UI test pass |

---

## 10. Migration Note — When Member A's Auth Lands

Only three edits remove the stub:

1. `services/api/cmd/server/main.go`
   ```diff
   - import "…/internal/authstub"
   + import "…/internal/auth"
   - cart.RegisterRoutes(r, db, authstub.RequireAuth)
   + cart.RegisterRoutes(r, db, auth.RequireAuth)
   ```
2. Any `authstub.UserID(ctx)` call sites → `auth.UserID(ctx)` (identical signature).
3. `apps/web/lib/cart.ts` — remove `STUB_HEADER` and its spread.

No business logic in `internal/cart` needs to change.
