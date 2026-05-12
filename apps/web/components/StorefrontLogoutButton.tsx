"use client";

import { useRouter } from "next/navigation";
import { apiBaseUrl } from "@/lib/api";

export function StorefrontLogoutButton() {
  const router = useRouter();

  async function logout() {
    try {
      await fetch(`${apiBaseUrl()}/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* still refresh */
    }
    router.push("/");
    router.refresh();
  }

  return (
    <button
      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
      onClick={() => void logout()}
      type="button"
    >
      Log out
    </button>
  );
}
