#!/bin/bash
set -e

IMAGE_NAME="fullstack_dev"
IMAGE_TAG="latest"

echo "========================================"
echo "Building Development Image"
echo "========================================"
echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "UID: $(id -u)"
echo "GID: $(id -g)"
echo ""

docker build \
  --build-arg UID=$(id -u) \
  --build-arg GID=$(id -g) \
  -t ${IMAGE_NAME}:${IMAGE_TAG} \
  -f docker/dev/Dockerfile \
  .

echo ""
echo "✓ Development image built successfully!"
echo ""
echo "Next step: Run ./docker/dev/run_docker.sh"
