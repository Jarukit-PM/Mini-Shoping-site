"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiBaseUrl } from "@/lib/api";

const choices = ["Pending", "Paid", "Shipped", "Cancelled"] as const;

export function OrderStatusRow({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function apply() {
    setErr(null);
    setPending(true);
    try {
      const res = await fetch(`${apiBaseUrl()}/v1/admin/orders/${orderId}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const body = (await res.json()) as { error?: { message?: string } };
      setErr(body.error?.message ?? "Update failed");
    } catch {
      setErr("Could not reach the API");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
      <select
        className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-xs font-medium shadow-sm"
        onChange={(e) => setValue(e.target.value)}
        value={value}
      >
        {choices.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button
        className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-60 dark:hover:bg-slate-900"
        disabled={pending || value === status}
        onClick={() => void apply()}
        type="button"
      >
        {pending ? "…" : "Apply"}
      </button>
      {err ? <span className="text-xs text-red-600">{err}</span> : null}
    </div>
  );
}
