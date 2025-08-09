#!/bin/bash

# MCP Server for Claude - Extension Packaging Script
# This script generates the Claude Desktop configuration and installation package

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="${PROJECT_ROOT}/dist/claude-extension"
EXTENSION_DIR="${PROJECT_ROOT}/claude-extension"

echo "🚀 MCP Server for Claude - Extension Packager"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Step 1: Detect Home Assistant installation
echo ""
echo "Step 1: Detecting Home Assistant..."
echo "-----------------------------------"

# Check if running inside Home Assistant
if [ -f "/data/options.json" ]; then
    HA_URL="ws://supervisor/core/api/websocket"
    SUPERVISOR_TOKEN="${SUPERVISOR_TOKEN}"
    print_success "Running inside Home Assistant detected"
else
    # Try to detect local Home Assistant
    if command -v ha &> /dev/null; then
        HA_URL="ws://localhost:8123/api/websocket"
        print_warning "Local Home Assistant CLI detected"
    else
        HA_URL=""
        print_warning "Home Assistant not detected - manual configuration required"
    fi
fi

# Step 2: Create output directory
echo ""
echo "Step 2: Creating package structure..."
echo "------------------------------------"

rm -rf "${OUTPUT_DIR}"
mkdir -p "${OUTPUT_DIR}"

# Copy manifest
cp "${EXTENSION_DIR}/manifest.json" "${OUTPUT_DIR}/"
print_success "Copied manifest.json"

# Step 3: Generate Claude Desktop configuration
echo ""
echo "Step 3: Generating Claude Desktop configuration..."
echo "-------------------------------------------------"

# Detect OS for config path
case "$(uname -s)" in
    Darwin*)
        CONFIG_PATH="~/Library/Application Support/Claude/claude_desktop_config.json"
        OS_NAME="macOS"
        ;;
    Linux*)
        CONFIG_PATH="~/.config/Claude/claude_desktop_config.json"
        OS_NAME="Linux"
        ;;
    MINGW*|MSYS*|CYGWIN*)
        CONFIG_PATH="%APPDATA%\\Claude\\claude_desktop_config.json"
        OS_NAME="Windows"
        ;;
    *)
        CONFIG_PATH="unknown"
        OS_NAME="Unknown"
        ;;
esac

# Generate the config template
cat > "${OUTPUT_DIR}/claude_desktop_config.json" << EOF
{
  "mcpServers": {
    "homeassistant": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "addon_local_mcp_claude",
        "node",
        "/app/dist/index.js"
      ],
      "env": {
        "SUPERVISOR_TOKEN": "YOUR_SUPERVISOR_TOKEN_HERE",
        "HOMEASSISTANT_URL": "${HA_URL:-ws://supervisor/core/api/websocket}"
      }
    }
  }
}
EOF

print_success "Generated claude_desktop_config.json for ${OS_NAME}"

# Step 4: Create installation script
echo ""
echo "Step 4: Creating installation script..."
echo "--------------------------------------"

cat > "${OUTPUT_DIR}/install.sh" << 'EOF'
#!/bin/bash

# MCP Server for Claude - Installation Script

set -e

echo "🏠 Home Assistant MCP Server - Claude Desktop Installer"
echo "======================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Detect OS
case "$(uname -s)" in
    Darwin*)
        CONFIG_DIR="$HOME/Library/Application Support/Claude"
        OS_NAME="macOS"
        ;;
    Linux*)
        CONFIG_DIR="$HOME/.config/Claude"
        OS_NAME="Linux"
        ;;
    *)
        echo -e "${RED}Unsupported operating system${NC}"
        exit 1
        ;;
esac

echo -e "${BLUE}Detected OS:${NC} ${OS_NAME}"
echo -e "${BLUE}Config directory:${NC} ${CONFIG_DIR}"
echo ""

# Step 1: Check if Claude Desktop is installed
echo "Step 1: Checking Claude Desktop installation..."
if [ ! -d "${CONFIG_DIR}" ]; then
    echo -e "${YELLOW}⚠ Claude Desktop configuration directory not found${NC}"
    echo "  Please ensure Claude Desktop is installed and has been run at least once."
    read -p "Do you want to create the directory anyway? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        mkdir -p "${CONFIG_DIR}"
        echo -e "${GREEN}✓ Created configuration directory${NC}"
    else
        echo -e "${RED}Installation cancelled${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Claude Desktop configuration directory found${NC}"
