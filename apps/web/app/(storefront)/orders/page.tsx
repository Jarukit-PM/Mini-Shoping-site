"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Status } from "@/components/Status";
import { getOrders, type OrderSummary } from "@/lib/orders";
import { fmtDate } from "@/lib/format";
import { formatPriceUSD } from "@/lib/api";

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderSummary[]>([]);

  useEffect(() => {
    getOrders().then(setOrders);
  }, []);

  return (
    <div className="fade-in">
      <section className="page-head">
        <div className="label" style={{ marginBottom: 10 }}>
          Your account
        </div>
        <h1 className="h-1" style={{ margin: 0 }}>
          Order history
        </h1>
        <p className="body muted" style={{ maxWidth: 480, marginTop: 10 }}>
          {orders.length === 0
            ? "No orders yet."
            : `${orders.length} ${orders.length === 1 ? "order" : "orders"} placed.`}
        </p>
      </section>

      <section
        style={{ padding: "32px 40px 80px", maxWidth: 1080, margin: "0 auto" }}
      >
        {orders.length === 0 ? (
          <div className="empty">
            <Icon name="package" className="xl" />
            <div className="h-3">No orders yet</div>
            <button className="btn ghost" onClick={() => router.push("/")}>
              Start shopping
            </button>
          </div>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className="row-link"
                  onClick={() => router.push(`/orders/${o.id}`)}
                >
                  <td className="mono">{o.id}</td>
                  <td>{fmtDate(o.createdAt)}</td>
                  <td>{formatPriceUSD(o.grandTotalCents)}</td>
                  <td>
                    <Status value={o.status} />
                  </td>
                  <td style={{ textAlign: "right", color: "var(--muted)" }}>
                    <Icon name="chev" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
