#!/bin/bash
# Emergency script to fix the multi-architecture manifest

VERSION="1.1.4"
REGISTRY="ghcr.io/mtebusi"
IMAGE="addon-mcp-claude"

echo "Fixing multi-architecture manifest for $IMAGE:$VERSION"

# Login to registry (assumes already logged in via docker login)
echo "Pulling architecture-specific images..."

# Pull all architecture images
for arch in aarch64 amd64 armhf armv7 i386; do
  echo "Pulling $arch..."
  docker pull ${REGISTRY}/${IMAGE}:${VERSION}-${arch} || true
done

# Remove any existing manifest
echo "Removing existing manifest..."
docker manifest rm ${REGISTRY}/${IMAGE}:${VERSION} 2>/dev/null || true

# Create new manifest using direct image references (not --amend)
echo "Creating new manifest..."
docker manifest create ${REGISTRY}/${IMAGE}:${VERSION} \
  ${REGISTRY}/${IMAGE}:${VERSION}-aarch64 \
  ${REGISTRY}/${IMAGE}:${VERSION}-amd64 \
  ${REGISTRY}/${IMAGE}:${VERSION}-armhf \
  ${REGISTRY}/${IMAGE}:${VERSION}-armv7 \
  ${REGISTRY}/${IMAGE}:${VERSION}-i386

# Push the manifest
echo "Pushing manifest..."
docker manifest push ${REGISTRY}/${IMAGE}:${VERSION}

# Also create and push latest
echo "Creating latest manifest..."
docker manifest rm ${REGISTRY}/${IMAGE}:latest 2>/dev/null || true
docker manifest create ${REGISTRY}/${IMAGE}:latest \
  ${REGISTRY}/${IMAGE}:${VERSION}-aarch64 \
  ${REGISTRY}/${IMAGE}:${VERSION}-amd64 \
  ${REGISTRY}/${IMAGE}:${VERSION}-armhf \
  ${REGISTRY}/${IMAGE}:${VERSION}-armv7 \
  ${REGISTRY}/${IMAGE}:${VERSION}-i386

docker manifest push ${REGISTRY}/${IMAGE}:latest

echo "Manifest creation complete!"
echo "Verifying..."
docker manifest inspect ${REGISTRY}/${IMAGE}:${VERSION} | jq '.manifests[] | {platform: .platform, digest: .digest}'