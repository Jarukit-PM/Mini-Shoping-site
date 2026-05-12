import { apiBaseUrl } from "./api"

export type Me = { id: string; email: string; role: string }

function isCompleteMe(v: unknown): v is Me {
  if (!v || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  return typeof o.id === "string" && typeof o.email === "string" && typeof o.role === "string"
}

/**
 * After POST /v1/auth/register: uses 201 JSON body when present and well-formed, else calls fetchMe
 * (204 legacy or missing fields / bad JSON).
 */
export async function resolveMeAfterRegister(
  res: Response,
  fetchMeImpl: () => Promise<Me | null>,
): Promise<Me | null> {
  if (res.status === 201) {
    try {
      const data: unknown = await res.json()
      if (isCompleteMe(data)) return data
    } catch {
      /* fall through */
    }
    return fetchMeImpl()
  }
  if (res.status === 204) {
    return fetchMeImpl()
  }
  return null
}

/** Loads the current user from the API (requires session cookie from login/register). */
export async function fetchMe(): Promise<Me | null> {
  const res = await fetch(`${apiBaseUrl()}/v1/auth/me`, {
    credentials: "include",
    cache: "no-store",
  })
  if (!res.ok) return null
  return res.json() as Promise<Me>
}

/** Where to send the user after a successful sign-in or sign-up. */
export function storefrontPathAfterAuth(role: string): string {
  return role === "admin" ? "/admin" : "/"
}
