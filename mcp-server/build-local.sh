#!/bin/bash
# Local build script for testing multi-architecture builds

set -e

# Parse arguments
ARCH=${1:-amd64}
VERSION=${2:-test}

# Map architecture to base image using build.yaml
case $ARCH in
  amd64)
    BASE_IMAGE="ghcr.io/home-assistant/amd64-base:3.21"
    PLATFORM="linux/amd64"
    ;;
  aarch64)
    BASE_IMAGE="ghcr.io/home-assistant/aarch64-base:3.21"
    PLATFORM="linux/arm64"
    ;;
  armv7)
    BASE_IMAGE="ghcr.io/home-assistant/armv7-base:3.21"
    PLATFORM="linux/arm/v7"
    ;;
  armhf)
    BASE_IMAGE="ghcr.io/home-assistant/armhf-base:3.21"
    PLATFORM="linux/arm/v6"
    ;;
  i386)
    BASE_IMAGE="ghcr.io/home-assistant/i386-base:3.21"
    PLATFORM="linux/386"
    ;;
  *)
    echo "Unknown architecture: $ARCH"
    echo "Usage: $0 [amd64|aarch64|armv7|armhf|i386] [version]"
    exit 1
    ;;
esac

echo "Building for architecture: $ARCH"
echo "Using base image: $BASE_IMAGE"
echo "Platform: $PLATFORM"
echo "Version: $VERSION"

# Build the Docker image
docker build \
  --build-arg BUILD_FROM="$BASE_IMAGE" \
  --build-arg BUILD_ARCH="$ARCH" \
  --build-arg BUILD_VERSION="$VERSION" \
  --platform "$PLATFORM" \
  -t "mcp-claude-$ARCH:$VERSION" \
  -t "mcp-claude-$ARCH:latest" \
  .

echo "Build complete! Tagged as:"
echo "  - mcp-claude-$ARCH:$VERSION"
echo "  - mcp-claude-$ARCH:latest"

# Optional: Test the image
echo ""
echo "To test the image locally:"
echo "  docker run --rm -it mcp-claude-$ARCH:$VERSION /bin/bash"