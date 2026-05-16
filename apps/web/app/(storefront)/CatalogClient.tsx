"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Placeholder } from "@/components/Placeholder";
import { formatPriceUSD } from "@/lib/api";
import type { Product } from "@/lib/api";
import { productTone } from "@/lib/tone";

const CATEGORIES = [
  "All",
  "Apparel",
  "Home",
  "Kitchen",
  "Paper",
  "Leather",
  "Pantry",
];

export function CatalogClient({
  initialProducts,
  fetchError,
}: {
  initialProducts: Product[];
  fetchError?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const cat = searchParams.get("category") ?? "All";

  const updateSearchParams = (next: { q?: string; category?: string }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (next.q !== undefined) {
      const nextQ = next.q.trim();
      if (nextQ) params.set("q", nextQ);
      else params.delete("q");
    }

    if (next.category !== undefined) {
      const nextCat = next.category;
      if (!nextCat || nextCat === "All") params.delete("category");
      else params.set("category", nextCat);
    }

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return initialProducts.filter((p) => {
      const inCat = cat === "All" || p.category === cat;
      const inQ =
        !qLower ||
        p.name.toLowerCase().includes(qLower) ||
        (p.category ?? "").toLowerCase().includes(qLower) ||
        (p.description ?? "").toLowerCase().includes(qLower);
      return inCat && inQ;
    });
  }, [initialProducts, q, cat]);

  return (
    <div className="fade-in">
      <section className="page-head">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 40,
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: 640 }}>
            <div className="label" style={{ marginBottom: 14 }}>
              The November Edition · 2025
            </div>
            <h1 className="h-display" style={{ margin: 0 }}>
              Made slowly,
              <br />
              kept a long time.
            </h1>
            <p className="body muted" style={{ maxWidth: 480, marginTop: 18 }}>
              A small catalogue of household objects from independent makers we
              know. Shipped from our studio in Brooklyn.
            </p>
          </div>
          <div className="mono muted" style={{ textAlign: "right" }}>
            <div>
              {String(filtered.length).padStart(2, "0")} / {initialProducts.length} items
            </div>
            <div>Free shipping ≥ $150</div>
          </div>
        </div>
      </section>

      {fetchError && (
        <div className="banner bad" style={{ margin: "24px 40px 0" }}>
          <Icon name="alert" />
          <span>Could not load products — make sure the API is running on <strong>localhost:8080</strong>.</span>
        </div>
      )}

      <section className="catalog-wrap">
        <div className="catalog-toolbar">
          <div className="search">
            <Icon name="search" />
            <input
              value={q}
              onChange={(e) => updateSearchParams({ q: e.target.value })}
              placeholder="Search by name, category, material…"
            />
            {q && (
              <button onClick={() => updateSearchParams({ q: "" })}>
                <Icon name="x" />
              </button>
            )}
          </div>
          <div className="chips">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className={`chip ${cat === c ? "active" : ""}`}
                onClick={() => updateSearchParams({ category: c })}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <Icon name="search" className="xl" />
            <div className="h-3">
              {q ? `Nothing matches "${q}"` : "No products in this category"}
            </div>
            <div className="muted">
              Try fewer keywords, or browse a different category.
            </div>
            <button
              className="btn ghost"
              onClick={() => {
                updateSearchParams({ q: "", category: "All" });
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onClick={() => router.push(`/products/${p.id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ProductCard({
  product,
  onClick,
}: {
  product: Product;
  onClick: () => void;
}) {
  const out = product.stock === 0;
  const low = product.stock > 0 && product.stock < 5;
  return (
    <div className="card" onClick={onClick}>
      <Placeholder
        label={product.name.toUpperCase()}
        tone={productTone(product.id)}
        sku={product.sku}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div className="badge-row">
          {out && <span className="badge bad dot">Sold out</span>}
          {low && (
            <span className="badge warn dot">Low · {product.stock} left</span>
          )}
        </div>
        <div className="card-row">
          <span className="name">{product.name}</span>
          <span className="price">{formatPriceUSD(product.priceCents)}</span>
        </div>
        <div className="meta">
          <span>{product.category}</span>
        </div>
      </div>
    </div>
  );
}
