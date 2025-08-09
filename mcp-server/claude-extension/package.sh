#!/bin/bash

# Claude Extension Packaging Script
# Creates a distributable package for the Home Assistant MCP Server

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PACKAGE_NAME="homeassistant-mcp-claude-extension"
VERSION=$(grep '"version"' "$SCRIPT_DIR/manifest.json" | cut -d'"' -f4)

echo "Building Claude Extension Package v$VERSION"
echo "========================================"

# Create temp directory
TEMP_DIR=$(mktemp -d)
PACKAGE_DIR="$TEMP_DIR/$PACKAGE_NAME"
mkdir -p "$PACKAGE_DIR"

echo "Copying extension files..."
cp "$SCRIPT_DIR/manifest.json" "$PACKAGE_DIR/"
cp "$SCRIPT_DIR/config.json" "$PACKAGE_DIR/"
cp "$SCRIPT_DIR/connection.json" "$PACKAGE_DIR/"
cp "$SCRIPT_DIR/README.md" "$PACKAGE_DIR/"

# Copy icon if it exists
if [ -f "$ROOT_DIR/icon.png" ]; then
    cp "$ROOT_DIR/icon.png" "$PACKAGE_DIR/"
    echo "Added icon.png"
fi

# Copy logo if it exists  
if [ -f "$ROOT_DIR/logo.png" ]; then
    cp "$ROOT_DIR/logo.png" "$PACKAGE_DIR/"
    echo "Added logo.png"
fi

# Create installation scripts
cat > "$PACKAGE_DIR/install-macos.sh" << 'EOF'
#!/bin/bash
CONFIG_DIR="$HOME/Library/Application Support/Claude"
mkdir -p "$CONFIG_DIR"
cp config.json "$CONFIG_DIR/claude_desktop_config.json"
echo "Configuration installed to: $CONFIG_DIR/claude_desktop_config.json"
echo "Please restart Claude Desktop"
EOF

cat > "$PACKAGE_DIR/install-windows.bat" << 'EOF'
@echo off
set CONFIG_DIR=%APPDATA%\Claude
if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"
copy config.json "%CONFIG_DIR%\claude_desktop_config.json"
echo Configuration installed to: %CONFIG_DIR%\claude_desktop_config.json
echo Please restart Claude Desktop
pause
EOF

cat > "$PACKAGE_DIR/install-linux.sh" << 'EOF'
#!/bin/bash
CONFIG_DIR="$HOME/.config/Claude"
mkdir -p "$CONFIG_DIR"
cp config.json "$CONFIG_DIR/claude_desktop_config.json"
echo "Configuration installed to: $CONFIG_DIR/claude_desktop_config.json"
echo "Please restart Claude Desktop"
EOF

chmod +x "$PACKAGE_DIR"/*.sh

# Create ZIP package
echo "Creating ZIP package..."
cd "$TEMP_DIR"
zip -r "$ROOT_DIR/$PACKAGE_NAME-v$VERSION.zip" "$PACKAGE_NAME"

# Create tar.gz package
echo "Creating tar.gz package..."
tar czf "$ROOT_DIR/$PACKAGE_NAME-v$VERSION.tar.gz" "$PACKAGE_NAME"

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "Package created successfully!"
echo "  - $PACKAGE_NAME-v$VERSION.zip"
echo "  - $PACKAGE_NAME-v$VERSION.tar.gz"
echo ""
echo "Distribution ready for release v$VERSION"