import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Merge selected keys from repo-root `.env`. Skip `PORT` so Next keeps 3000 while the API uses 8080. */
function applySelectedKeysFromRootEnv() {
  const envPath = path.resolve(__dirname, "../../.env");
  let raw;
  try {
    raw = fs.readFileSync(envPath, "utf8");
  } catch {
    return;
  }
  const allow = new Set(["API_URL", "NEXT_PUBLIC_API_URL"]);
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    if (!allow.has(key) || process.env[key] !== undefined) continue;
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

applySelectedKeysFromRootEnv();

/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "lightningcss",
    "lightningcss-darwin-arm64",
    "lightningcss-darwin-x64",
    "lightningcss-linux-arm64-gnu",
    "lightningcss-linux-arm64-musl",
    "lightningcss-linux-arm-gnueabihf",
    "lightningcss-linux-x64-gnu",
    "lightningcss-linux-x64-musl",
    "lightningcss-win32-arm64-msvc",
    "lightningcss-win32-x64-msvc",
    "lightningcss-freebsd-x64",
    "lightningcss-android-arm64",
    "@tailwindcss/node",
    "@tailwindcss/postcss",
  ],
};

export default nextConfig;
