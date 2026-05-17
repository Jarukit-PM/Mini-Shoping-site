# Production deployment

Split stack (same pattern as [Apartment-System](https://github.com/Jarukit-PM/Apartment-System)):

| Component | Platform |
|-----------|----------|
| MongoDB | [MongoDB Atlas](https://www.mongodb.com/atlas) |
| Go API (`services/api`) | [Render](https://render.com) — `render.yaml` |
| Next.js (`apps/web`) | [Vercel](https://vercel.com) |
| CI / CD | GitHub Actions (`.github/workflows/`) |

## 1. MongoDB Atlas

1. Create a free **M0** cluster.
2. **Database Access** → user with read/write on `mini_shop`.
3. **Network Access** → allow `0.0.0.0/0` (or Render’s egress IPs for stricter setups).
4. Copy the connection string, e.g. `mongodb+srv://user:pass@cluster.mongodb.net/mini_shop?retryWrites=true&w=majority`.

## 2. Render (API)

1. Push `render.yaml` on `main`.
2. [New Blueprint](https://dashboard.render.com/blueprint/new?repo=https://github.com/Jarukit-PM/Mini-Shoping-site) → connect GitHub → **Apply**.
3. Set environment variables on **mini-shop-api**:
   - `MONGODB_URI` — Atlas connection string
   - `CORS_ORIGINS` — your Vercel URL(s), comma-separated, e.g. `https://mini-shop.vercel.app,https://your-domain.com`
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — bootstrap admin (production keeps password stable)
4. Note the public URL, e.g. `https://mini-shop-api.onrender.com`.
5. **Settings → Deploy Hook** → copy URL for GitHub secret `RENDER_DEPLOY_HOOK_URL`.

`autoDeploy` is **off** in `render.yaml`; deploys run from the GitHub **Deploy** workflow.

## 3. Vercel (web)

1. **Add New Project** → import `Jarukit-PM/Mini-Shoping-site`.
2. **Root Directory**: `apps/web`.
3. Environment variables (Production) — **both are required**:

   | Variable | Used where | Value |
   |----------|------------|--------|
   | `API_URL` | Vercel **server** (SSR, catalog) | `https://mini-shop-api.onrender.com` |
   | `NEXT_PUBLIC_API_URL` | User **browser** (login, cart, checkout) | same URL, with `https://` |

   `API_URL` alone is not enough: login/register run in the browser and only read `NEXT_PUBLIC_API_URL`. Without it, requests go to `http://localhost:8080`.

   After adding or changing `NEXT_PUBLIC_*`, **redeploy** (new production build).

4. Deploy once; copy **Project ID** and **Team ID** from **Settings → General** for GitHub secrets.

   **GitHub Actions:** keep **Root Directory** as `apps/web` on Vercel, but deploy from the **repository root** in `.github/workflows/deploy.yml` (do not set `working-directory: apps/web` on `vercel-action` — that doubles the path to `apps/web/apps/web`).

Auth uses an **httpOnly cookie** on the API host. The browser calls the API with `credentials: "include"`; `APP_ENV=production` on Render sets `Secure` and `SameSite=None` for cross-origin Vercel → Render.

## 4. GitHub Actions secrets

Repository → **Settings → Secrets and variables → Actions**:

| Secret | Source |
|--------|--------|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel team / project settings |
| `VERCEL_PROJECT_ID` | Vercel project settings |
| `RENDER_DEPLOY_HOOK_URL` | Render deploy hook |

Optional: create a **production** environment for approval gates.

## 5. Verify

- API: `GET https://mini-shop-api.onrender.com/health` → `"mongo":"ok"`.
- Web: open Vercel URL → catalog loads.
- Register / login → session works (check Network tab: `Set-Cookie` on API domain, requests to API with cookies).

## Local vs production

| | Local | Production |
|---|--------|------------|
| MongoDB | Dev Container / `localhost:27017` | Atlas `MONGODB_URI` |
| API | `:8080` | Render |
| Web | `:3000` | Vercel |
| `CORS_ORIGINS` | `http://localhost:3000` | Vercel origin(s) |
