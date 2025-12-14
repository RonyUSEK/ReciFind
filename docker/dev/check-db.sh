#!/bin/bash

echo "========================================"
echo "Database Connection Check"
echo "========================================"

# Check if PostgreSQL is accessible
if PGPASSWORD=pass pg_isready -h postgres -p 5432 -U user -d mydb > /dev/null 2>&1; then
    echo "✓ Database is running and accessible!"
    echo ""
    echo "Connection details:"
    echo "  Host: postgres"
    echo "  Port: 5432"
    echo "  Database: mydb"
    echo "  User: user"
    echo ""
    echo "You can now start the app:"
    echo "  start-dev"
    exit 0
else
    echo "✗ Cannot connect to database"
    echo ""
    echo "Troubleshooting steps:"
    echo "  1. From your host machine:"
    echo "     cd docker/dev && docker compose ps"
    echo ""
    echo "  2. If postgres is unhealthy, restart the stack:"
    echo "     cd docker/dev && docker compose down && docker compose up -d --build"
    exit 1
fi
