import { cookies } from "next/headers";
import { apiBaseUrl } from "./api";

/**
 * Server-only fetch to the Go API that forwards the incoming request cookies
 * (for example the `auth` session cookie) on SSR and in Server Actions.
 */
export async function authedFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const base = apiBaseUrl();
  const jar = await cookies();
  const cookieHeader = jar
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  return fetch(`${base}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    cache: "no-store",
  });
}
