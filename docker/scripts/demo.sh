#!/bin/bash
set -e

echo "========================================"
echo "  Fullstack App - Quick Demo"
echo "========================================"
echo ""

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    echo "Please start Docker and try again"
    exit 1
fi

# Check and free up ports automatically
echo "🔍 Checking ports..."

# Stop dev containers if running
if docker ps --format '{{.Names}}' | grep -q "dev_"; then
    echo "   Stopping dev containers..."
    cd docker/dev && docker compose down 2>/dev/null && cd ../.. || true
fi

# Kill anything on port 5432
if lsof -Pi :5432 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "   Freeing port 5432..."
    lsof -ti:5432 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Kill anything on port 5000
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "   Freeing port 5000..."
    lsof -ti:5000 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

echo "✓ Ports ready"
echo ""

# Build production image if it doesn't exist
if [[ "$(docker images -q fullstack_app:latest 2> /dev/null)" == "" ]]; then
    echo "📦 Production image not found. Building..."
    echo ""
    chmod +x docker/deploy/build_image.sh
    ./docker/deploy/build_image.sh
    echo ""
else
    echo "✓ Production image found"
    echo ""
fi

# Stop and remove existing containers
echo "🛑 Stopping existing containers..."
docker compose -f docker/deploy/docker-compose.yml down 2>/dev/null || true
echo ""

# Start the application
echo "🚀 Starting application..."
if ! docker compose -f docker/deploy/docker-compose.yml up -d 2>&1; then
    echo ""
    echo "❌ Failed to start containers"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check logs: docker compose -f docker/deploy/docker-compose.yml logs"
    echo "  2. Check ports: lsof -i :5000 and lsof -i :5432"
    echo "  3. Clean up: docker compose -f docker/deploy/docker-compose.yml down -v"
    exit 1
fi

echo ""
echo "⏳ Waiting for services to be ready..."
echo ""

# Wait for database to be healthy
timeout=60
counter=0
until docker exec fullstack_db pg_isready -U user > /dev/null 2>&1 || [ $counter -eq $timeout ]; do
    printf "."
    sleep 1
    counter=$((counter + 1))
done

if [ $counter -eq $timeout ]; then
    echo ""
    echo "❌ Database failed to start within ${timeout} seconds"
    echo "Check logs with: docker compose -f docker/deploy/docker-compose.yml logs"
    exit 1
fi

echo ""
echo ""

# Wait for application to be healthy
counter=0
until curl -sf http://localhost:5000/api/health > /dev/null 2>&1 || [ $counter -eq $timeout ]; do
    printf "."
    sleep 1
    counter=$((counter + 1))
done

if [ $counter -eq $timeout ]; then
    echo ""
    echo "⚠️  Application may still be starting..."
else
    echo ""
fi

echo ""
echo "========================================"
echo "✅ Application is ready!"
echo "========================================"
echo ""
echo "🌐 Access the application:"
echo "   Local:   http://localhost:5000"

# Get network IP
NETWORK_IP=$(ip addr show | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | cut -d/ -f1 | head -n1)
if [ ! -z "$NETWORK_IP" ]; then
    echo "   Network: http://$NETWORK_IP:5000"
fi

echo ""
echo "📊 Useful commands:"
echo "   View logs:  docker compose -f docker/deploy/docker-compose.yml logs -f"
echo "   Stop app:   docker compose -f docker/deploy/docker-compose.yml down"
echo "   Restart:    docker compose -f docker/deploy/docker-compose.yml restart"
echo ""
echo "💾 Database connection:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   User: user"
echo "   Password: pass"
echo "   Database: mydb"
echo ""
