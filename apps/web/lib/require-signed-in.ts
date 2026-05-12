import { redirect } from "next/navigation";
import { authedFetch } from "./api-server";

/** Redirects to /login if there is no valid session cookie for the API. */
export async function requireSignedIn(): Promise<void> {
  const res = await authedFetch("/v1/auth/me");
  if (res.status === 401) {
    redirect("/login");
  }
}
