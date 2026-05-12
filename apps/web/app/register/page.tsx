"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import { fetchMe, resolveMeAfterRegister, storefrontPathAfterAuth } from "@/lib/auth-session";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`${apiBaseUrl()}/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (res.status === 201 || res.status === 204) {
        const me = await resolveMeAfterRegister(res, fetchMe);
        if (!me) {
          setError("Account created but profile could not be loaded. Try signing in.");
          return;
        }
        router.push(storefrontPathAfterAuth(me.role));
        router.refresh();
        return;
      }
      let msg = "Could not create account";
      try {
        const body = (await res.json()) as {
          error?: { code?: string; message?: string; fields?: Record<string, string> };
        };
        if (body.error?.code === "email_taken") {
          msg = "An account with this email already exists. Sign in instead.";
        } else if (body.error?.fields?.password) {
          msg = body.error.fields.password;
        } else if (body.error?.message) {
          msg = body.error.message;
        }
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
        <Link className="text-sm font-medium text-[var(--accent)] hover:underline" href="/">
          ← Back to store
        </Link>
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        New accounts can shop with a saved cart and checkout. The server creates a new user id in MongoDB
        and signs you in with a session cookie. Admins still use{" "}
        <code className="font-mono text-xs">ADMIN_EMAIL</code> /{" "}
        <code className="font-mono text-xs">ADMIN_PASSWORD</code> from the API environment.
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
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm shadow-sm outline-none ring-[var(--accent)] focus:ring-2"
            id="password"
            name="password"
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            value={password}
          />
          <p className="mt-1 text-xs text-slate-500">At least 8 characters (max 72).</p>
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="confirm">
            Confirm password
          </label>
          <input
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm shadow-sm outline-none ring-[var(--accent)] focus:ring-2"
            id="confirm"
            name="confirm"
            onChange={(e) => setConfirm(e.target.value)}
            required
            type="password"
            value={confirm}
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
          {pending ? "Creating account…" : "Create account"}
        </button>
        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{" "}
          <Link className="font-medium text-[var(--accent)] hover:underline" href="/login">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
