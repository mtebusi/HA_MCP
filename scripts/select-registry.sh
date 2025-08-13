#!/bin/bash
# Registry selection script for Claude AI MCP Bridge
# Usage: ./select-registry.sh [dockerhub|ghcr]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CONFIG_FILE="claude-ai-mcp/config.yaml"
DOCKERHUB_IMAGE="mtebusi/ha-claude-ai-mcp"
GHCR_IMAGE="ghcr.io/mtebusi/addon-claude-ai-mcp"

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check current registry
check_current_registry() {
    if grep -q "$DOCKERHUB_IMAGE" "$CONFIG_FILE" 2>/dev/null; then
        echo "dockerhub"
    elif grep -q "$GHCR_IMAGE" "$CONFIG_FILE" 2>/dev/null; then
        echo "ghcr"
    else
        echo "unknown"
    fi
}

# Function to switch registry
switch_registry() {
    local target=$1
    local current=$(check_current_registry)
    
    if [ "$current" = "$target" ]; then
        print_color "$YELLOW" "Already using $target registry"
        return 0
    fi
    
    print_color "$GREEN" "Switching from $current to $target..."
    
    case "$target" in
        dockerhub)
            sed -i.bak "s|image: \".*\"|image: \"${DOCKERHUB_IMAGE}:{arch}\"|" "$CONFIG_FILE"
            print_color "$GREEN" "✓ Switched to Docker Hub registry"
            print_color "$YELLOW" "  Repository: $DOCKERHUB_IMAGE"
            ;;
        ghcr)
            sed -i.bak "s|image: \".*\"|image: \"${GHCR_IMAGE}:{arch}\"|" "$CONFIG_FILE"
            print_color "$GREEN" "✓ Switched to GitHub Container Registry"
            print_color "$YELLOW" "  Repository: $GHCR_IMAGE"
            ;;
        *)
            print_color "$RED" "Invalid registry: $target"
            echo "Usage: $0 [dockerhub|ghcr]"
            exit 1
            ;;
    esac
    
    # Create backup notification
    print_color "$YELLOW" "Backup created: ${CONFIG_FILE}.bak"
}

# Function to show registry info
show_info() {
    local current=$(check_current_registry)
    
    print_color "$GREEN" "=== Registry Information ==="
    echo ""
    
    if [ "$current" = "dockerhub" ]; then
        print_color "$GREEN" "Current Registry: Docker Hub"
        echo "Repository: $DOCKERHUB_IMAGE"
        echo "Rate Limit: 100 pulls/6hr (anonymous)"
        echo "CDN: Global coverage"
    elif [ "$current" = "ghcr" ]; then
        print_color "$GREEN" "Current Registry: GitHub Container Registry"
        echo "Repository: $GHCR_IMAGE"
        echo "Rate Limit: 60 requests/hr (anonymous)"
        echo "CDN: Limited coverage"
    else
        print_color "$RED" "Current Registry: Unknown"
        echo "Could not determine current registry configuration"
    fi
    
    echo ""
    print_color "$YELLOW" "Available Registries:"
    echo "  dockerhub - Docker Hub (recommended for production)"
    echo "  ghcr      - GitHub Container Registry"
}

# Main script
main() {
    # Check if config file exists
    if [ ! -f "$CONFIG_FILE" ]; then
        print_color "$RED" "Error: Configuration file not found: $CONFIG_FILE"
        echo "Please run this script from the repository root directory"
        exit 1
    fi
    
    # Parse arguments
    if [ $# -eq 0 ]; then
        show_info
        echo ""
        echo "Usage: $0 [dockerhub|ghcr]"
        echo "Example: $0 dockerhub"
    else
        switch_registry "$1"
        echo ""
        print_color "$YELLOW" "Important: After switching registries:"
        echo "1. Stop the add-on in Home Assistant"
        echo "2. Uninstall the add-on"
        echo "3. Refresh the repository"
        echo "4. Reinstall the add-on"
        echo "5. Restore your configuration"
    fi
}

# Run main function
main "$@"