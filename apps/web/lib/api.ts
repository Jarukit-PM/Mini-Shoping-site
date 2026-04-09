/** Server-side Go API base URL; in Docker Compose use `http://api:8080`. */
export function apiBaseUrl(): string {
  return (
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8080"
  );
}
