# Docker Dev Environment (Quick Start)

## Start (host machine)
```bash
cd docker/dev
./run_compose.sh
```

## Attach (VS Code)
- VS Code → Dev Containers → **Attach to Running Container...** → `dev_container`
- Open folder: `/workspace`

## Run (inside container)
```bash
start-dev
```

## URLs
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

## Stop (host machine)
```bash
cd docker/dev
docker compose down
```
   ```bash
