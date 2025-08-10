#!/bin/bash

# Package script for HomeAssistant MCP Add-on Release

VERSION="1.0.5"
RELEASE_DIR="releases/v${VERSION}"

echo "📦 Building HomeAssistant MCP Add-on v${VERSION}"

# Clean and create release directory
rm -rf "${RELEASE_DIR}"
mkdir -p "${RELEASE_DIR}"

# Build the TypeScript project
echo "🔨 Building TypeScript..."
cd mcp-server
npm run build
cd ..

# Create the add-on package (excluding node_modules)
echo "📁 Creating add-on package..."
rsync -av --exclude='node_modules' --exclude='.git' --exclude='src/__tests__' \
  --exclude='*.test.*' --exclude='debug-*' --exclude='test-*' \
  mcp-server/ "${RELEASE_DIR}/mcp-server/"

# Clean up unnecessary files from the package
echo "🧹 Cleaning package..."
cd "${RELEASE_DIR}/mcp-server"
rm -rf node_modules
rm -rf src/__tests__
rm -rf .git
rm -f debug-*.js debug-*.mjs test-*.js test-*.cjs build-*.cjs
rm -f tsconfig.simple.json
rm -f "package-lock 2.json"

# Create minimal package for distribution
cd ..
echo "📝 Creating package info..."
cat > package-info.json << EOF
{
  "name": "homeassistant-mcp-addon",
  "version": "${VERSION}",
  "release_date": "$(date -u +"%Y-%m-%d")",
  "node_compatibility": "20.x, 24.x",
  "homeassistant_min": "2024.1.0",
  "changes": [
    "Fixed Node.js v24 compatibility issues",
    "Resolved TypeScript build hanging",
    "Fixed all type errors",
    "Improved build system performance",
    "Streamlined GitHub workflows"
  ]
}
EOF

# Create archive
echo "🗜️ Creating archive..."
tar -czf "homeassistant-mcp-addon-v${VERSION}.tar.gz" mcp-server package-info.json

# Create checksums
echo "🔐 Generating checksums..."
shasum -a 256 "homeassistant-mcp-addon-v${VERSION}.tar.gz" > "checksums.txt"

cd ../..

echo "✅ Release package created at ${RELEASE_DIR}/"
echo ""
echo "📊 Package contents:"
ls -lah "${RELEASE_DIR}/"
echo ""
echo "🎯 Next steps:"
echo "  1. Upload homeassistant-mcp-addon-v${VERSION}.tar.gz to GitHub Release"
echo "  2. Update HomeAssistant add-on repository"
echo "  3. Test installation in HomeAssistant"