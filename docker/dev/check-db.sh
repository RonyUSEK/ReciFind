#!/bin/bash

echo "========================================"
echo "Database Connection Check"
echo "========================================"

# Check if PostgreSQL is accessible
if pg_isready -h localhost -p 5432 -U user -d mydb > /dev/null 2>&1; then
    echo "✓ Database is running and accessible!"
    echo ""
    echo "Connection details:"
    echo "  Host: localhost"
    echo "  Port: 5432"
    echo "  Database: mydb"
    echo "  User: user"
    echo ""
    echo "You can now run your backend:"
    echo "  cd /workspace/backend && npm run dev"
    exit 0
else
    echo "✗ Cannot connect to database"
    echo ""
    echo "Troubleshooting steps:"
    echo "  1. Check if PostgreSQL container is running:"
    echo "     docker ps --filter name=fullstack_postgres"
    echo ""
    echo "  2. If not running, start it from your host machine:"
    echo "     docker start fullstack_postgres"
    echo ""
    echo "  3. Check database logs for errors:"
    echo "     docker logs fullstack_postgres"
    echo ""
    echo "  4. If all else fails, restart the dev container:"
    echo "     Exit this container and run ./docker/dev/run_docker.sh again"
    exit 1
fi
