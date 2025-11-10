# Development Environment Setup# Docker Development Setup - Quick Start



## One-Time Setup## 🚀 Easy Way (Recommended)



1. **Start the containers:**### Using Docker Compose

   ```bash

   cd docker/dev1. **Build and start everything:**

   ./run_compose.sh   ```bash

   ```   cd docker/dev

   ./run_compose.sh

   This builds and starts:   ```

   - `dev_container` - Your coding environment (always running)

   - `dev_postgres` - PostgreSQL database (always running)2. **Enter the container:**

   ```bash

2. **Attach VS Code:**   docker exec -it fullstack_dev_container bash

   - Install "Dev Containers" extension in VS Code   ```

   - Click green icon (bottom-left corner)

   - Select "Attach to Running Container"3. **Inside the container, start the application:**

   - Choose `dev_container`   ```bash

   - Open folder: `/workspace`   start-dev

   ```

## Daily Usage   This will launch both frontend and backend with a single command!



The containers **auto-restart** when you reboot your laptop. Just:4. **Access the application:**

   - Frontend: http://localhost:3000

1. Open VS Code   - Backend: http://localhost:5000

2. Attach to `dev_container` (as above)

3. Open terminal in VS Code5. **Stop everything:**

4. Run: `start-dev`   ```bash

   docker compose down

That's it! Frontend (port 3000) and backend (port 5000) will start.   ```



## Commands Inside Container---



| Command | Description |## 📦 What's Different Now?

|---------|-------------|

| `start-dev` | Start both frontend and backend |### ✅ Before (Manual Setup):

| `cd /workspace/backend && npm run dev` | Backend only |- Had to run `npm install` manually in backend and frontend

| `cd /workspace/frontend && npm start` | Frontend only |- Needed TWO separate terminals

- Had to navigate to each directory

## Stop/Restart Containers- Run backend and frontend separately



```bash### ✅ After (Automated Setup):

# Stop containers- **All dependencies pre-installed** in Docker image

cd docker/dev- **Single `start-dev` command** launches everything

docker compose down- Both services run together in one terminal

- Just enter container and run one command!

# Restart everything

docker compose up -d---



# View logs## 🎯 Available Commands Inside Container

docker compose logs -f dev

```Once you're inside the container (`docker exec -it fullstack_dev_container bash`):



## How It Works| Command | Description |

|---------|-------------|

- **Docker Compose** manages two containers| `start-dev` | **Launch BOTH backend and frontend** (recommended!) |

- **All code** is in `/workspace` (mounted from your laptop)| `start-backend` | Run only backend server |

- **Database data** persists in Docker volume| `start-frontend` | Run only frontend server |

- **VS Code settings** persist across restarts| `db-check` | Verify database connection |

- **Node modules** pre-installed in the image (fast startup)

---

## 🔧 Traditional Way (Still Works)

If you prefer the original method:

```bash
cd docker/dev
./build_image.sh    # Build the image with pre-installed dependencies
./run_docker.sh     # Start the container

# Inside container - now you have two options:
# Option 1: Start everything at once
start-dev

# Option 2: Manual (old way)
cd /workspace/backend && npm run dev   # Terminal 1
cd /workspace/frontend && npm start     # Terminal 2
```

---

## 🏗️ Rebuilding After Changes

If you modify `package.json` files:

**Docker Compose:**
```bash
cd docker/dev
docker compose build
docker compose up -d
```

**Traditional:**
```bash
cd docker/dev
./build_image.sh
```

---

## 📝 Notes

- Dependencies are now **cached in the Docker image** for faster startup
- The `start-dev` script handles graceful shutdown with Ctrl+C
- All services stop when you press Ctrl+C
- Database persists data in Docker volumes
