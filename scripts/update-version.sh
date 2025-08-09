#!/bin/bash

# Version Update Script
# This script ensures version consistency across all files in the repository

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if version argument is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: No version provided${NC}"
    echo "Usage: ./scripts/update-version.sh <version>"
    echo "Example: ./scripts/update-version.sh 1.0.5"
    exit 1
fi

NEW_VERSION="$1"

# Validate version format (semantic versioning)
if ! [[ $NEW_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}Error: Invalid version format${NC}"
    echo "Please use semantic versioning (e.g., 1.0.5)"
    exit 1
fi

echo -e "${BLUE}=== Version Update Script ===${NC}"
echo -e "${GREEN}Updating to version $NEW_VERSION${NC}"
echo ""

# Update config.yaml
echo -e "${YELLOW}Updating mcp-server/config.yaml${NC}"
sed -i.bak "s/^version: .*/version: $NEW_VERSION/" mcp-server/config.yaml && rm mcp-server/config.yaml.bak

# Update package.json
echo -e "${YELLOW}Updating mcp-server/package.json${NC}"
sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" mcp-server/package.json && rm mcp-server/package.json.bak

# Update claude-extension manifest.json
echo -e "${YELLOW}Updating mcp-server/claude-extension/manifest.json${NC}"
sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" mcp-server/claude-extension/manifest.json && rm mcp-server/claude-extension/manifest.json.bak

# Update Dockerfile
echo -e "${YELLOW}Updating mcp-server/Dockerfile${NC}"
sed -i.bak "s/io.hass.version=\"[^\"]*\"/io.hass.version=\"$NEW_VERSION\"/" mcp-server/Dockerfile && rm mcp-server/Dockerfile.bak

# Update src/index.ts (MCP protocol version reporting)
echo -e "${YELLOW}Updating mcp-server/src/index.ts${NC}"
sed -i.bak "s/version: '[^']*'/version: '$NEW_VERSION'/" mcp-server/src/index.ts && rm mcp-server/src/index.ts.bak

# Update package-lock.json (requires npm install)
echo -e "${YELLOW}Updating mcp-server/package-lock.json${NC}"
cd mcp-server
npm install --package-lock-only
cd ..

# Add version to a VERSION file for easy reference
echo -e "${YELLOW}Creating VERSION file${NC}"
echo "$NEW_VERSION" > VERSION

# Update repository.json if it exists
if [ -f "repository.json" ]; then
    echo -e "${YELLOW}Updating repository.json${NC}"
    sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" repository.json && rm repository.json.bak
fi

echo ""
echo -e "${GREEN}✅ Version updated to $NEW_VERSION in all files${NC}"
echo ""
echo -e "${BLUE}Updated files:${NC}"
echo "  • mcp-server/config.yaml"
echo "  • mcp-server/package.json"
echo "  • mcp-server/package-lock.json"
echo "  • mcp-server/claude-extension/manifest.json"
echo "  • mcp-server/Dockerfile"
echo "  • mcp-server/src/index.ts"
echo "  • VERSION"
[ -f "repository.json" ] && echo "  • repository.json"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Update CHANGELOG.md with release notes"
echo "  2. Commit changes: git commit -m 'chore: release v$NEW_VERSION'"
echo "  3. Create tag: git tag -a v$NEW_VERSION -m 'Release v$NEW_VERSION'"
echo "  4. Push: git push && git push --tags"
echo "  5. Create GitHub release"
echo "  6. Run ./mcp-server/claude-extension/package.sh to create extension package"