import Link from "next/link";
import { authedFetch } from "@/lib/api-server";
import { StorefrontLogoutButton } from "@/components/StorefrontLogoutButton";

type Me = { id: string; email: string; role: string };

export async function SiteHeader() {
  let me: Me | null = null;
  try {
    const res = await authedFetch("/v1/auth/me");
    if (res.ok) {
      me = (await res.json()) as Me;
    }
  } catch {
    me = null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          className="font-semibold tracking-tight text-[var(--foreground)] hover:text-[var(--accent)]"
          href="/"
        >
          Mini Shopping Site
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-medium">
          <Link
            className="text-slate-600 hover:text-[var(--accent)] dark:text-slate-300"
            href="/"
          >
            Store
          </Link>
          <Link
            className="text-slate-600 hover:text-[var(--accent)] dark:text-slate-300"
            href="/cart"
          >
            Cart
          </Link>
          {!me ? (
            <Link
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-white shadow-sm hover:opacity-90"
              href="/login"
            >
              Log in
            </Link>
          ) : null}
          {me ? (
            <Link className="text-slate-600 hover:text-[var(--accent)] dark:text-slate-300" href="/orders">
              Orders
            </Link>
          ) : null}
          {me?.role === "admin" ? (
            <Link
              className="text-[var(--accent)] hover:underline"
              href="/admin"
            >
              Admin
            </Link>
          ) : null}
          {me ? (
            <span
              className="max-w-[min(18rem,50vw)] text-right text-sm text-slate-700 dark:text-slate-200"
              title={me.email}
            >
              <span className="text-slate-500 dark:text-slate-400">Signed in as</span>{" "}
              <span className="font-semibold text-[var(--foreground)]">{me.email}</span>
              {me.role === "admin" ? (
                <span className="ml-2 align-middle text-xs font-medium text-[var(--accent)]">
                  (admin)
                </span>
              ) : null}
            </span>
          ) : null}
          {me ? <StorefrontLogoutButton /> : null}
        </nav>
      </div>
    </header>
  );
}
