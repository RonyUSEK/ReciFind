# Fullstack Boilerplate

A complete fullstack boilerplate project featuring React, Express.js, and PostgreSQL with Docker-based development and deployment workflows.

## 🚀 Features

- **Frontend**: React 18 with modern hooks
- **Backend**: Express.js REST API
- **Database**: PostgreSQL with automatic schema initialization
- **Containerization**: Docker for both development and production
- **Hot Reload**: Instant code changes in development mode
- **Production Ready**: Multi-stage builds for optimized images
- **VS Code Integration**: Attach to running containers for full IDE features

## 📋 Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)
- Git

## 🎯 Quick Demo (For Professors/Reviewers)

Try the application with **one command**:

```bash
chmod +x docker/scripts/demo.sh
./docker/scripts/demo.sh
```

Then visit: **http://localhost:5000**

The application will:
- ✅ Build the production image (first time only)
- ✅ Start PostgreSQL database
- ✅ Start the application server
- ✅ Initialize the database schema
- ✅ Be ready to use!

### Stop the Demo

```bash
docker-compose -f docker/deploy/docker-compose.yml down
```

### View Logs

```bash
docker-compose -f docker/deploy/docker-compose.yml logs -f
```

---

## 🛠️ Development Setup (For Contributors)

### Prerequisites

Ensure you have Docker installed and running.

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd fullstack-boilerplate
```

### Step 2: Build the Development Image

```bash
chmod +x docker/dev/build_image.sh
./docker/dev/build_image.sh
```

This creates a development image with all necessary tools (Node.js, PostgreSQL client, git, vim, etc.).

### Step 3: Run the Development Container

```bash
chmod +x docker/dev/run_docker.sh
./docker/dev/run_docker.sh
```

This will:
- Start a PostgreSQL database container
- Start your development container
- Mount your source code at `/workspace`
- Drop you into an interactive bash shell

### Step 4: Install Dependencies (First Time Only)

Inside the container, run:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 5: Run the Application

Open **two terminals** in your container (or use VS Code integrated terminals):

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

Your application is now running:
- **Frontend**: http://localhost:3000 (development server with hot reload)
- **Backend**: http://localhost:5000 (API server)
- **Database**: localhost:5432

### Step 6: Develop with VS Code (Recommended)

For the best development experience, attach VS Code to your running container:

1. Make sure your dev container is running (from Step 3)
2. Open VS Code
3. Click the green icon in the **bottom-left corner**
4. Select **"Attach to Running Container"**
5. Choose `fullstack_dev_container`
6. When VS Code opens, click **"Open Folder"** and select `/workspace`

Now you have:
- ✅ Full IntelliSense and autocompletion
- ✅ Integrated terminals already inside the container
- ✅ Git integration
- ✅ Debugging capabilities
- ✅ Extension support

**Recommended VS Code Extensions** (install inside container):
- ESLint
- Prettier
- ES7+ React snippets

---

## 📁 Project Structure

```
fullstack-boilerplate/
├── docker/
│   ├── dev/                    # Development environment
│   │   ├── Dockerfile          # Dev image with all tools
│   │   ├── build_image.sh      # Build dev image
│   │   └── run_docker.sh       # Run dev container
│   ├── deploy/                 # Production environment
│   │   ├── Dockerfile          # Multi-stage production build
│   │   ├── build_image.sh      # Build production image
│   │   └── docker-compose.yml  # Production orchestration
│   └── scripts/
│       └── demo.sh             # One-command demo script
├── backend/                    # Express.js API
│   ├── index.js                # Main server file
│   ├── package.json            # Backend dependencies
│   └── src/                    # Additional backend code
├── frontend/                   # React application
│   ├── src/                    # React components
│   ├── public/                 # Static assets
│   └── package.json            # Frontend dependencies
├── .gitignore
└── README.md
```

---

## 🔧 Development Workflow

### Making Code Changes

Your source code is **mounted** into the container, so changes you make on your host machine (or inside VS Code attached to the container) are **immediately reflected**:

- **Frontend**: React dev server auto-reloads on changes
- **Backend**: Nodemon auto-restarts the server on changes

### Running Commands Inside the Container

If you're not using VS Code attach, you can execute commands in your running container:

```bash
# From your host machine
docker exec -it fullstack_dev_container bash

# Now you're inside the container
cd backend
npm install new-package
```

### Database Access

Connect to PostgreSQL from inside the container:

```bash
psql postgresql://user:pass@localhost:5432/mydb
```

Or from your host machine (if you have psql installed):

```bash
psql postgresql://user:pass@localhost:5432/mydb
```

### Stopping the Development Environment

Press `Ctrl+C` in each terminal running the frontend/backend, then:

```bash
exit  # Exit the container
```

To stop the database:

```bash
docker stop fullstack_postgres
```

### Restart Development Container

```bash
./docker/dev/run_docker.sh
```

Your previous bash history and data are preserved in `~/data/fullstack`.

---

## 🚢 Production Build

### Manual Build

```bash
chmod +x docker/deploy/build_image.sh
./docker/deploy/build_image.sh
```

### Deploy with Docker Compose

```bash
docker-compose -f docker/deploy/docker-compose.yml up -d
```

### What's Different in Production?

- ✅ **Optimized Image**: Multi-stage build, only production dependencies
- ✅ **Static Files**: React app is built and served by Express
- ✅ **Single Port**: Everything available at port 5000
- ✅ **No Source Mounts**: Code is baked into the image
- ✅ **Health Checks**: Automatic container health monitoring

---

## 🌐 API Endpoints

### Backend API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check and database status |
| GET | `/api/todos` | Get all todos |
| POST | `/api/todos` | Create a new todo |
| PATCH | `/api/todos/:id` | Toggle todo completion |
| DELETE | `/api/todos/:id` | Delete a todo |

### Example API Calls

```bash
# Health check
curl http://localhost:5000/api/health

# Get all todos
curl http://localhost:5000/api/todos

# Create a todo
curl -X POST http://localhost:5000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy groceries"}'

# Delete a todo
curl -X DELETE http://localhost:5000/api/todos/1
```

---

## 🐛 Troubleshooting

### Port Already in Use

If ports 3000, 5000, or 5432 are already in use:

```bash
# Check what's using the port
lsof -i :5000

# Kill the process or change ports in the code
```

### Container Won't Start

```bash
# Remove existing containers
docker rm -f fullstack_dev_container fullstack_postgres

# Try again
./docker/dev/run_docker.sh
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# View database logs
docker logs fullstack_postgres

# Restart database
docker restart fullstack_postgres
```

### Can't See Code Changes

Make sure you're editing the mounted files at `/workspace` inside the container, not somewhere else.

---

## 🔐 Database Credentials

**Development & Demo:**
- Host: `localhost`
- Port: `5432`
- User: `user`
- Password: `pass`
- Database: `mydb`

**⚠️ Important**: Change these credentials before deploying to a real production environment!

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test in the dev container
5. Submit a pull request

---

## 📝 License

MIT License - feel free to use this boilerplate for your projects!

---

## 🎓 Learning Resources

This boilerplate demonstrates:
- **Containerized Development**: Docker for consistent environments
- **Modern React**: Hooks, functional components, state management
- **RESTful API Design**: Express.js best practices
- **Database Integration**: PostgreSQL with proper connection pooling
- **Production Optimization**: Multi-stage Docker builds
- **Development Workflow**: Hot reload, VS Code integration

Perfect for university projects, hackathons, or learning fullstack development!

---

## 📧 Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

**Happy Coding! 🚀**
