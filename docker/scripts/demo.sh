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
docker compose -f docker/deploy/docker-compose.yml up -d

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
    echo "Check logs with: docker-compose -f docker/deploy/docker-compose.yml logs"
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
echo "🌐 Access the application at:"
echo "   http://localhost:5000"
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
