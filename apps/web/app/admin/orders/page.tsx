"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAdminOrders,
  advanceOrderStatus,
  type AdminOrderSummary,
} from "@/lib/admin-orders";
import { formatPriceUSD } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { Status } from "@/components/Status";
import { useToast } from "@/components/Toast";
import type { OrderStatus } from "@/lib/orders";

const ADMIN_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  Pending: ["Paid", "Cancelled"],
  Paid: ["Shipped", "Cancelled"],
  Shipped: [],
  Delivered: [],
  Cancelled: [],
};

const STATUS_FILTERS: (OrderStatus | "All")[] = [
  "All", "Pending", "Paid", "Shipped", "Delivered", "Cancelled",
];

export default function AdminOrdersPage() {
  const router = useRouter();
  const { push } = useToast();
  const [filter, setFilter] = useState<OrderStatus | "All">("All");
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);

  function load() {
    getAdminOrders().then(setOrders);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = filter === "All" ? orders : orders.filter((o) => o.status === filter);

  async function handleAdvance(id: string, status: OrderStatus) {
    const ok = await advanceOrderStatus(id, status);
    if (ok) {
      push(`Order ${id.slice(0, 8)}… → ${status}`, "ok");
      load();
    } else {
      push("Could not update status", "bad");
    }
  }

  return (
    <div className="fade-in">
      <div className="admin-head">
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Fulfillment</div>
          <h1 className="heading-1" style={{ margin: 0 }}>Orders</h1>
          <div className="muted tiny" style={{ marginTop: 6 }}>{orders.length} total orders</div>
        </div>
      </div>

      <div className="chips" style={{ marginBottom: 20 }}>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            className={`chip ${filter === s ? "active" : ""}`}
            onClick={() => setFilter(s)}
          >
            {s}
            {s !== "All" && ` (${orders.filter((o) => o.status === s).length})`}
          </button>
        ))}
      </div>

      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r-2)", overflow: "hidden" }}>
        <table className="admin-table">
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
            {filtered.map((o) => (
              <tr key={o.id} className="row-link">
                <td
                  className="mono"
                  onClick={() => router.push(`/admin/orders/${o.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  {o.id}
                </td>
                <td>{fmtDate(o.createdAt)}</td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatPriceUSD(o.grandTotalCents)}
                </td>
                <td><Status value={o.status} /></td>
                <td style={{ textAlign: "right" }}>
                  {ADMIN_STATUS_FLOW[o.status]?.length > 0 ? (
                    <select
                      className="select"
                      style={{ padding: "6px 10px", fontSize: 12, width: "auto", display: "inline-block" }}
                      value=""
                      onChange={(e) => {
                        if (e.target.value) handleAdvance(o.id, e.target.value as OrderStatus);
                      }}
                    >
                      <option value="">Advance →</option>
                      {ADMIN_STATUS_FLOW[o.status].map((s) => (
                        <option key={s} value={s}>
                          {s === "Cancelled" ? "Cancel order" : `Mark ${s}`}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="muted tiny">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="empty">No {filter === "All" ? "" : filter.toLowerCase()} orders.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
