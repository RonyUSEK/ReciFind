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
BUILD_FLAGS=()

if [[ "${NO_CACHE:-}" == "1" ]]; then
  echo "↪︎ NO_CACHE=1 set, building without cache"
  BUILD_FLAGS+=(--no-cache)
fi

docker build \
  "${BUILD_FLAGS[@]}" \
  ${BUILD_FINGERPRINT:+--build-arg BUILD_FINGERPRINT=${BUILD_FINGERPRINT}} \
  -f docker/deploy/Dockerfile \
  -t ${IMAGE_NAME}:${IMAGE_TAG} \
  .

echo ""
echo "✓ Production image built successfully!"
echo ""
echo "Next step: Run ./docker/scripts/demo.sh or use docker-compose"
