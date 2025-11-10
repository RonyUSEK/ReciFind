#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "========================================="
echo "🚀 Starting Development Environment"
echo "========================================="
echo ""

# Build and start containers
docker compose up -d --build

echo ""
echo "✅ Done! Containers are running in background"
echo ""
echo "📝 Next steps:"
echo "   1. Open VS Code"
echo "   2. Install 'Dev Containers' extension (if not installed)"
echo "   3. Click the green icon (bottom-left) → 'Attach to Running Container'"
echo "   4. Select 'dev_container'"
echo "   5. Open folder: /workspace"
echo ""
echo "🔧 Or use terminal:"
echo "   docker exec -it dev_container bash"
echo ""
echo "💡 Containers will auto-restart when you reboot your laptop!"
echo ""
