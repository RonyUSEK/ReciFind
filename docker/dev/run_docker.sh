#!/bin/bash
set -e

IMAGE_NAME="fullstack_dev"
IMAGE_TAG="latest"
CONTAINER_NAME="fullstack_dev_container"

echo "========================================"
echo "Starting Fullstack Development Container"
echo "========================================"

# Create data directory for persistent storage
mkdir -p ~/data/fullstack

# Start PostgreSQL container (create if doesn't exist, start if stopped)
echo "Starting PostgreSQL database..."
if docker ps -a --format '{{.Names}}' | grep -q "^fullstack_postgres$"; then
    # Container exists, make sure it's running
    if ! docker ps --format '{{.Names}}' | grep -q "^fullstack_postgres$"; then
        echo "  → Starting existing PostgreSQL container..."
        docker start fullstack_postgres
    else
        echo "  → PostgreSQL container already running"
    fi
else
    # Container doesn't exist, create it
    echo "  → Creating new PostgreSQL container..."
    docker run -d \
        --name fullstack_postgres \
        -e POSTGRES_USER=user \
        -e POSTGRES_PASSWORD=pass \
        -e POSTGRES_DB=mydb \
        -p 5432:5432 \
        --restart unless-stopped \
        postgres:15
fi

# Wait for database to be ready
echo "  → Waiting for database to be ready..."
for i in {1..30}; do
    if docker exec fullstack_postgres pg_isready -U user -d mydb > /dev/null 2>&1; then
        echo "  ✓ Database is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "  ⚠ Warning: Database may not be ready yet"
    fi
    sleep 1
done

# Stop and remove existing dev container if running
docker stop ${CONTAINER_NAME} 2>/dev/null || true
docker rm ${CONTAINER_NAME} 2>/dev/null || true

echo ""
echo "Starting development container..."
echo ""

# Run development container with all necessary mounts
docker run -it \
    --network=host \
    --restart unless-stopped \
    -v $(pwd):/workspace \
    -v ~/.vscode-server-cache:/home/node/.vscode-server \
    -v ~/data/fullstack:/data:rw \
    -e "HISTFILE=/data/.bash_history" \
    -e "DATABASE_URL=postgresql://user:pass@localhost:5432/mydb" \
    -e "NODE_ENV=development" \
    -w /workspace \
    --name ${CONTAINER_NAME} \
    ${IMAGE_NAME}:${IMAGE_TAG} \
    /bin/bash

echo ""
echo "Development container stopped."
