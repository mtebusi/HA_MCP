#!/bin/bash
set -e

# Multi-Architecture Docker Build Script for HomeAssistant MCP Add-on
# This script builds and pushes Docker images for all supported architectures

VERSION="${1:-1.1.4}"
REGISTRY="${REGISTRY:-ghcr.io}"
NAMESPACE="${NAMESPACE:-mtebusi}"
IMAGE_NAME="addon-mcp-claude"
PUSH="${PUSH:-false}"

echo "==========================================="
echo "Multi-Architecture Docker Build Script"
echo "==========================================="
echo "Version: $VERSION"
echo "Registry: $REGISTRY"
echo "Namespace: $NAMESPACE"
echo "Image: $IMAGE_NAME"
echo "Push to registry: $PUSH"
echo "==========================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! docker buildx version &> /dev/null; then
        print_error "Docker buildx is not available"
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Setup buildx
setup_buildx() {
    print_status "Setting up Docker buildx..."
    
    # Create a new builder instance if it doesn't exist
    if ! docker buildx ls | grep -q "multiarch-builder"; then
        print_status "Creating new buildx builder..."
        docker buildx create --name multiarch-builder --driver docker-container --use
        docker buildx inspect --bootstrap
    else
        print_status "Using existing multiarch-builder"
        docker buildx use multiarch-builder
    fi
}

# Login to registry
login_registry() {
    if [ "$PUSH" = "true" ]; then
        print_status "Logging in to $REGISTRY..."
        if [ -z "$GITHUB_TOKEN" ]; then
            print_warning "GITHUB_TOKEN not set, attempting to use existing Docker credentials"
        else
            echo "$GITHUB_TOKEN" | docker login $REGISTRY -u $NAMESPACE --password-stdin
        fi
    fi
}

# Build for a specific architecture
build_arch() {
    local arch=$1
    local base_image=$2
    local platform=$3
    
    print_status "Building for $arch (platform: $platform)..."
    
    local tag="$REGISTRY/$NAMESPACE/$IMAGE_NAME:$arch-$VERSION"
    
    docker buildx build \
        --platform "$platform" \
        --build-arg "BUILD_FROM=$base_image" \
        --tag "$tag" \
        --cache-from "type=registry,ref=$REGISTRY/$NAMESPACE/$IMAGE_NAME:cache-$arch" \
        --cache-to "type=registry,ref=$REGISTRY/$NAMESPACE/$IMAGE_NAME:cache-$arch,mode=max" \
        $([ "$PUSH" = "true" ] && echo "--push" || echo "--load") \
        ./mcp-server
    
    if [ $? -eq 0 ]; then
        print_status "Successfully built $arch"
        return 0
    else
        print_error "Failed to build $arch"
        return 1
    fi
}

# Build all architectures
build_all_architectures() {
    print_status "Building all architectures..."
    
    local architectures=(
        "amd64|ghcr.io/home-assistant/amd64-base:3.21|linux/amd64"
        "aarch64|ghcr.io/home-assistant/aarch64-base:3.21|linux/arm64"
        "armv7|ghcr.io/home-assistant/armv7-base:3.21|linux/arm/v7"
        "armhf|ghcr.io/home-assistant/armhf-base:3.21|linux/arm/v6"
        "i386|ghcr.io/home-assistant/i386-base:3.21|linux/386"
    )
    
    local successful_builds=()
    
    for arch_config in "${architectures[@]}"; do
        IFS='|' read -r arch base_image platform <<< "$arch_config"
        if build_arch "$arch" "$base_image" "$platform"; then
            successful_builds+=("$REGISTRY/$NAMESPACE/$IMAGE_NAME:$arch-$VERSION")
        fi
    done
    
    if [ ${#successful_builds[@]} -eq 0 ]; then
        print_error "No architectures were successfully built"
        exit 1
    fi
    
    print_status "Successfully built ${#successful_builds[@]} architecture(s)"
    
    # Create multi-arch manifest
    if [ "$PUSH" = "true" ] && [ ${#successful_builds[@]} -gt 0 ]; then
        create_manifest "${successful_builds[@]}"
    fi
}

# Create multi-architecture manifest
create_manifest() {
    local images=("$@")
    
    print_status "Creating multi-architecture manifest..."
    
    # Create versioned manifest
    docker buildx imagetools create \
        --tag "$REGISTRY/$NAMESPACE/$IMAGE_NAME:$VERSION" \
        "${images[@]}"
    
    # Also tag as latest if requested
    if [ "$TAG_LATEST" = "true" ]; then
        docker buildx imagetools create \
            --tag "$REGISTRY/$NAMESPACE/$IMAGE_NAME:latest" \
            "${images[@]}"
    fi
    
    print_status "Manifest created successfully"
    
    # Inspect the manifest
    print_status "Inspecting manifest..."
    docker buildx imagetools inspect "$REGISTRY/$NAMESPACE/$IMAGE_NAME:$VERSION"
}

# Main execution
main() {
    cd "$(dirname "$0")/.."
    
    check_prerequisites
    setup_buildx
    login_registry
    build_all_architectures
    
    print_status "Build process completed!"
    
    if [ "$PUSH" = "true" ]; then
        print_status "Images have been pushed to $REGISTRY/$NAMESPACE/$IMAGE_NAME:$VERSION"
        print_status "Users can now pull the image with:"
        echo "  docker pull $REGISTRY/$NAMESPACE/$IMAGE_NAME:$VERSION"
    else
        print_warning "Images were built but not pushed (set PUSH=true to push)"
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --push)
            PUSH=true
            shift
            ;;
        --tag-latest)
            TAG_LATEST=true
            shift
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        --registry)
            REGISTRY="$2"
            shift 2
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --version VERSION    Version to build (default: 1.1.4)"
            echo "  --push              Push images to registry"
            echo "  --tag-latest        Also tag as 'latest'"
            echo "  --registry REGISTRY Registry URL (default: ghcr.io)"
            echo "  --namespace NS      Registry namespace (default: mtebusi)"
            echo "  --help              Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  GITHUB_TOKEN        GitHub token for registry authentication"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run the main function
main