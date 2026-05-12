"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiBaseUrl } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`${apiBaseUrl()}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (res.status === 204) {
        router.push("/admin");
        router.refresh();
        return;
      }
      let msg = "Login failed";
      try {
        const body = (await res.json()) as { error?: { message?: string } };
        if (body.error?.message) msg = body.error.message;
      } catch {
        /* ignore */
      }
      setError(msg);
    } catch {
      setError("Could not reach the API");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <p className="mb-6">
        <Link
          className="text-sm font-medium text-[var(--accent)] hover:underline"
          href="/"
        >
          ← Back to store
        </Link>
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Admin accounts use <code className="font-mono text-xs">ADMIN_EMAIL</code> and{" "}
        <code className="font-mono text-xs">ADMIN_PASSWORD</code> from your API environment (see{" "}
        <code className="font-mono text-xs">.env.example</code>). After a successful sign-in you are
        sent to the admin console.
      </p>
      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm shadow-sm outline-none ring-[var(--accent)] focus:ring-2"
            id="email"
            name="email"
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            value={email}
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm shadow-sm outline-none ring-[var(--accent)] focus:ring-2"
            id="password"
            name="password"
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            value={password}
          />
        </div>
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}
        <button
          className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