fi

# Step 2: Check Home Assistant Add-on
echo ""
echo "Step 2: Checking Home Assistant Add-on..."
if docker ps | grep -q "addon_local_mcp_claude"; then
    echo -e "${GREEN}✓ MCP Claude add-on is running${NC}"
else
    echo -e "${YELLOW}⚠ MCP Claude add-on not detected${NC}"
    echo "  Please ensure the add-on is installed and running in Home Assistant."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Installation cancelled${NC}"
        exit 1
    fi
fi

# Step 3: Get Supervisor Token
echo ""
echo "Step 3: Configuring Supervisor Token..."
echo "  To find your Supervisor Token:"
echo "  1. Open Home Assistant"
echo "  2. Go to your profile (bottom left)"
echo "  3. Scroll to 'Long-Lived Access Tokens'"
echo "  4. Create a new token named 'Claude MCP'"
echo ""
read -p "Enter your Supervisor Token (or press Enter to configure later): " SUPERVISOR_TOKEN

# Step 4: Backup existing config
CONFIG_FILE="${CONFIG_DIR}/claude_desktop_config.json"
if [ -f "${CONFIG_FILE}" ]; then
    echo ""
    echo "Step 4: Backing up existing configuration..."
    BACKUP_FILE="${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "${CONFIG_FILE}" "${BACKUP_FILE}"
    echo -e "${GREEN}✓ Backup saved to: ${BACKUP_FILE}${NC}"
else
    echo ""
    echo "Step 4: No existing configuration found, creating new..."
fi

# Step 5: Install configuration
echo ""
echo "Step 5: Installing MCP configuration..."

if [ -f "${CONFIG_FILE}" ]; then
    # Merge with existing config
    if command -v jq &> /dev/null; then
        # Use jq if available
        TEMP_FILE=$(mktemp)
        jq '.mcpServers.homeassistant = {
            "command": "docker",
            "args": ["exec", "-i", "addon_local_mcp_claude", "node", "/app/dist/index.js"],
            "env": {
                "SUPERVISOR_TOKEN": "'${SUPERVISOR_TOKEN:-YOUR_SUPERVISOR_TOKEN_HERE}'",
                "HOMEASSISTANT_URL": "ws://supervisor/core/api/websocket"
            }
        }' "${CONFIG_FILE}" > "${TEMP_FILE}"
        mv "${TEMP_FILE}" "${CONFIG_FILE}"
        echo -e "${GREEN}✓ Configuration merged successfully${NC}"
    else
        echo -e "${YELLOW}⚠ jq not found, please manually merge the configuration${NC}"
        echo "  Add this to your ${CONFIG_FILE}:"
        cat claude_desktop_config.json
    fi
else
    # Create new config
    if [ -n "${SUPERVISOR_TOKEN}" ]; then
        sed "s/YOUR_SUPERVISOR_TOKEN_HERE/${SUPERVISOR_TOKEN}/g" claude_desktop_config.json > "${CONFIG_FILE}"
    else
        cp claude_desktop_config.json "${CONFIG_FILE}"
    fi
    echo -e "${GREEN}✓ Configuration installed successfully${NC}"
fi

# Step 6: Test connection
echo ""
echo "Step 6: Testing connection..."
if [ -n "${SUPERVISOR_TOKEN}" ] && docker ps | grep -q "addon_local_mcp_claude"; then
    if docker exec addon_local_mcp_claude node -e "console.log('MCP Server accessible')" 2>/dev/null; then
        echo -e "${GREEN}✓ Successfully connected to MCP Server${NC}"
    else
        echo -e "${YELLOW}⚠ Could not verify connection${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Skipping connection test (token or add-on not configured)${NC}"
fi

# Final instructions
echo ""
echo "========================================="
echo -e "${GREEN}Installation Complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Restart Claude Desktop"
echo "2. Look for the MCP icon in the toolbar"
echo "3. Try asking: 'What lights are on in my house?'"
echo ""
if [ -z "${SUPERVISOR_TOKEN}" ] || [ "${SUPERVISOR_TOKEN}" == "YOUR_SUPERVISOR_TOKEN_HERE" ]; then
    echo -e "${YELLOW}Important:${NC} Don't forget to add your Supervisor Token to:"
    echo "  ${CONFIG_FILE}"
    echo ""
