#!/bin/bash
# ReciFind Database Initialization Script
# Simple wrapper to initialize the database

set -e

echo "🚀 ReciFind Database Initialization"
echo "===================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed!"
    echo "Please install Node.js first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "src/db/init.js" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    echo "Usage: cd backend && ./src/db/init.sh"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Using default database configuration..."
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Run the initialization script
echo "🔧 Running database initialization..."
echo ""
node src/db/init.js

exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo ""
    echo "✅ Database initialization complete!"
    echo "You can now run: npm start"
else
    echo ""
    echo "❌ Database initialization failed!"
    exit $exit_code
fi
