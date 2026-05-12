"use client";

import { usePathname } from "next/navigation";

/** Hides children on `/admin` routes so the admin layout keeps a single chrome. */
export function HideOnAdmin({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path?.startsWith("/admin")) return null;
  return <>{children}</>;
}
