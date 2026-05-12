import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminLogoutButton } from "./AdminLogoutButton";
import { authedFetch } from "@/lib/api-server";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const res = await authedFetch("/v1/auth/me");
  if (res.status === 401) {
    redirect("/login");
  }
  if (!res.ok) {
    redirect("/login");
  }
  const me = (await res.json()) as { role?: string };
  if (me.role !== "admin") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link className="text-lg font-semibold tracking-tight" href="/admin">
              Admin
            </Link>
            <nav className="flex gap-4 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Link className="hover:text-[var(--accent)]" href="/admin/products">
                Products
              </Link>
              <Link className="hover:text-[var(--accent)]" href="/admin/orders">
                Orders
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link className="text-slate-500 hover:text-[var(--accent)]" href="/">
              Storefront
            </Link>
            <AdminLogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
