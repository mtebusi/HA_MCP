#!/usr/bin/with-contenv bashio
# ==============================================================================
# MCP Server Add-on initialization script
# ==============================================================================

bashio::log.info "Initializing MCP Server for Claude v1.2.1..."

# Check Node.js installation
if ! command -v node &> /dev/null; then
    bashio::log.error "Node.js is not installed!"
    exit 1
fi

bashio::log.info "Node.js version: $(node --version)"
bashio::log.info "NPM version: $(npm --version)"

# Verify application build
if [[ ! -d "/app/dist" ]]; then
    bashio::log.error "Application not built! Missing /app/dist directory"
    bashio::log.info "Attempting to build..."
    cd /app
    npm run build || {
        bashio::log.error "Build failed!"
        exit 1
    }
fi

# Verify main entry point exists
if [[ ! -f "/app/dist/index.js" ]]; then
    bashio::log.error "Main entry point /app/dist/index.js not found!"
    exit 1
fi

# Create necessary directories
mkdir -p /data/mcp-server 2>/dev/null || true
mkdir -p /share/mcp-server 2>/dev/null || true

bashio::log.info "MCP Server initialization complete"