fi
echo "For more information, visit:"
echo "  https://github.com/mtebusi/HA_MCP"
echo ""
echo "Enjoy controlling your smart home with Claude! 🏠🤖"
EOF

chmod +x "${OUTPUT_DIR}/install.sh"
print_success "Created installation script"

# Step 5: Create README for the package
echo ""
echo "Step 5: Creating package documentation..."
echo "----------------------------------------"

cat > "${OUTPUT_DIR}/README.md" << EOF
# Home Assistant MCP Server - Claude Extension Package

This package contains everything needed to connect Claude Desktop to your Home Assistant instance.

## 📦 Package Contents

- \`manifest.json\` - Extension manifest with tool definitions
- \`claude_desktop_config.json\` - Configuration template for Claude Desktop
- \`install.sh\` - Automated installation script (macOS/Linux)
- \`README.md\` - This file

## 🚀 Quick Installation

### Automated Installation (Recommended)

1. Ensure the MCP Claude add-on is installed and running in Home Assistant
2. Run the installation script:
   \`\`\`bash
   chmod +x install.sh
   ./install.sh
   \`\`\`
3. Follow the prompts to configure your Supervisor Token
4. Restart Claude Desktop

### Manual Installation

1. Copy the configuration from \`claude_desktop_config.json\`
2. Add it to your Claude Desktop config file:
   - **macOS**: \`~/Library/Application Support/Claude/claude_desktop_config.json\`
   - **Linux**: \`~/.config/Claude/claude_desktop_config.json\`
   - **Windows**: \`%APPDATA%\\Claude\\claude_desktop_config.json\`
3. Replace \`YOUR_SUPERVISOR_TOKEN_HERE\` with your actual token
4. Restart Claude Desktop

## 🔑 Getting Your Supervisor Token

1. Open Home Assistant
2. Click on your profile (bottom left)
3. Scroll to "Long-Lived Access Tokens"
4. Create a new token named "Claude MCP"
5. Copy the token and use it during installation

## 🧪 Testing the Connection

After installation, test the connection in Claude Desktop:

- "What devices are in my home?"
- "Turn on the living room lights"
- "Show me the temperature history for today"

## 📚 Available Tools

The extension provides 4 main tools with 40+ operations:

- **Query**: Get information from Home Assistant
- **Control**: Execute actions and automations
- **Monitor**: Track real-time events
- **Assist**: AI-enhanced operations

## 🆘 Troubleshooting

If Claude Desktop doesn't recognize the MCP server:

1. Verify the add-on is running: \`docker ps | grep mcp_claude\`
2. Check the configuration file exists and is valid JSON
3. Ensure the Supervisor Token is correctly set
4. Restart Claude Desktop completely
5. Check add-on logs in Home Assistant

## 📖 Documentation

For full documentation, visit: https://github.com/mtebusi/HA_MCP

## 📝 License

MIT License - See LICENSE file for details
EOF

print_success "Created README.md"

# Step 6: Create ZIP package
echo ""
echo "Step 6: Creating distribution package..."
echo "---------------------------------------"

cd "${OUTPUT_DIR}"
ZIP_FILE="${PROJECT_ROOT}/dist/claude-extension-${VERSION:-1.0.4}.zip"
zip -r "${ZIP_FILE}" . -x "*.DS_Store"
print_success "Created distribution package: ${ZIP_FILE}"

# Summary
echo ""
echo "========================================="
echo -e "${GREEN}✓ Extension package created successfully!${NC}"
echo "========================================="
echo ""
echo "Package location: ${OUTPUT_DIR}"
echo "Distribution ZIP: ${ZIP_FILE}"
echo ""
echo "To install on Claude Desktop:"
echo "1. Extract the ZIP file"
echo "2. Run ./install.sh (macOS/Linux)"
echo "3. Or follow manual installation in README.md (Windows)"
echo ""
echo "Config template location for ${OS_NAME}:"
echo "  ${CONFIG_PATH}"