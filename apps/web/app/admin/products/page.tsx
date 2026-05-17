"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Placeholder } from "@/components/Placeholder";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";
import { listAllProducts, type AdminProduct } from "@/lib/admin-products";
import { formatPriceUSD, apiBaseUrl } from "@/lib/api";

export default function AdminProductsPage() {
  const router = useRouter();
  const { push } = useToast();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [q, setQ] = useState("");
  const [confirmDel, setConfirmDel] = useState<AdminProduct | null>(null);

  function load() {
    listAllProducts().then(setProducts);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = products.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.sku.toLowerCase().includes(q.toLowerCase())
  );

  async function handleDelete(p: AdminProduct) {
    setConfirmDel(null);
    try {
      const res = await fetch(`${apiBaseUrl()}/v1/admin/products/${p.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 204) {
        push(`Deleted · ${p.name} removed from catalog`, "ok");
        load();
      } else {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
        push(body.error?.message ?? "Could not delete product", "bad");
      }
    } catch {
      push("Could not reach the API", "bad");
    }
  }

  return (
    <div className="fade-in">
      <div className="admin-head">
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Catalog</div>
          <h1 className="heading-1" style={{ margin: 0 }}>Products</h1>
          <div className="muted tiny" style={{ marginTop: 6 }}>{products.length} items in catalog</div>
        </div>
        <button className="btn accent" onClick={() => router.push("/admin/products/new")}>
          <Icon name="plus" /> Add product
        </button>
      </div>

      <div className="catalog-toolbar" style={{ marginBottom: 20 }}>
        <div className="search">
          <Icon name="search" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products or SKUs"
          />
        </div>
      </div>

      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r-2)", overflow: "hidden" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: "40%" }}>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="row-link">
                <td
                  onClick={() => router.push(`/admin/products/${p.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="prod-cell">
                    <Placeholder label="" tone={p.tone} />
                    <div>
                      <div className="name">{p.name}</div>
                      <div className="muted tiny" style={{ marginTop: 2 }}>
                        {(p.description ?? "").slice(0, 60)}
                        {(p.description ?? "").length > 60 ? "…" : ""}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="mono">{p.sku}</td>
                <td>{p.category}</td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>{formatPriceUSD(p.priceCents)}</td>
                <td>
                  {p.stock === 0 ? (
                    <span className="badge bad dot">0</span>
                  ) : p.stock < 5 ? (
                    <span className="badge warn dot">{p.stock}</span>
                  ) : (
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{p.stock}</span>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    className="btn sm ghost"
                    onClick={() => router.push(`/admin/products/${p.id}`)}
                  >
                    <Icon name="edit" /> Edit
                  </button>
                  <button
                    className="btn sm ghost"
                    style={{ marginLeft: 6 }}
                    onClick={() => setConfirmDel(p)}
                  >
                    <Icon name="trash" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="empty">
                    <div className="muted">No products found.</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!confirmDel}
        title="Delete product?"
        body={
          confirmDel ? (
            <>
              This will remove <strong>{confirmDel.name}</strong> from the catalog. Existing orders
              that include it will be unaffected. This action cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete product"
        danger
        onCancel={() => setConfirmDel(null)}
        onConfirm={() => { if (confirmDel) void handleDelete(confirmDel); }}
      />
    </div>
  );
}
