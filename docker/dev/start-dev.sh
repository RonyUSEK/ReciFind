#!/bin/bash
set -e

echo ""
echo "🚀 Starting Backend and Frontend..."
echo ""

# Install/update dependencies
echo "📦 Checking dependencies..."

cd /workspace/backend
if [ ! -d "node_modules" ]; then
    echo "   Installing backend..."
    npm install
fi

cd /workspace/frontend
if [ ! -d "node_modules" ]; then
    echo "   Installing frontend..."
    npm install
fi

# Start backend in background
cd /workspace/backend
npm run dev &
BACKEND_PID=$!

# Start frontend in background
cd /workspace/frontend
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Handle Ctrl+C
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Wait for both
wait
