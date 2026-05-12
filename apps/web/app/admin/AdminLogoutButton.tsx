"use client";

import { useRouter } from "next/navigation";
import { apiBaseUrl } from "@/lib/api";

export function AdminLogoutButton() {
  const router = useRouter();

  async function logout() {
    try {
      await fetch(`${apiBaseUrl()}/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* still navigate */
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900"
      onClick={() => void logout()}
      type="button"
    >
      Log out
    </button>
  );
}
