# Mini Shopping Site

Full-stack monorepo for a **mini e-commerce** OOAD project: **Next.js** (`apps/web`), **Go REST API** (`services/api`), and **MongoDB**, runnable with **Docker Compose** or a **Dev Container** (MongoDB + Go + Node in the editor), following the same layout as [Apartment-System](https://github.com/Jarukit-PM/Apartment-System).

## Documentation

Design, API, and roadmap (English): **[docs/README.md](./docs/README.md)** — catalog data model, `/v1/products`, and next phases (cart, orders, auth).

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Compose v2.
- **Dev Container**: [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) for VS Code, or **Cursor** (built-in).
- **Dev Container** uses **Go 1.24** and **Node.js 22** (see [`.devcontainer/devcontainer.json`](.devcontainer/devcontainer.json)).

## Development with Dev Containers

1. Open the repo in Cursor or VS Code.
2. **Dev Containers: Reopen in Container**.
3. After changing `.devcontainer/devcontainer.json`, **Rebuild Container**.
4. Wait until **mongo** is healthy. **postCreate** runs `npm ci` in `apps/web`.

**Run API and web** (inside the dev container terminal):

```bash
cd services/api && go run ./cmd/server
```

```bash
cd apps/web && npm run dev
```

`MONGODB_URI` and `MONGODB_DATABASE` are set in `remoteEnv` for container shells. On the **host**, use `mongodb://localhost:27017` in root `.env`.

**Port conflict:** Do not run root `docker compose up` and the Dev Container both publishing **27017** unless you remap one. Dev Container uses volume **`mongo_dev_data`**; root Compose uses **`mongo_data`**.

## Quick start (Docker Compose — full stack)

```bash
cp .env.example .env
docker compose up --build
```

- **Web**: [http://localhost:3000](http://localhost:3000) — catalog grid + API health.
- **API**: [http://localhost:8080/health](http://localhost:8080/health), [http://localhost:8080/v1/products](http://localhost:8080/v1/products).
- **MongoDB**: `localhost:27017` (API uses `mongodb://mongo:27017` inside Compose).

## Environment variables

Copy [.env.example](./.env.example) to `.env` at the **repository root**.

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection string (API). |
| `MONGODB_DATABASE` | Database name (default `mini_shop`). |
| `CORS_ORIGINS` | Comma-separated allowed browser origins. |
| `API_URL` | Next.js **server-side** API base (`http://api:8080` in Compose). |
| `NEXT_PUBLIC_API_URL` | API base from the **browser** (usually `http://localhost:8080`). |

## Local development (API and web on the host)

Terminal 1 — MongoDB (skip if Dev Container or existing Mongo on 27017):

```bash
docker run -d --name mini-shop-mongo -p 27017:27017 mongo:7
```

Terminal 2 — API:

```bash
cd services/api
go run ./cmd/server
```

Terminal 3 — Web:

```bash
cd apps/web
npm run dev
```

## Repository layout

```
apps/web/              Next.js storefront
services/api/          Go module, cmd/server, internal/catalog
deploy/docker/         Dockerfiles (build context = repo root)
.devcontainer/         MongoDB + devcontainer service
docs/                  Architecture, API, data model, roadmap
docker-compose.yml     mongo, api, web
```

## License

Add a license file when you publish the project.
