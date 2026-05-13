// TODO: Real auth gating should go here.
// Uncomment the block below and import authedFetch from "@/lib/api-server"
// to redirect unauthenticated visitors to /login:
//
//   const res = await authedFetch('/v1/auth/me');
//   if (!res.ok || (await res.json()).role !== 'admin') redirect('/login');

import type { ReactNode } from "react";
import { AdminTopBar } from "@/components/AdminTopBar";
import { AdminSide } from "@/components/AdminSide";

export default function AdminLayout({ children }: { children: ReactNode }) {
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
