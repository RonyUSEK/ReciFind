# ReciFind (ReciFind)

ReciFind is a recipe discovery platform focused on searching real recipes by ingredients and filters. It includes role-based features for chefs (submissions) and admins (approvals + moderation).

## What’s in this repo

- `backend/` — Express API + PostgreSQL (JWT auth, roles, recipe search, chef/admin workflows)
- `frontend/` — React app (search UI, dashboards)
- `docker/` — Docker dev container + deploy/demo scripts

## Prerequisites (minimal)

- Docker + Docker Compose (v2)
- For development in VS Code: **Dev Containers** extension

That’s it — dependencies are handled inside containers.

## Quick demo (run the app with Docker)

This starts a production-like stack (API serves the built React frontend on port `5000`) and auto-initializes the database with demo data.

```bash
cd /workspace
chmod +x docker/scripts/demo.sh docker/deploy/build_image.sh
./docker/scripts/demo.sh
```

Open:
- App: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

Demo login credentials:
- User: `john.doe@example.com` / `password123`
- Chef: `chef.maria@example.com` / `password123`
- Admin: `admin@recifind.com` / `password123`

Useful demo commands:
```bash
docker compose -f docker/deploy/docker-compose.yml logs -f
docker compose -f docker/deploy/docker-compose.yml down
```

## Development (VS Code Dev Container)

This repo includes a Docker-based development environment with PostgreSQL.

You can either:
- Use VS Code **Dev Containers** → **Reopen in Container** (uses `.devcontainer/devcontainer.json`), or
- Start the dev stack manually and **Attach to Running Container**.

### 1) Start the dev containers (host machine)

```bash
cd /workspace/docker/dev
chmod +x run_compose.sh
./run_compose.sh
```

### 2) Attach VS Code

- VS Code → **Dev Containers** → **Attach to Running Container…** → `dev_container`
- Open folder: `/workspace`

### 3) Run the app (inside the container)

```bash
start-dev
```

URLs:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

### Stop dev containers (host machine)

```bash
cd /workspace/docker/dev
docker compose down
```

## Notes

- User interactions are implemented via **Saved + collections** (no likes/comments/favorites).
- Content moderation supports **recipe-only reports**.
