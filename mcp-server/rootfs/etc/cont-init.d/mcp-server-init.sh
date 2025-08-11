#!/usr/bin/with-contenv bash
# ==============================================================================
# MCP Server Add-on initialization script
# ==============================================================================

# Source bashio if available
if [[ -f /usr/lib/bashio/bashio.sh ]]; then
    source /usr/lib/bashio/bashio.sh
fi

echo "[$(date +%H:%M:%S)] INFO: Initializing MCP Server for Claude v1.2.1..."

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "[$(date +%H:%M:%S)] ERROR: Node.js is not installed!"
    exit 1
fi

echo "[$(date +%H:%M:%S)] INFO: Node.js version: $(node --version)"
echo "[$(date +%H:%M:%S)] INFO: NPM version: $(npm --version)"

# Verify application build
if [[ ! -d "/app/dist" ]]; then
    echo "[$(date +%H:%M:%S)] ERROR: Application not built! Missing /app/dist directory"
    echo "[$(date +%H:%M:%S)] INFO: Attempting to build..."
    cd /app
    npm run build || {
        echo "[$(date +%H:%M:%S)] ERROR: Build failed!"
        exit 1
    }
fi

# Verify main entry point exists
if [[ ! -f "/app/dist/index.js" ]]; then
    echo "[$(date +%H:%M:%S)] ERROR: Main entry point /app/dist/index.js not found!"
    exit 1
fi

# Create necessary directories
mkdir -p /data/mcp-server 2>/dev/null || true
mkdir -p /share/mcp-server 2>/dev/null || true

echo "[$(date +%H:%M:%S)] INFO: MCP Server initialization complete"