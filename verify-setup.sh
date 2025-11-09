#!/bin/bash

echo "========================================"
echo "Fullstack Boilerplate - Setup Verification"
echo "========================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Docker
echo -n "Checking Docker... "
if command -v docker &> /dev/null; then
    if docker info &> /dev/null; then
        echo -e "${GREEN}✓ Docker is installed and running${NC}"
    else
        echo -e "${RED}✗ Docker is installed but not running${NC}"
        echo "  Please start Docker Desktop and try again"
        exit 1
    fi
else
    echo -e "${RED}✗ Docker is not installed${NC}"
    echo "  Please install Docker from https://docker.com"
    exit 1
fi

# Check Docker Compose
echo -n "Checking Docker Compose... "
if docker compose version &> /dev/null; then
    echo -e "${GREEN}✓ Docker Compose is available${NC}"
else
    echo -e "${RED}✗ Docker Compose is not available${NC}"
    exit 1
fi

# Check scripts are executable
echo -n "Checking script permissions... "
if [[ -x "docker/dev/build_image.sh" ]] && [[ -x "docker/dev/run_docker.sh" ]] && \
   [[ -x "docker/deploy/build_image.sh" ]] && [[ -x "docker/scripts/demo.sh" ]]; then
    echo -e "${GREEN}✓ All scripts are executable${NC}"
else
    echo -e "${YELLOW}⚠ Some scripts are not executable${NC}"
    echo "  Running: chmod +x docker/**/*.sh"
    chmod +x docker/dev/*.sh docker/deploy/*.sh docker/scripts/*.sh
    echo -e "${GREEN}  ✓ Fixed${NC}"
fi

# Check required files
echo -n "Checking required files... "
REQUIRED_FILES=(
    "backend/package.json"
    "backend/index.js"
    "frontend/package.json"
    "frontend/src/App.js"
    "docker/dev/Dockerfile"
    "docker/deploy/Dockerfile"
    "docker/deploy/docker-compose.yml"
)

MISSING_FILES=()
for file in "${REQUIRED_FILES[@]}"; do
    if [[ ! -f "$file" ]]; then
        MISSING_FILES+=("$file")
    fi
done

if [[ ${#MISSING_FILES[@]} -eq 0 ]]; then
    echo -e "${GREEN}✓ All required files present${NC}"
else
    echo -e "${RED}✗ Missing files:${NC}"
    for file in "${MISSING_FILES[@]}"; do
        echo "    - $file"
    done
    exit 1
fi

# Check ports availability
echo ""
echo "Checking port availability..."
PORTS=(3000 5000 5432)
BUSY_PORTS=()

for port in "${PORTS[@]}"; do
    if lsof -Pi :$port -sTCP:LISTEN -t &> /dev/null; then
        BUSY_PORTS+=($port)
        echo -e "  ${YELLOW}⚠ Port $port is in use${NC}"
    else
        echo -e "  ${GREEN}✓ Port $port is available${NC}"
    fi
done

if [[ ${#BUSY_PORTS[@]} -gt 0 ]]; then
    echo ""
    echo -e "${YELLOW}Warning: Some ports are already in use${NC}"
    echo "You may need to stop other services or the containers will fail to start"
fi

echo ""
echo "========================================"
echo -e "${GREEN}✅ Setup Verification Complete!${NC}"
echo "========================================"
echo ""
echo "📚 Next Steps:"
echo ""
echo "For quick demo:"
echo "  ./docker/scripts/demo.sh"
echo ""
echo "For development:"
echo "  ./docker/dev/build_image.sh    # Build dev image (first time)"
echo "  ./docker/dev/run_docker.sh     # Start dev container"
echo ""
echo "See README.md for detailed instructions."
echo ""
