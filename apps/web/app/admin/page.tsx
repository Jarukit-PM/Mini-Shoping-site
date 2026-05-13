"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listAllProducts, type AdminProduct } from "@/lib/admin-products";
import { getOrders, type Order } from "@/lib/orders";
import { formatPriceUSD } from "@/lib/api";
import { Placeholder } from "@/components/Placeholder";
import { Status } from "@/components/Status";

export default function AdminDashboard() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    listAllProducts().then(setProducts);
    setOrders(getOrders());
  }, []);

  const revenue = orders.reduce((s, o) => s + o.grandTotalCents, 0);
  const pending = orders.filter((o) => o.status === "Pending").length;
  const low = products.filter((p) => p.stock > 0 && p.stock < 5).length;
  const out = products.filter((p) => p.stock === 0).length;
  const recent = orders
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const alerts = products.filter((p) => p.stock < 5);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="fade-in">
      <div className="admin-head">
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Overview</div>
          <h1 className="h-1" style={{ margin: 0 }}>Dashboard</h1>
        </div>
        <div className="muted tiny mono">{today}</div>
      </div>

      <div className="kpi-row">
        <div className="kpi">
          <div className="label">Revenue (all-time)</div>
          <div className="val">{formatPriceUSD(revenue)}</div>
          <div className="delta">+12% vs prev. 30 days</div>
        </div>
        <div className="kpi">
          <div className="label">Orders pending</div>
          <div className="val">{pending}</div>
          <div className="delta">Need attention</div>
        </div>
        <div className="kpi">
          <div className="label">Low stock</div>
          <div className="val">{low}</div>
          <div className="delta">{"< 5 units left"}</div>
        </div>
        <div className="kpi">
          <div className="label">Sold out</div>
          <div className="val">{out}</div>
          <div className="delta">0 units</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 32 }}>
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 className="h-3" style={{ margin: 0 }}>Recent orders</h2>
            <Link className="btn link" href="/admin/orders">View all</Link>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr
                  key={o.id}
                  className="row-link"
                  onClick={() => (window.location.href = `/admin/orders/${o.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td className="mono">{o.id}</td>
                  <td>{o.shippingAddress.name}</td>
                  <td>{formatPriceUSD(o.grandTotalCents)}</td>
                  <td><Status value={o.status} /></td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="empty"><div className="muted">No orders yet.</div></div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 className="h-3" style={{ margin: 0 }}>Inventory alerts</h2>
            <Link className="btn link" href="/admin/products">Manage</Link>
          </div>
          <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r-2)", overflow: "hidden" }}>
            {alerts.map((p) => (
              <div
                key={p.id}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: "1px solid var(--line)", cursor: "pointer" }}
                onClick={() => (window.location.href = `/admin/products/${p.id}`)}
              >
                <Placeholder label={p.sku} tone={p.tone} style={{ width: 40, height: 40, padding: 4 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 14 }}>{p.name}</div>
                  <div className="muted tiny">{p.category}</div>
                </div>
                {p.stock === 0
                  ? <span className="badge bad dot">Sold out</span>
                  : <span className="badge warn dot">{p.stock} left</span>}
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="empty" style={{ padding: 40 }}>
                <div className="muted">Stock levels look healthy.</div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
