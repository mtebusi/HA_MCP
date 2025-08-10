#!/bin/bash

# Version and Date Management Script
# This script updates version numbers and dates across the project

set -e

# Get version from VERSION file or argument
if [ -n "$1" ]; then
    VERSION="$1"
else
    VERSION=$(cat VERSION)
fi

# Get current date in YYYY-MM-DD format
RELEASE_DATE=${RELEASE_DATE:-$(date +%Y-%m-%d)}

echo "Updating to version $VERSION with date $RELEASE_DATE"

# Update package.json
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" mcp-server/package.json

# Update config.yaml
sed -i '' "s/^version: \"[^\"]*\"/version: \"$VERSION\"/" mcp-server/config.yaml

# Update run.sh
sed -i '' "s/Starting MCP Server for Claude v[0-9.]*/Starting MCP Server for Claude v$VERSION/" mcp-server/run.sh

# Update VERSION file
echo "$VERSION" > VERSION

# Update CHANGELOG.md with date variable
if grep -q "## \[$VERSION\] - {{RELEASE_DATE}}" mcp-server/CHANGELOG.md; then
    sed -i '' "s/## \[$VERSION\] - {{RELEASE_DATE}}/## [$VERSION] - $RELEASE_DATE/" mcp-server/CHANGELOG.md
fi

# Update RELEASE_NOTES.md
if [ -f "mcp-server/RELEASE_NOTES.md" ]; then
    sed -i '' "s/# Release Notes - v[0-9.]*/# Release Notes - v$VERSION/" mcp-server/RELEASE_NOTES.md
    sed -i '' "s/Version [0-9.]* brings/Version $VERSION brings/" mcp-server/RELEASE_NOTES.md
    sed -i '' "s/### What's New in v[0-9.]*/### What's New in v$VERSION/" mcp-server/RELEASE_NOTES.md
fi

echo "Version updated to $VERSION with date $RELEASE_DATE"
echo ""
echo "Don't forget to:"
echo "1. Update CHANGELOG.md with release notes"
echo "2. Commit changes: git commit -am 'Release v$VERSION'"
echo "3. Tag release: git tag v$VERSION"
echo "4. Push: git push && git push --tags"