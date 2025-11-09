# Quick Start Guide

## 🚀 For Professors/Reviewers (Quick Demo)

Run the application in **one command**:

```bash
cd fullstack-boilerplate
chmod +x docker/scripts/demo.sh docker/deploy/build_image.sh
./docker/scripts/demo.sh
```

Then visit: **http://localhost:5000**

To stop:
```bash
docker-compose -f docker/deploy/docker-compose.yml down
```

---

## 👨‍💻 For Developers (Full Setup)

### First Time Setup

```bash
cd fullstack-boilerplate

# Make scripts executable
chmod +x docker/dev/build_image.sh docker/dev/run_docker.sh

# Build dev image
./docker/dev/build_image.sh

# Run dev container
./docker/dev/run_docker.sh
```

### Inside the Container

You'll see a welcome message with available commands:

```bash
# Check database connection (run this first!)
db-check

# Install dependencies (first time only)
cd backend && npm install
cd ../frontend && npm install

# Quick Commands:
start-backend   # Automatically goes to backend/ and runs npm run dev
start-frontend  # Automatically goes to frontend/ and runs npm start

# Or manually:
# Terminal 1: Start backend
cd backend && npm run dev

# Terminal 2: Start frontend (open new terminal, attach to container)
cd frontend && npm start
```

**Troubleshooting:** If backend can't connect to database, just run `db-check` - it will tell you exactly what to do!

### Using VS Code

1. Container must be running: `./docker/dev/run_docker.sh`
2. VS Code → Green corner → "Attach to Running Container"
3. Select `fullstack_dev_container`
4. Open folder: `/workspace`
5. Use integrated terminals to run commands

---

## 🎯 What You Get

- ✅ React frontend with hot reload (port 3000)
- ✅ Express API backend (port 5000)
- ✅ PostgreSQL database (port 5432)
- ✅ Full VS Code integration
- ✅ All changes instantly reflected
- ✅ Production-ready Docker setup

---

See [README.md](README.md) for complete documentation.
