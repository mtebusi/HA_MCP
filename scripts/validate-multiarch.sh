#!/bin/bash

# Validation script for multi-architecture HomeAssistant add-on builds
set -e

echo "========================================="
echo "Multi-Architecture Build Validation"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check required files
echo -e "\n${YELLOW}Checking required files...${NC}"

required_files=(
  "mcp-server/config.yaml"
  "mcp-server/Dockerfile"
  "mcp-server/build.json"
  "mcp-server/build.yaml"
)

for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file exists"
  else
    echo -e "${RED}✗${NC} $file missing"
    exit 1
  fi
done

# Validate config.yaml
echo -e "\n${YELLOW}Validating config.yaml...${NC}"
cd mcp-server

# Check architecture support
if grep -q "arch:" config.yaml; then
  echo -e "${GREEN}✓${NC} Architecture configuration found"
  echo "  Supported architectures:"
  grep -A 5 "arch:" config.yaml | grep "  -" | while read -r line; do
    echo "    $line"
  done
else
  echo -e "${RED}✗${NC} No architecture configuration found"
  exit 1
fi

# Check image configuration
if grep -q "image:" config.yaml; then
  IMAGE=$(grep "image:" config.yaml | cut -d'"' -f2)
  echo -e "${GREEN}✓${NC} Image configuration: $IMAGE"
else
  echo -e "${RED}✗${NC} No image configuration found"
  exit 1
fi

# Validate build.json
echo -e "\n${YELLOW}Validating build.json...${NC}"
if [ -f "build.json" ]; then
  echo -e "${GREEN}✓${NC} build.json exists"
  
  # Check for all required architectures
  ARCHS=("aarch64" "amd64" "armhf" "armv7" "i386")
  for arch in "${ARCHS[@]}"; do
    if grep -q "\"$arch\":" build.json; then
      echo -e "  ${GREEN}✓${NC} $arch base image configured"
    else
      echo -e "  ${RED}✗${NC} $arch base image missing"
    fi
  done
else
  echo -e "${YELLOW}⚠${NC} build.json not found (using build.yaml)"
fi

# Validate Dockerfile
echo -e "\n${YELLOW}Validating Dockerfile...${NC}"

# Check for BUILD_FROM ARG
if grep -q "ARG BUILD_FROM" Dockerfile; then
  echo -e "${GREEN}✓${NC} BUILD_FROM argument found"
else
  echo -e "${RED}✗${NC} BUILD_FROM argument missing"
  exit 1
fi

# Check for proper FROM usage
if grep -q "FROM \${BUILD_FROM}" Dockerfile || grep -q "FROM \$BUILD_FROM" Dockerfile; then
  echo -e "${GREEN}✓${NC} Proper BUILD_FROM usage in FROM statement"
else
  echo -e "${RED}✗${NC} Incorrect BUILD_FROM usage"
  exit 1
fi

# Test local build for current architecture
echo -e "\n${YELLOW}Testing local build...${NC}"

# Detect current architecture
ARCH=$(uname -m)
case $ARCH in
  x86_64)
    HA_ARCH="amd64"
    ;;
  aarch64)
    HA_ARCH="aarch64"
    ;;
  armv7l)
    HA_ARCH="armv7"
    ;;
  *)
    echo -e "${YELLOW}⚠${NC} Unknown architecture: $ARCH"
    HA_ARCH="amd64"
    ;;
esac

echo "Current architecture: $ARCH (HomeAssistant: $HA_ARCH)"

# Get base image from build.json or build.yaml
if [ -f "build.json" ]; then
  BASE_IMAGE=$(jq -r ".build_from.$HA_ARCH" build.json)
else
  BASE_IMAGE=$(grep -A 10 "build_from:" build.yaml | grep "$HA_ARCH:" | cut -d'"' -f2)
fi

if [ -z "$BASE_IMAGE" ] || [ "$BASE_IMAGE" == "null" ]; then
  echo -e "${RED}✗${NC} Could not determine base image for $HA_ARCH"
  exit 1
fi

echo "Base image: $BASE_IMAGE"

# Try to build with Docker
if command -v docker &> /dev/null; then
  echo -e "\n${YELLOW}Attempting Docker build...${NC}"
  
  # Build command
  BUILD_CMD="docker build --build-arg BUILD_FROM=$BASE_IMAGE -t test-mcp-addon:test ."
  
  echo "Build command: $BUILD_CMD"
  
  if $BUILD_CMD; then
    echo -e "${GREEN}✓${NC} Docker build successful!"
    
    # Test the image
    echo -e "\n${YELLOW}Testing built image...${NC}"
    
    # Try to run and check for architecture errors
    if docker run --rm test-mcp-addon:test /bin/sh -c "node --version && npm --version"; then
      echo -e "${GREEN}✓${NC} Image runs successfully!"
    else
      echo -e "${RED}✗${NC} Image failed to run - possible architecture mismatch"
    fi
    
    # Check image architecture
    echo -e "\n${YELLOW}Image details:${NC}"
    docker inspect test-mcp-addon:test | jq '.[0].Architecture'
    
  else
    echo -e "${RED}✗${NC} Docker build failed"
  fi
else
  echo -e "${YELLOW}⚠${NC} Docker not available, skipping build test"
fi

# Summary
echo -e "\n========================================="
echo -e "${GREEN}Validation Complete${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Commit these changes"
echo "2. Push to trigger GitHub Actions build"
echo "3. Monitor the builder workflow for all architectures"
echo "4. Check GitHub Container Registry for published images"
echo ""
echo "To test locally with Home Assistant:"
echo "  1. Add repository: https://github.com/mtebusi/HA_MCP"
echo "  2. Install 'MCP Server for Claude' add-on"
echo "  3. Start the add-on and check logs"
echo ""