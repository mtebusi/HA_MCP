#!/bin/bash

# Version Update Script
# This script ensures version consistency across all files in the repository

set -e

# Check if version argument is provided
if [ -z "$1" ]; then
    echo "Usage: ./scripts/update-version.sh <version>"
    echo "Example: ./scripts/update-version.sh 1.0.4"
    exit 1
fi

NEW_VERSION="$1"
echo "🔄 Updating to version $NEW_VERSION"

# Update config.yaml
echo "📝 Updating mcp-server/config.yaml"
sed -i.bak "s/^version: .*/version: $NEW_VERSION/" mcp-server/config.yaml && rm mcp-server/config.yaml.bak

# Update package.json
echo "📝 Updating mcp-server/package.json"
sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" mcp-server/package.json && rm mcp-server/package.json.bak

# Update Dockerfile
echo "📝 Updating mcp-server/Dockerfile"
sed -i.bak "s/io.hass.version=\"[^\"]*\"/io.hass.version=\"$NEW_VERSION\"/" mcp-server/Dockerfile && rm mcp-server/Dockerfile.bak

# Update src/index.ts (MCP protocol version reporting)
echo "📝 Updating mcp-server/src/index.ts"
sed -i.bak "s/version: '[^']*'/version: '$NEW_VERSION'/" mcp-server/src/index.ts && rm mcp-server/src/index.ts.bak

# Update package-lock.json (requires npm install)
echo "📝 Updating mcp-server/package-lock.json"
cd mcp-server
npm install --package-lock-only
cd ..

# Add version to a VERSION file for easy reference
echo "📝 Creating VERSION file"
echo "$NEW_VERSION" > VERSION

# Update repository.json if it exists
if [ -f "repository.json" ]; then
    echo "📝 Updating repository.json"
    sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" repository.json && rm repository.json.bak
fi

echo ""
echo "✅ Version updated to $NEW_VERSION in all files"
echo ""
echo "📋 Updated files:"
echo "  - mcp-server/config.yaml"
echo "  - mcp-server/package.json"
echo "  - mcp-server/package-lock.json"
echo "  - mcp-server/Dockerfile"
echo "  - mcp-server/src/index.ts"
echo "  - VERSION"
[ -f "repository.json" ] && echo "  - repository.json"
echo ""
echo "⚠️  Remember to:"
echo "  1. Update CHANGELOG.md with release notes"
echo "  2. Commit changes: git commit -m 'chore: Release v$NEW_VERSION'"
echo "  3. Create tag: git tag v$NEW_VERSION"
echo "  4. Push: git push && git push --tags"
echo "  5. Create GitHub release"