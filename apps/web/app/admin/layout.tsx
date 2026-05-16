import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { authedFetch } from "@/lib/api-server";
import { AdminTopBar } from "@/components/AdminTopBar";
import { AdminSide } from "@/components/AdminSide";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  let isAdmin = false;
  try {
    const res = await authedFetch("/v1/auth/me");
    if (res.ok) {
      const me = (await res.json()) as { role?: string };
      isAdmin = me.role === "admin";
    }
  } catch {
    // API unreachable
  }
  if (!isAdmin) redirect("/login");

  return (
    <div className="app">
      <AdminTopBar />
      <div className="admin-shell">
        <AdminSide />
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
