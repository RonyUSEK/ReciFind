#!/bin/bash
set -e

IMAGE_NAME="fullstack_app"
IMAGE_TAG="latest"

echo "========================================"
echo "Building Production Image"
echo "========================================"
echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""

# Build production image with multi-stage build
docker build \
  -f docker/deploy/Dockerfile \
  -t ${IMAGE_NAME}:${IMAGE_TAG} \
  .

echo ""
echo "✓ Production image built successfully!"
echo ""
echo "Next step: Run ./docker/scripts/demo.sh or use docker-compose"
