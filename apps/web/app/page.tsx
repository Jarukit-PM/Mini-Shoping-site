import Link from "next/link";
import { apiBaseUrl } from "@/lib/api";
import { authedFetch } from "@/lib/api-server";

type HealthResponse = {
  status: string;
  mongo: string;
};

type Product = {
  id: string;
  name: string;
  description?: string;
  priceCents: number;
  currency: string;
  sku: string;
  stock: number;
};

type ProductsResponse = {
  items: Product[];
};

type Me = {
  id: string;
  email: string;
  role: string;
};

async function fetchMe(): Promise<Me | null> {
  try {
    const res = await authedFetch("/v1/auth/me");
    if (!res.ok) return null;
    return (await res.json()) as Me;
  } catch {
    return null;
  }
}

async function fetchHealth(): Promise<HealthResponse | null> {
  const base = apiBaseUrl();
  try {
    const res = await fetch(`${base}/health`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as HealthResponse;
  } catch {
    return null;
  }
}

async function fetchProducts(): Promise<Product[]> {
  const base = apiBaseUrl();
  try {
    const res = await fetch(`${base}/v1/products`, { cache: "no-store" });
    if (!res.ok) return [];
    const body = (await res.json()) as ProductsResponse;
    return body.items ?? [];
  } catch {
    return [];
  }
}

function formatPrice(cents: number, currency: string): string {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "THB",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toFixed(0)} ${currency}`;
  }
}

export default async function Home() {
  const [health, products, me] = await Promise.all([fetchHealth(), fetchProducts(), fetchMe()]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-12 border-b border-[var(--border)] pb-8">
        <p className="text-sm font-medium text-[var(--accent)]">OOAD · Mini store</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Mini Shopping Site
        </h1>
        <p className="mt-3 max-w-2xl text-pretty text-slate-600 dark:text-slate-400">
          Same monorepo layout as{" "}
          <a
            className="text-[var(--accent)] underline-offset-2 hover:underline"
            href="https://github.com/Jarukit-PM/Apartment-System"
            rel="noreferrer"
            target="_blank"
          >
            Apartment-System
          </a>
          : Next.js, Go API, MongoDB, Docker Compose, and Dev Container — with the domain focused on a product
          catalog.
        </p>

        {me ? (
          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--accent-muted)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-800 dark:text-slate-100">
              <span className="text-slate-600 dark:text-slate-400">Signed in as</span>{" "}
              <span className="font-semibold">{me.email}</span>
              {me.role === "admin" ? (
                <span className="ml-2 rounded-md bg-[var(--card)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                  Admin
                </span>
              ) : null}
            </p>
            <div className="flex flex-wrap gap-2">
              {me.role === "admin" ? (
                <Link
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
                  href="/admin"
                >
                  Open admin
                </Link>
              ) : null}
              <Link
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                href="/login"
              >
                Account / sign-in page
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium text-[var(--foreground)]">Sign in to test the admin console</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Use the same credentials the Go API reads: copy{" "}
                <code className="rounded bg-[var(--accent-muted)] px-1 font-mono text-xs">.env.example</code>{" "}
                to <code className="font-mono text-xs">.env</code> at the repo root (defaults{" "}
                <code className="font-mono text-xs">admin@example.com</code> /{" "}
                <code className="font-mono text-xs">changeme</code>), then restart the API so it syncs the
                password. <span className="text-slate-500">In non-production, the API updates that user’s password from env on startup.</span>
              </p>
            </div>
            <Link
              className="shrink-0 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:opacity-90"
              href="/login"
            >
              Log in
            </Link>
          </div>
        )}

        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              API base
            </dt>
            <dd className="mt-1 truncate font-mono text-sm">{apiBaseUrl()}</dd>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              API status
            </dt>
            <dd className="mt-1 text-sm font-medium">
              {health ? health.status : "unreachable"}
            </dd>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              MongoDB
            </dt>
            <dd className="mt-1 text-sm font-medium">{health ? health.mongo : "—"}</dd>
          </div>
        </dl>
      </header>

      <section>
        <h2 className="text-lg font-semibold">Products</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Loaded from <code className="rounded bg-[var(--accent-muted)] px-1 py-0.5 font-mono text-xs">GET /v1/products</code>{" "}
          (auto-seeded when the collection is empty)
        </p>
        {products.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] px-4 py-8 text-center text-slate-600 dark:text-slate-400">
            No products yet — start the API and MongoDB, then refresh, or see{" "}
            <code className="font-mono text-xs">docs/data-model.md</code>
          </p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <li
                key={p.id}
                className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition hover:shadow-md"
              >
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{p.sku}</span>
                <h3 className="mt-1 font-semibold">{p.name}</h3>
                {p.description ? (
                  <p className="mt-1 flex-1 text-sm text-slate-600 dark:text-slate-400">
                    {p.description}
                  </p>
                ) : null}
                <div className="mt-4 flex items-end justify-between gap-2">
                  <span className="text-lg font-semibold text-[var(--accent)]">
                    {formatPrice(p.priceCents, p.currency)}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Stock: {p.stock}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
